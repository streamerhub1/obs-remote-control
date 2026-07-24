import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDb } from '../db.js';
import { users, devices, sessions } from '@obs-remote/database';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { generateInviteCode } from '../utils/crypto.js';

interface JwtPayload {
  sub: string;
  deviceId?: string;
}

export default async function apiRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify<JwtPayload>();
      request.user = decoded;
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
      return reply; // stop handler execution
    }
  });

  server.get(
    '/users/me',
    {
      schema: {
        response: {
          200: z.object({
            id: z.string(),
            displayName: z.string(),
            twitchLogin: z.string(),
            avatarUrl: z.string().nullable(),
            inviteCode: z.string(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = (request.user as JwtPayload).sub;
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
    },
  );

  server.get(
    '/users/me/devices',
    {
      schema: {
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              platform: z.string(),
              lastSeenAt: z.date(),
            }),
          ),
        },
      },
    },
    async (request, reply) => {
      const userId = (request.user as JwtPayload).sub;
      const db = getDb();

      const userDevices = await db
        .select({
          id: devices.id,
          name: devices.name,
          platform: devices.platform,
          lastSeenAt: devices.lastSeenAt,
          revokedAt: devices.revokedAt,
        })
        .from(devices)
        .where(eq(devices.userId, userId));

      return userDevices;
    },
  );

  server.delete(
    '/users/me/devices/:deviceId',
    {
      schema: {
        params: z.object({
          deviceId: z.string().uuid(),
        }),
        response: {
          200: z.object({ success: z.boolean() }),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = (request.user as JwtPayload).sub;
      const { deviceId } = request.params;
      const db = getDb();

      return await db.transaction(async (tx) => {
        // Check ownership
        const [device] = await tx
          .select({ id: devices.id, userId: devices.userId })
          .from(devices)
          .where(eq(devices.id, deviceId));

        if (!device)
          return reply.status(404).send({ error: 'Device not found' });
        if (device.userId !== userId)
          return reply.status(403).send({ error: 'Forbidden' });

        // Revoke sessions
        await tx.delete(sessions).where(eq(sessions.deviceId, deviceId));

        // Set revokedAt
        await tx
          .update(devices)
          .set({ revokedAt: new Date() })
          .where(eq(devices.id, deviceId));

        return { success: true };
      });
    },
  );

  server.post(
    '/users/me/invite-code',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
        },
      },
      schema: {
        response: {
          200: z.object({ inviteCode: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = (request.user as JwtPayload).sub;
      const db = getDb();

      let newCode = '';
      let success = false;
      let attempts = 0;

      while (!success && attempts < 5) {
        newCode = generateInviteCode();
        try {
          await db
            .update(users)
            .set({
              inviteCode: newCode,
              inviteCodeNormalized: newCode.toLowerCase(),
            })
            .where(eq(users.id, userId));
          success = true;
        } catch (e: unknown) {
          if (e && typeof e === 'object' && 'code' in e && e.code === '23505') {
            // unique violation
            attempts++;
          } else {
            throw e;
          }
        }
      }

      if (!success) {
        return reply
          .status(500)
          .send({ error: 'Could not generate unique invite code' });
      }

      return { inviteCode: newCode };
    },
  );
}
