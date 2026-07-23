import { FastifyInstance } from 'fastify';
import { getRedis } from '../redis.js';
import { z } from 'zod';
import { getDb } from '../db.js';
import { remoteSessions, devices, moderatorRelationships } from '@obs-remote/database';
import { eq, and } from 'drizzle-orm';
import WebSocket from 'ws';

const MAX_MESSAGE_SIZE = 64 * 1024; // 64KB
const HEARTBEAT_INTERVAL = 15000;
const PRESENCE_TTL = 45;

const AuthenticateMessageSchema = z.object({
  type: z.literal('signaling.authenticate'),
  appToken: z.string(),
  authorizationToken: z.string().optional(),  // Streamer and moderator both need to connect to the session room. 
});

const SignalMessageSchema = z.object({
  type: z.enum(['signaling.offer', 'signaling.answer', 'signaling.ice', 'signaling.ready', 'signaling.leave', 'heartbeat']),
  payload: z.any().optional(),
});

interface SessionClient {
  socket: WebSocket;
  userId: string;
  deviceId: string;
  role: 'streamer' | 'moderator';
  remoteSessionId: string;
  isAlive: boolean;
}

export default async function signalingRoutes(app: FastifyInstance) {
  const server = app as any;
  const rooms = new Map<string, Set<SessionClient>>();

  server.get('/signaling', { websocket: true }, (connection: any, request: any) => {
    const socket = connection.socket as WebSocket;
    let clientCtx: SessionClient | null = null;
    let rateLimitTokens = 100;

    // Rate limiting replenisher
    const rateLimitInterval = setInterval(() => {
      if (rateLimitTokens < 100) rateLimitTokens += 10;
    }, 1000);

    const heartbeatInterval = setInterval(() => {
      if (clientCtx) {
        if (!clientCtx.isAlive) {
          socket.terminate();
          return;
        }
        clientCtx.isAlive = false;
        socket.send(JSON.stringify({ type: 'heartbeat.ping' }));
      }
    }, HEARTBEAT_INTERVAL);

    socket.on('message', async (data: Buffer) => {
      if (data.length > MAX_MESSAGE_SIZE) {
        socket.send(JSON.stringify({ type: 'signaling.error', error: 'Message too large' }));
        return socket.close(1009);
      }
      
      rateLimitTokens--;
      if (rateLimitTokens < 0) {
        socket.send(JSON.stringify({ type: 'signaling.error', error: 'Rate limit exceeded' }));
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        return socket.send(JSON.stringify({ type: 'signaling.error', error: 'Invalid JSON' }));
      }

      if (!clientCtx) {
        if (parsed.type !== 'signaling.authenticate') {
          return socket.send(JSON.stringify({ type: 'signaling.error', error: 'Must authenticate first' }));
        }

        try {
          const { appToken, authorizationToken } = parsed;
          
          // Verify app token
          const decodedAppToken = server.jwt.verify(appToken) as any;
          const userId = decodedAppToken.sub;
          const deviceId = decodedAppToken.deviceId;
          if (!deviceId) throw new Error('No deviceId in app token');

          // Verify device not revoked
          const db = getDb();
          const [device] = await db.select().from(devices).where(eq(devices.id, deviceId));
          if (!device || device.revokedAt) throw new Error('Device revoked');

          let remoteSessionId: string | null = null;
          let role: 'streamer' | 'moderator' = 'streamer';

          if (authorizationToken) {
            // Joining a specific session
            const decodedAuth = server.jwt.verify(authorizationToken) as any;
            remoteSessionId = decodedAuth.remoteSessionId;
            
            if (decodedAuth.streamerUserId === userId) role = 'streamer';
            else if (decodedAuth.moderatorUserId === userId) role = 'moderator';
            else throw new Error('User not part of this session');

            // Verify session exists and status
            const [rs] = await db.select().from(remoteSessions).where(eq(remoteSessions.id, remoteSessionId!));
            if (!rs) throw new Error('Session not found');
            if (rs.status === 'closed' || rs.status === 'revoked' || rs.status === 'failed') throw new Error('Session is closed');

            if (role === 'streamer' && rs.streamerDeviceId !== deviceId) throw new Error('Invalid device for streamer');
            if (role === 'moderator' && rs.moderatorDeviceId !== deviceId) throw new Error('Invalid device for moderator');

            // Check relationship active
            const [rel] = await db.select().from(moderatorRelationships).where(eq(moderatorRelationships.id, rs.relationshipId));
            if (!rel || rel.status !== 'active') throw new Error('Relationship not active');
          } else {
             remoteSessionId = `global:${userId}`;
          }

          clientCtx = {
            socket,
            userId,
            deviceId,
            role,
            remoteSessionId: remoteSessionId!,
            isAlive: true,
          };

          let room = rooms.get(clientCtx.remoteSessionId);
          if (!room) {
            room = new Set();
            rooms.set(clientCtx.remoteSessionId, room);
          }
          room.add(clientCtx);

          // Mark presence in Redis
          const redis = getRedis();
          await redis.setex(`presence:${userId}:${deviceId}`, PRESENCE_TTL, JSON.stringify({
            userId,
            deviceId,
            online: true,
            appVersion: device.appVersion,
            lastHeartbeatAt: Date.now()
          }));

          socket.send(JSON.stringify({ type: 'signaling.authenticated' }));
          
          if (!clientCtx.remoteSessionId.startsWith('global:')) {
            // Notify other party
            for (const client of room) {
              if (client !== clientCtx) {
                client.socket.send(JSON.stringify({ type: 'signaling.ready', role: clientCtx.role }));
              }
            }
          }
        } catch (err: any) {
          app.log.error({ err }, 'Authentication failed');
          return socket.send(JSON.stringify({ type: 'signaling.error', error: err.message }));
        }
        return;
      }

      // Handle subsequent messages
      if (parsed.type === 'heartbeat.pong' || parsed.type === 'heartbeat') {
        clientCtx.isAlive = true;
        const redis = getRedis();
        await redis.expire(`presence:${clientCtx.userId}:${clientCtx.deviceId}`, PRESENCE_TTL);
        return;
      }

      const validMsg = SignalMessageSchema.safeParse(parsed);
      if (!validMsg.success) {
        return socket.send(JSON.stringify({ type: 'signaling.error', error: 'Invalid message schema' }));
      }

      if (clientCtx.remoteSessionId.startsWith('global:')) {
        return socket.send(JSON.stringify({ type: 'signaling.error', error: 'Cannot send signals on global connection' }));
      }

      // Route message to the other participant in the room
      const room = rooms.get(clientCtx.remoteSessionId);
      if (room) {
        for (const client of room) {
          if (client !== clientCtx) {
             // Redact sensitive payload in logs
             app.log.info({ type: parsed.type, fromRole: clientCtx.role, toRole: client.role, session: clientCtx.remoteSessionId }, 'Forwarding signal');
             client.socket.send(JSON.stringify({
               type: parsed.type,
               payload: parsed.payload
             }));
          }
        }
      }
    });

    socket.on('close', () => {
      clearInterval(rateLimitInterval);
      clearInterval(heartbeatInterval);
      if (clientCtx) {
        const room = rooms.get(clientCtx.remoteSessionId);
        if (room) {
          room.delete(clientCtx);
          if (room.size === 0) rooms.delete(clientCtx.remoteSessionId);
          else {
            for (const client of room) {
              client.socket.send(JSON.stringify({ type: 'signaling.leave', role: clientCtx.role }));
            }
          }
        }
        
        // Remove presence
        const redis = getRedis();
        redis.del(`presence:${clientCtx.userId}:${clientCtx.deviceId}`).catch(() => {});
      }
    });
  });
}
