import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import { calendarEvents, collaborations } from '@obs-remote/database';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export const calendarRoutes: FastifyPluginAsync = async (appOriginal) => {
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

  // Get calendar events for a date range
  app.get(
    '/calendar',
    {
      schema: {
        querystring: z.object({
          start: z.string().datetime(),
          end: z.string().datetime(),
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
      const { start, end } = request.query;
      const db = getDb();

      const events = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.ownerId, userId),
            gte(calendarEvents.startAt, new Date(start)),
            lte(calendarEvents.endAt, new Date(end)),
          ),
        );

      // Fetch associated collaborations if sourceType = 'collaboration'
      const collabIds = events
        .filter((e) => e.sourceType === 'collaboration' && e.sourceId)
        .map((e) => e.sourceId!);
      let collabs: unknown[] = [];
      if (collabIds.length > 0) {
        collabs = await db
          .select()
          .from(collaborations)
          .where(inArray(collaborations.id, collabIds));
      }

      const result = events.map((e) => {
        if (e.sourceType === 'collaboration' && e.sourceId) {
          const collab = collabs.find(
            (c) =>
              (
                c as {
                  sub: string;
                  id: string;
                  deviceId?: string;
                  role?: string;
                  remoteSessionId?: string;
                  [key: string]: unknown;
                }
              ).id === e.sourceId,
          );
          return { ...e, collaboration: collab };
        }
        return e;
      });

      return reply.send(result);
    },
  );

  // Create a manual calendar event
  app.post(
    '/calendar',
    {
      schema: {
        body: z.object({
          sourceType: z.enum(['stream', 'personalPlan', 'reminder']),
          title: z.string().min(1),
          description: z.string().optional(),
          startAt: z.string().datetime(),
          endAt: z.string().datetime(),
          timezone: z.string().default('UTC'),
          visibility: z.enum(['private', 'public']).default('private'),
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
      const data = request.body;
      const db = getDb();

      const [event] = await db
        .insert(calendarEvents)
        .values({
          ownerId: userId,
          ...data,
          startAt: new Date(data.startAt),
          endAt: new Date(data.endAt),
        })
        .returning();

      return reply.status(201).send(event);
    },
  );

  // Update a manual calendar event
  app.patch(
    '/calendar/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          title: z.string().min(1).optional(),
          description: z.string().nullable().optional(),
          startAt: z.string().datetime().optional(),
          endAt: z.string().datetime().optional(),
          timezone: z.string().optional(),
          visibility: z.enum(['private', 'public']).optional(),
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
      const { id } = request.params;
      const data = request.body;
      const db = getDb();

      const [event] = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, id));
      if (!event) return reply.status(404).send({ error: 'Not found' });
      if (event.ownerId !== userId)
        return reply.status(403).send({ error: 'Forbidden' });
      if (event.sourceType === 'collaboration')
        return reply
          .status(400)
          .send({ error: 'Collaboration events are edited from collaborations' });

      const updates: Partial<typeof calendarEvents.$inferInsert> = {};
      if ('title' in data) updates.title = data.title;
      if ('description' in data) updates.description = data.description ?? '';
      if ('startAt' in data && data.startAt) updates.startAt = new Date(data.startAt);
      if ('endAt' in data && data.endAt) updates.endAt = new Date(data.endAt);
      if ('timezone' in data && data.timezone) updates.timezone = data.timezone;
      if ('visibility' in data && data.visibility) updates.visibility = data.visibility;

      const [updated] = await db
        .update(calendarEvents)
        .set(updates)
        .where(eq(calendarEvents.id, id))
        .returning();

      return reply.send(updated);
    },
  );

  // Delete a manual calendar event
  app.delete(
    '/calendar/:id',
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

      const [event] = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, id));
      if (!event) return reply.status(404).send({ error: 'Not found' });
      if (event.ownerId !== userId)
        return reply.status(403).send({ error: 'Forbidden' });
      if (event.sourceType === 'collaboration')
        return reply
          .status(400)
          .send({ error: 'Cannot delete collaboration events manually' });

      await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
      return reply.send({ success: true });
    },
  );
};
