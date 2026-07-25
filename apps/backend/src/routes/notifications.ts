import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import { notifications, users } from '@obs-remote/database';
import { eq, desc, isNull, inArray, and } from 'drizzle-orm';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export const notificationsRoutes: FastifyPluginAsync = async (appOriginal) => {
  const app = appOriginal.withTypeProvider<ZodTypeProvider>();

  app.addHook('preHandler', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify<{
        sub: string;
        deviceId?: string;
        role?: string;
        remoteSessionId?: string;
      }>();
      request.user = decoded;
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
      return reply;
    }
  });

  // Get notifications
  app.get(
    '/notifications',
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().min(1).max(50).default(20),
        }),
      },
    },
    async (request, reply) => {
      const userId = (
        request.user as {
          sub: string;
          id: string;
          deviceId?: string;
          role?: string;
          remoteSessionId?: string;
          [key: string]: unknown;
        }
      ).sub;
      const { limit } = request.query;
      const db = getDb();

      const results = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          targetType: notifications.targetType,
          targetId: notifications.targetId,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
          actor: {
            id: users.id,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.actorId, users.id))
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      const withMessage = results.map((n) => ({
        ...n,
        message: buildNotificationMessage(n.type, n.actor?.displayName ?? 'Неизвестный'),
        read: n.readAt !== null,
      }));

      return reply.send(withMessage);
    },
  );

  function buildNotificationMessage(type: string, actorName: string): string {
    switch (type) {
      case 'moderator_invite':
        return `${actorName} пригласил вас модератором`;
      case 'follow':
        return `${actorName} подписался на вас`;
      case 'like':
        return `${actorName} оценил вашу публикацию`;
      case 'comment':
        return `${actorName} оставил комментарий`;
      case 'collab_invite':
        return `${actorName} предложил коллаборацию`;
      case 'session_request':
        return `${actorName} запрашивает доступ к OBS`;
      default:
        return `Уведомление от ${actorName}`;
    }
  }

  // Mark all as read
  app.post('/notifications/mark-read', async (request, reply) => {
    const userId = (
      request.user as {
        sub: string;
        id: string;
        deviceId?: string;
        role?: string;
        remoteSessionId?: string;
        [key: string]: unknown;
      }
    ).sub;
    const db = getDb();

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );

    return reply.send({ success: true });
  });

  // Mark specific as read
  app.post(
    '/notifications/:id/mark-read',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const userId = (
        request.user as {
          sub: string;
          id: string;
          deviceId?: string;
          role?: string;
          remoteSessionId?: string;
          [key: string]: unknown;
        }
      ).sub;
      const { id } = request.params;
      const db = getDb();

      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

      return reply.send({ success: true });
    },
  );
};
