import { FastifyInstance } from 'fastify';
import { getDb } from '../db.js';
import { users, devices, sessions } from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { generateInviteCode } from '../utils/crypto.js';

export default async function apiRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // Middleware to check authentication
  server.decorateRequest('user', null);
  
  server.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  server.get('/api/users/me', async (request, reply) => {
    const userId = (request.user as any).sub;
    const db = getDb();
    
    const [user] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        twitchLogin: users.twitchLogin,
        avatarUrl: users.avatarUrl,
        inviteCode: users.inviteCode,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return reply.status(404).send({ error: 'User not found' });

    return user;
  });

  server.get('/api/users/me/devices', async (request, reply) => {
    const userId = (request.user as any).sub;
    const db = getDb();
    
    const userDevices = await db
      .select({
        id: devices.id,
        name: devices.name,
        platform: devices.platform,
        createdAt: devices.createdAt,
        lastSeenAt: devices.lastSeenAt,
      })
      .from(devices)
      .where(eq(devices.userId, userId));

    return userDevices;
  });

  server.delete('/api/users/me/devices/:deviceId', {
    schema: {
      params: z.object({
        deviceId: z.string().uuid()
      })
    }
  }, async (request, reply) => {
    const userId = (request.user as any).sub;
    const { deviceId } = request.params;
    const db = getDb();
    
    // Check ownership
    const [device] = await db.select({ id: devices.id, userId: devices.userId }).from(devices).where(eq(devices.id, deviceId));

    if (!device) return reply.status(404).send({ error: 'Device not found' });
    if (device.userId !== userId) return reply.status(403).send({ error: 'Forbidden' });

    // Revoke sessions
    await db.delete(sessions).where(eq(sessions.deviceId, deviceId));
    
    // Set revokedAt
    await db.update(devices).set({ revokedAt: new Date() }).where(eq(devices.id, deviceId));

    return { success: true };
  });

  server.post('/api/users/me/invite-code', async (request, reply) => {
    const userId = (request.user as any).sub;
    const db = getDb();
    
    const newCode = generateInviteCode();
    
    await db.update(users).set({
      inviteCode: newCode,
      inviteCodeNormalized: newCode.toLowerCase(),
    }).where(eq(users.id, userId));

    return { inviteCode: newCode };
  });
}
