import { FastifyInstance } from 'fastify';
import { getDb } from '../db.js';
import { users, devices, sessions } from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export default async function apiRoutes(app: FastifyInstance) {
  // Middleware to check authentication
  app.decorateRequest('user', null);
  
  app.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.get('/api/users/me', async (request, reply) => {
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

  app.get('/api/users/me/devices', async (request, reply) => {
    const userId = (request.user as any).sub;
    const db = getDb();
    
    const userDevices = await db
      .select({
        id: devices.id,
        name: devices.name,
        platform: devices.platform,
        createdAt: devices.createdAt,
        lastActiveAt: devices.lastActiveAt,
      })
      .from(devices)
      .where(eq(devices.userId, userId));

    return userDevices;
  });

  app.delete('/api/users/me/devices/:deviceId', async (request, reply) => {
    const userId = (request.user as any).sub;
    const { deviceId } = request.params as any;
    const db = getDb();
    
    // Revoke sessions
    await db.delete(sessions).where(eq(sessions.deviceId, deviceId));
    
    // Delete device
    await db.delete(devices).where(eq(devices.id, deviceId));

    return { success: true };
  });

  app.post('/api/users/me/invite-code', async (request, reply) => {
    const userId = (request.user as any).sub;
    const db = getDb();
    
    const newCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    await db.update(users).set({
      inviteCode: newCode,
      inviteCodeNormalized: newCode.toLowerCase(),
    }).where(eq(users.id, userId));

    return { inviteCode: newCode };
  });
}
