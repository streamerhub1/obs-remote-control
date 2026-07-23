import { FastifyInstance } from 'fastify';
import { getRedis } from '../redis.js';
import { getDb } from '../db.js';
import { moderatorRelationships, remoteSessions } from '@obs-remote/database';
import { eq, and, or } from 'drizzle-orm';
import crypto from 'crypto';

interface JwtPayload {
  sub: string;
  deviceId?: string;
}

export default async function signalingRoutes(app: FastifyInstance) {
  // We use WebSockets for signaling and presence.
  
  app.get('/signaling', { websocket: true }, async (socket, req) => {
    // Authenticate from query param or header
    let token = (req.query as any).token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      socket.close(1008, 'Token required');
      return;
    }

    let user: JwtPayload;
    try {
      user = await app.jwt.verify<JwtPayload>(token);
    } catch (e) {
      socket.close(1008, 'Invalid token');
      return;
    }

    const userId = user.sub;
    const deviceId = user.deviceId || 'unknown';
    const redis = getRedis();

    // Mark user as online in Redis
    const presenceKey = `presence:${userId}:${deviceId}`;
    await redis.set(presenceKey, 'online', 'EX', 60);

    // Keepalive loop
    const keepaliveInterval = setInterval(async () => {
      await redis.expire(presenceKey, 60);
    }, 30000);

    // Subscribe to signaling messages
    const channelName = `signaling:${userId}:${deviceId}`;
    const subRedis = redis.duplicate();
    await subRedis.subscribe(channelName);

    subRedis.on('message', (channel, message) => {
      if (channel === channelName) {
        socket.send(message);
      }
    });

    socket.on('message', async (messageBuffer) => {
      try {
        const msg = JSON.parse(messageBuffer.toString());
        
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // Handle signaling forwarding
        if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice-candidate') {
          const targetUserId = msg.targetUserId;
          const targetDeviceId = msg.targetDeviceId;
          
          if (!targetUserId || !targetDeviceId) return;

          // Verify relationship exists
          const db = getDb();
          const rels = await db.select().from(moderatorRelationships)
            .where(
              or(
                and(eq(moderatorRelationships.streamerId, userId), eq(moderatorRelationships.moderatorId, targetUserId)),
                and(eq(moderatorRelationships.streamerId, targetUserId), eq(moderatorRelationships.moderatorId, userId))
              )
            );

          if (rels.length === 0 || rels[0].status !== 'active') {
            socket.send(JSON.stringify({ type: 'error', error: 'No active relationship' }));
            return;
          }

          // Forward via Redis
          const targetChannel = `signaling:${targetUserId}:${targetDeviceId}`;
          const forwardMsg = {
            ...msg,
            fromUserId: userId,
            fromDeviceId: deviceId,
          };
          
          await redis.publish(targetChannel, JSON.stringify(forwardMsg));
        }

      } catch (e) {
        console.error('Signaling error', e);
      }
    });

    socket.on('close', async () => {
      clearInterval(keepaliveInterval);
      await redis.del(presenceKey);
      await subRedis.quit();
    });
  });
}
