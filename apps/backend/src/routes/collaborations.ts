import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import {
  collaborations,
  collaborationParticipants,
  collaborationApplications,
  collaborationInvitations,
  calendarEvents,
  auditLogs,
  users,
} from '@obs-remote/database';
import { eq, and, sql, desc } from 'drizzle-orm';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export const collaborationsRoutes: FastifyPluginAsync = async (appOriginal) => {
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

  // Get Collaborations
  app.get(
    '/collaborations',
    {
      schema: {
        querystring: z.object({
          status: z
            .enum(['open', 'closed', 'cancelled', 'completed'])
            .default('open'),
          limit: z.coerce.number().int().min(1).max(50).default(20),
          cursor: z.string().optional(), // We'll just use simple limit for now if cursor isn't strictly implemented, but let's accept it
        }),
      },
    },
    async (request, reply) => {
      const userId = (request.user as { sub: string }).sub;
      const { status, limit } = request.query;
      const db = getDb();

      // Get collabs
      const collabs = await db
        .select()
        .from(collaborations)
        .where(eq(collaborations.status, status))
        .orderBy(desc(collaborations.createdAt))
        .limit(limit);

      if (collabs.length === 0) {
        return reply.send({ data: [], nextCursor: null });
      }

      const collabIds = collabs.map((c) => c.id);

      // Get hosts
      const hosts = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(
          sql`${users.id} IN (SELECT "ownerId" FROM collaborations WHERE id IN ${collabIds})`,
        );

      // Get participants count
      const participants = await db
        .select({
          collaborationId: collaborationParticipants.collaborationId,
          count: sql<number>`count(*)`,
        })
        .from(collaborationParticipants)
        .where(
          sql`${collaborationParticipants.collaborationId} IN ${collabIds}`,
        )
        .groupBy(collaborationParticipants.collaborationId);

      // Get my applications
      const myApps = await db
        .select()
        .from(collaborationApplications)
        .where(
          and(
            sql`${collaborationApplications.collaborationId} IN ${collabIds}`,
            eq(collaborationApplications.userId, userId),
          ),
        );

      // Get my participations (to know if I joined)
      const myParticipations = await db
        .select()
        .from(collaborationParticipants)
        .where(
          and(
            sql`${collaborationParticipants.collaborationId} IN ${collabIds}`,
            eq(collaborationParticipants.userId, userId),
          ),
        );

      const data = collabs.map((c) => {
        const host = hosts.find((h) => h.id === c.ownerId);
        const participantCount =
          participants.find((p) => p.collaborationId === c.id)?.count || 0;
        const myApp = myApps.find((a) => a.collaborationId === c.id);
        const isParticipant = myParticipations.some(
          (p) => p.collaborationId === c.id,
        );

        // Either I have a pending/rejected application, or I'm already a participant (accepted)
        const myApplication = isParticipant
          ? { status: 'accepted' }
          : myApp
            ? { status: myApp.status }
            : null;

        return {
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category,
          startAt: c.startAt.toISOString(),
          expectedDurationMinutes: c.expectedDurationMinutes,
          maximumParticipants: c.maximumParticipants,
          currentParticipants: Number(participantCount),
          applicationMode: c.applicationMode,
          visibility: c.visibility,
          host: host
            ? {
                id: host.id,
                displayName: host.displayName,
                avatarUrl: host.avatarUrl,
              }
            : null,
          myApplication,
        };
      });

      return reply.send({
        data,
        nextCursor: null, // Simplified pagination for now
      });
    },
  );

  // Create Collaboration
  app.post(
    '/collaborations',
    {
      schema: {
        body: z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          startAt: z.string().datetime(),
          expectedDurationMinutes: z.number().int().min(1),
          timezone: z.string().default('UTC'),
          maximumParticipants: z.number().int().min(2).default(2),
          applicationMode: z.enum(['approval', 'open']).default('approval'),
          visibility: z
            .enum(['public', 'private', 'invite_only'])
            .default('public'),
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

      return await db.transaction(async (tx) => {
        const [collab] = await tx
          .insert(collaborations)
          .values({
            ownerId: userId,
            title: data.title,
            description: data.description || '',
            startAt: new Date(data.startAt),
            expectedDurationMinutes: data.expectedDurationMinutes,
            timezone: data.timezone,
            maximumParticipants: data.maximumParticipants,
            applicationMode: data.applicationMode,
            visibility: data.visibility,
            status: 'open',
          })
          .returning();

        // Host is automatically a participant
        await tx.insert(collaborationParticipants).values({
          collaborationId: collab.id,
          userId,
          role: 'owner', // schema uses owner, participant
        });

        // Create a calendar event for the host
        const endAt = new Date(
          collab.startAt.getTime() + collab.expectedDurationMinutes * 60000,
        );
        await tx.insert(calendarEvents).values({
          ownerId: userId,
          title: collab.title,
          description: collab.description,
          startAt: collab.startAt,
          endAt,
          timezone: collab.timezone,
          sourceType: 'collaboration',
          sourceId: collab.id,
        });

        return reply.status(201).send(collab);
      });
    },
  );

  // Open Collaboration (draft -> open)
  app.post(
    '/collaborations/:id/open',
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

      const [collab] = await db
        .select()
        .from(collaborations)
        .where(eq(collaborations.id, id));
      if (!collab) return reply.status(404).send({ error: 'Not found' });
      if (collab.ownerId !== userId)
        return reply.status(403).send({ error: 'Forbidden' });
      if (collab.status !== 'closed')
        return reply
          .status(400)
          .send({ error: 'Only closed/draft can be opened' });

      const [updated] = await db
        .update(collaborations)
        .set({ status: 'open', updatedAt: new Date() })
        .where(eq(collaborations.id, id))
        .returning();

      return reply.send(updated);
    },
  );

  // Apply to public collaboration
  app.post(
    '/collaborations/:id/apply',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ message: z.string().optional() }),
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
      const { message } = request.body;
      const db = getDb();

      const [collab] = await db
        .select()
        .from(collaborations)
        .where(eq(collaborations.id, id));
      if (
        !collab ||
        collab.visibility !== 'public' ||
        collab.status !== 'open'
      ) {
        return reply
          .status(400)
          .send({ error: 'Collaboration not available for application' });
      }
      if (collab.ownerId === userId)
        return reply
          .status(400)
          .send({ error: 'Cannot apply to your own collaboration' });

      const [existing] = await db
        .select()
        .from(collaborationApplications)
        .where(
          and(
            eq(collaborationApplications.collaborationId, id),
            eq(collaborationApplications.userId, userId),
          ),
        );
      if (existing) return reply.status(400).send({ error: 'Already applied' });

      const [application] = await db
        .insert(collaborationApplications)
        .values({
          collaborationId: id,
          userId,
          message,
          status: 'pending',
        })
        .returning();

      return reply.send(application);
    },
  );

  // Review application
  app.post(
    '/collaborations/:id/applications/:appId/review',
    {
      schema: {
        params: z.object({ id: z.string().uuid(), appId: z.string().uuid() }),
        body: z.object({ action: z.enum(['accept', 'reject']) }),
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
      const { id, appId } = request.params;
      const { action } = request.body;
      const db = getDb();

      return await db.transaction(async (tx) => {
        const [collab] = await tx
          .select()
          .from(collaborations)
          .where(eq(collaborations.id, id));
        if (!collab || collab.ownerId !== userId)
          return reply.status(403).send({ error: 'Forbidden' });

        const [application] = await tx
          .select()
          .from(collaborationApplications)
          .where(eq(collaborationApplications.id, appId));
        if (!application || application.collaborationId !== id)
          return reply.status(404).send({ error: 'Not found' });
        if (application.status !== 'pending')
          return reply.status(400).send({ error: 'Already reviewed' });

        const newStatus = action === 'accept' ? 'accepted' : 'rejected';
        await tx
          .update(collaborationApplications)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(collaborationApplications.id, appId));

        if (action === 'accept') {
          // Add to participants
          await tx.insert(collaborationParticipants).values({
            collaborationId: id,
            userId: application.userId,
            role: 'participant',
          });

          // Add to calendar
          const endAt = new Date(
            collab.startAt.getTime() + collab.expectedDurationMinutes * 60000,
          );
          await tx.insert(calendarEvents).values({
            ownerId: application.userId,
            title: collab.title,
            description: collab.description,
            startAt: collab.startAt,
            endAt,
            timezone: collab.timezone,
            sourceType: 'collaboration',
            sourceId: collab.id,
          });
        }
        return reply.send({ success: true, status: newStatus });
      });
    },
  );

  // Join public collaboration (open mode)
  app.post(
    '/collaborations/:id/join',
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

      return await db.transaction(async (tx) => {
        // 1. Lock the collaboration row to prevent concurrent participant limit breaches
        const [collab] = await tx
          .select()
          .from(collaborations)
          .where(eq(collaborations.id, id))
          .for('update');

        if (!collab) return reply.status(404).send({ error: 'Not found' });
        if (collab.status !== 'open')
          return reply.status(400).send({ error: 'Collaboration is not open' });
        if (collab.applicationMode !== 'open')
          return reply
            .status(400)
            .send({ error: 'Collaboration is not in open mode' });
        if (collab.ownerId === userId)
          return reply
            .status(400)
            .send({ error: 'Cannot join your own collaboration' });

        // 2. Check if already joined
        const [existing] = await tx
          .select()
          .from(collaborationParticipants)
          .where(
            and(
              eq(collaborationParticipants.collaborationId, id),
              eq(collaborationParticipants.userId, userId),
            ),
          );
        if (existing)
          return reply.status(400).send({ error: 'Already a participant' });

        // 3. Check capacity
        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(collaborationParticipants)
          .where(eq(collaborationParticipants.collaborationId, id));

        if (Number(count) >= collab.maximumParticipants) {
          return reply.status(400).send({ error: 'Collaboration is full' });
        }

        // 4. Add participant
        await tx.insert(collaborationParticipants).values({
          collaborationId: id,
          userId,
          role: 'participant',
        });

        // 5. Add to calendar
        const endAt = new Date(
          collab.startAt.getTime() + collab.expectedDurationMinutes * 60000,
        );
        await tx.insert(calendarEvents).values({
          ownerId: userId,
          title: collab.title,
          description: collab.description,
          startAt: collab.startAt,
          endAt,
          timezone: collab.timezone,
          sourceType: 'collaboration',
          sourceId: collab.id,
        });

        // 6. Audit log
        await tx.insert(auditLogs).values({
          actorUserId: userId,
          targetUserId: userId,
          action: 'join_collaboration_open',
          resourceType: 'collaboration',
          resourceId: collab.id,
          success: true,
        });

        return reply.send({ success: true });
      });
    },
  );
};
