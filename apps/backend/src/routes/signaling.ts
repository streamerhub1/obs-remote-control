import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getRedis } from '../redis.js';
import { z } from 'zod';
import { getDb } from '../db.js';
import {
  devices,
  remoteSessions,
  moderatorRelationships,
} from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import WebSocket from 'ws';
import * as jose from 'jose';
import { getSessionPublicKey } from '../utils/sessionToken.js';
import crypto from 'crypto';

const MAX_MESSAGE_SIZE = 64 * 1024;
const HEARTBEAT_INTERVAL = 15000;
const PRESENCE_TTL = 45;

interface GlobalClient {
  socket: WebSocket;
  userId: string;
  deviceId: string;
  isAlive: boolean;
}

interface SessionClient {
  socket: WebSocket;
  userId: string;
  deviceId: string;
  role: 'streamer' | 'moderator';
  remoteSessionId: string;
  isAlive: boolean;
}

export default async function signalingRoutes(app: FastifyInstance) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = app as any;
  const globalClients = new Map<string, GlobalClient>(); // Keyed by deviceId
  const sessionRooms = new Map<string, Set<SessionClient>>(); // Keyed by remoteSessionId

  // Setup Redis PubSub for cross-node notifications
  const pubSubClient = getRedis().duplicate();
  pubSubClient.subscribe('signaling:global:notifications');
  pubSubClient.subscribe('signaling:session:messages');
  pubSubClient.on('message', (channel, message) => {
    if (channel === 'signaling:global:notifications') {
      try {
        const data = JSON.parse(message);
        const client = globalClients.get(data.deviceId);
        if (client) {
          client.socket.send(
            JSON.stringify({
              type: data.type,
              payload: data.payload,
            }),
          );
        }
      } catch (err) {}
    } else if (channel === 'signaling:session:messages') {
      try {
        const data = JSON.parse(message);
        const room = sessionRooms.get(data.remoteSessionId);
        if (room) {
          for (const client of room) {
            if (client.deviceId !== data.senderDeviceId) {
              client.socket.send(
                JSON.stringify({ type: data.type, payload: data.payload }),
              );
            }
          }
        }
      } catch (err) {}
    }
  });

  server.get(
    '/signaling/global',
    { websocket: true },
    (
      connection: import('@fastify/websocket').SocketStream,
      request: import('fastify').FastifyRequest,
    ) => {
      const socket = connection.socket as WebSocket;
      let clientCtx: GlobalClient | null = null;
      let rateLimitTokens = 100;

      const rateLimitInterval = setInterval(() => {
        if (rateLimitTokens < 100) rateLimitTokens += 10;
      }, 1000);
      const heartbeatInterval = setInterval(() => {
        if (clientCtx) {
          if (!clientCtx.isAlive) return socket.terminate();
          clientCtx.isAlive = false;
          socket.send(JSON.stringify({ type: 'heartbeat.ping' }));
        }
      }, HEARTBEAT_INTERVAL);

      socket.on('message', async (data: Buffer) => {
        if (data.length > MAX_MESSAGE_SIZE) return socket.close(1009);
        if (--rateLimitTokens < 0)
          return socket.send(
            JSON.stringify({
              type: 'signaling.error',
              error: 'Rate limit exceeded',
            }),
          );

        let parsed;
        try {
          parsed = JSON.parse(data.toString());
        } catch {
          return socket.send(
            JSON.stringify({ type: 'signaling.error', error: 'Invalid JSON' }),
          );
        }

        if (!clientCtx) {
          if (parsed.type !== 'signaling.authenticate')
            return socket.send(
              JSON.stringify({
                type: 'signaling.error',
                error: 'Must authenticate first',
              }),
            );
          try {
            const decoded = server.jwt.verify(parsed.appToken) as { sub: string; id: string; deviceId?: string; role?: string; remoteSessionId?: string; [key: string]: unknown };
            const { sub: userId, deviceId } = decoded;
            if (!deviceId) throw new Error('No deviceId in app token');

            const db = getDb();
            const [device] = await db
              .select()
              .from(devices)
              .where(eq(devices.id, deviceId));
            if (!device || device.revokedAt)
              throw new Error('Device revoked or not found');

            clientCtx = { socket, userId, deviceId, isAlive: true };
            globalClients.set(deviceId, clientCtx);

            const redis = getRedis();
            await redis.setex(
              `presence:${userId}:${deviceId}`,
              PRESENCE_TTL,
              JSON.stringify({
                userId,
                deviceId,
                online: true,
                appVersion: device.appVersion,
                lastHeartbeatAt: Date.now(),
              }),
            );

            socket.send(JSON.stringify({ type: 'signaling.authenticated' }));
          } catch (err: unknown) {
            return socket.send(
              JSON.stringify({
                type: 'signaling.error',
                error: (err as Error).message,
              }),
            );
          }
          return;
        }

        if (parsed.type === 'heartbeat.pong' || parsed.type === 'heartbeat') {
          clientCtx.isAlive = true;
          const redis = getRedis();
          await redis.expire(
            `presence:${clientCtx.userId}:${clientCtx.deviceId}`,
            PRESENCE_TTL,
          );
        }
      });

      socket.on('close', () => {
        clearInterval(rateLimitInterval);
        clearInterval(heartbeatInterval);
        if (clientCtx) {
          globalClients.delete(clientCtx.deviceId);
          getRedis()
            .del(`presence:${clientCtx.userId}:${clientCtx.deviceId}`)
            .catch(() => {});
        }
      });
    },
  );

  server.get(
    '/signaling/session',
    { websocket: true },
    (
      connection: import('@fastify/websocket').SocketStream,
      request: import('fastify').FastifyRequest,
    ) => {
      const socket = connection.socket as WebSocket;
      let clientCtx: SessionClient | null = null;
      let rateLimitTokens = 100;

      const rateLimitInterval = setInterval(() => {
        if (rateLimitTokens < 100) rateLimitTokens += 10;
      }, 1000);
      const heartbeatInterval = setInterval(() => {
        if (clientCtx) {
          if (!clientCtx.isAlive) return socket.terminate();
          clientCtx.isAlive = false;
          socket.send(JSON.stringify({ type: 'heartbeat.ping' }));
        }
      }, HEARTBEAT_INTERVAL);

      socket.on('message', async (data: Buffer) => {
        if (data.length > MAX_MESSAGE_SIZE) return socket.close(1009);
        if (--rateLimitTokens < 0)
          return socket.send(
            JSON.stringify({
              type: 'signaling.error',
              error: 'Rate limit exceeded',
            }),
          );

        let parsed;
        try {
          parsed = JSON.parse(data.toString());
        } catch {
          return socket.send(
            JSON.stringify({ type: 'signaling.error', error: 'Invalid JSON' }),
          );
        }

        if (!clientCtx) {
          if (parsed.type !== 'signaling.authenticate')
            return socket.send(
              JSON.stringify({
                type: 'signaling.error',
                error: 'Must authenticate first',
              }),
            );
          try {
            if (!parsed.authorizationToken)
              throw new Error('Missing authorizationToken');

            const publicKeyPem = getSessionPublicKey();
            const publicKey = crypto.createPublicKey(publicKeyPem);
            const { payload } = await jose.jwtVerify(
              parsed.authorizationToken,
              publicKey,
            );

            const jwtPayload = payload as { sub: string; id: string; deviceId?: string; role?: string; remoteSessionId?: string; [key: string]: unknown };
            const { remoteSessionId, role, deviceId, userId } = {
              remoteSessionId: jwtPayload.remoteSessionId as string,
              role: jwtPayload.role as 'streamer' | 'moderator',
              deviceId: jwtPayload.deviceId as string,
              userId: jwtPayload.sub,
            };
            if (payload.tokenType !== 'remote-session')
              throw new Error('Invalid token type');

            const db = getDb();
            const [rs] = await db
              .select()
              .from(remoteSessions)
              .where(eq(remoteSessions.id, remoteSessionId));
            if (
              !rs ||
              rs.status === 'closed' ||
              rs.status === 'revoked' ||
              rs.status === 'failed'
            ) {
              throw new Error('Session is closed or not found');
            }

            clientCtx = {
              socket,
              userId,
              deviceId,
              role,
              remoteSessionId,
              isAlive: true,
            };

            let room = sessionRooms.get(remoteSessionId);
            if (!room) {
              room = new Set();
              sessionRooms.set(remoteSessionId, room);
            }
            room.add(clientCtx);

            socket.send(JSON.stringify({ type: 'signaling.authenticated' }));

            // Notify peer
            for (const client of room) {
              if (client !== clientCtx) {
                client.socket.send(
                  JSON.stringify({
                    type: 'signaling.ready',
                    role: clientCtx.role,
                  }),
                );
              }
            }
          } catch (err: unknown) {
            return socket.send(
              JSON.stringify({
                type: 'signaling.error',
                error: (err as Error).message,
              }),
            );
          }
          return;
        }

        if (parsed.type === 'heartbeat.pong' || parsed.type === 'heartbeat') {
          if (clientCtx) clientCtx.isAlive = true;
          return;
        }

        if (!clientCtx) return;

        app.log.info(
          {
            type: parsed.type,
            fromRole: clientCtx.role,
            session: clientCtx.remoteSessionId,
          },
          'Forwarding message to Redis',
        );
        // Broadcast via Redis
        getRedis().publish(
          'signaling:session:messages',
          JSON.stringify({
            remoteSessionId: clientCtx.remoteSessionId,
            senderDeviceId: clientCtx.deviceId,
            type: parsed.type,
            payload: parsed.payload,
          }),
        );
      });

      socket.on('close', () => {
        clearInterval(rateLimitInterval);
        clearInterval(heartbeatInterval);
        if (clientCtx) {
          const room = sessionRooms.get(clientCtx.remoteSessionId);
          if (room) {
            room.delete(clientCtx);
            if (room.size === 0) sessionRooms.delete(clientCtx.remoteSessionId);
            else {
              for (const client of room) {
                client.socket.send(
                  JSON.stringify({
                    type: 'signaling.leave',
                    role: clientCtx.role,
                  }),
                );
              }
            }
          }
        }
      });
    },
  );
}
