import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import { calendarEvents, collaborations } from '@obs-remote/database';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export const calendarRoutes: FastifyPluginAsync = async (appOriginal) => {
  const app = appOriginal.withTypeProvider<ZodTypeProvider>();
  // Get calendar events for a date range
  app.get('/calendar', {
    schema: {
      querystring: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
    }
  }, async (request, reply) => {
    const userId = (request.user as any).sub;
    const { start, end } = request.query;
    const db = getDb();
    
    const events = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.ownerId, userId),
        gte(calendarEvents.startAt, new Date(start)),
        lte(calendarEvents.endAt, new Date(end))
      ));
      
    // Fetch associated collaborations if sourceType = 'collaboration'
    const collabIds = events.filter(e => e.sourceType === 'collaboration' && e.sourceId).map(e => e.sourceId!);
    let collabs: any[] = [];
    if (collabIds.length > 0) {
      collabs = await db.select().from(collaborations).where(inArray(collaborations.id, collabIds));
    }

    const result = events.map(e => {
      if (e.sourceType === 'collaboration' && e.sourceId) {
        const collab = collabs.find(c => c.id === e.sourceId);
        return { ...e, collaboration: collab };
      }
      return e;
    });

    return reply.send(result);
  });

  // Create a manual calendar event
  app.post('/calendar', {
    schema: {
      body: z.object({
        sourceType: z.enum(['stream', 'personalPlan', 'reminder']),
        title: z.string().min(1),
        description: z.string().optional(),
        startAt: z.string().datetime(),
        endAt: z.string().datetime(),
        timezone: z.string().default('UTC'),
        visibility: z.enum(['private', 'public']).default('private'),
      })
    }
  }, async (request, reply) => {
    const userId = (request.user as any).sub;
    const data = request.body;
    const db = getDb();
    
    const [event] = await db.insert(calendarEvents).values({
      ownerId: userId,
      ...data,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
    }).returning();

    return reply.status(201).send(event);
  });

  // Delete a manual calendar event
  app.delete('/calendar/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const userId = (request.user as any).sub;
    const { id } = request.params;
    const db = getDb();

    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    if (!event) return reply.status(404).send({ error: 'Not found' });
    if (event.ownerId !== userId) return reply.status(403).send({ error: 'Forbidden' });
    if (event.sourceType === 'collaboration') return reply.status(400).send({ error: 'Cannot delete collaboration events manually' });

    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
    return reply.send({ success: true });
  });
};
