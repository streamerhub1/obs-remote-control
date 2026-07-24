import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDb } from '../db.js';
import {
  users,
  moderatorRelationships,
  moderatorPermissions,
  auditLogs,
} from '@obs-remote/database';
import { eq, and, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { Presets } from '@obs-remote/permissions';
import crypto from 'crypto';

interface JwtPayload {
  sub: string;
  deviceId?: string;
}

export default async function moderatorsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify<JwtPayload>();
      (request as any).user = decoded;
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
      return reply;
    }
  });

  // Helper for audit logs
  const logAudit = async (
    tx: any,
    action: string,
    streamerId: string,
    moderatorId: string,
    success: boolean,
    meta?: unknown,
    relationshipId?: string,
  ) => {
    await tx.insert(auditLogs).values({
      actorUserId: streamerId,
      targetUserId: moderatorId,
      relationshipId,
      action,
      success,
      metadataJson: meta,
      requestId: crypto.randomUUID(),
    });
  };

  server.post(
    '/moderators/lookup',
    {
      schema: {
        body: z.object({
          inviteCode: z.string().min(1),
        }),
        response: {
          200: z.object({
            id: z.string(),
            displayName: z.string(),
            avatarUrl: z.string().nullable(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { inviteCode } = request.body;
      const db = getDb();
      const [targetUser] = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.inviteCodeNormalized, inviteCode.toLowerCase()));

      if (!targetUser) {
        reply.status(404);
        throw new Error('User not found');
      }
      return targetUser;
    },
  );

  server.post(
    '/moderators/invitations',
    {
      schema: {
        body: z.object({
          moderatorId: z.string().uuid(),
          permissions: z.array(z.string()).default(Presets.Observer),
        }),
        response: { 200: z.object({ id: z.string(), status: z.string() }) },
      },
    },
    async (request, reply) => {
      const streamerId = ((request as any).user as JwtPayload).sub;
      const { moderatorId, permissions } = request.body;
      if (streamerId === moderatorId) {
        reply.status(400);
        throw new Error('Cannot invite yourself');
      }

      const db = getDb();
      return await db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(moderatorRelationships)
          .where(
            and(
              eq(moderatorRelationships.streamerId, streamerId),
              eq(moderatorRelationships.moderatorId, moderatorId),
            ),
          );

        if (existing.length > 0) {
          reply.status(400);
          throw new Error('Relationship already exists');
        }

        const [relationship] = await tx
          .insert(moderatorRelationships)
          .values({
            streamerId,
            moderatorId,
            status: 'pending',
            createdBy: streamerId,
          })
          .returning();

        if (permissions.length > 0) {
          const permissionInserts = permissions.map((p) => ({
            relationshipId: relationship.id,
            permissionKey: p,
            allowed: true,
          }));
          await tx.insert(moderatorPermissions).values(permissionInserts);
        }

        await logAudit(
          tx,
          'invitation.create',
          streamerId,
          moderatorId,
          true,
          { permissions },
          relationship.id,
        );
        return { id: relationship.id, status: relationship.status };
      });
    },
  );

  server.get(
    '/moderators/invitations/incoming',
    {
      schema: {
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              streamerId: z.string(),
              streamerName: z.string(),
              status: z.string(),
            }),
          ),
        },
      },
    },
    async (request) => {
      const userId = ((request as any).user as JwtPayload).sub;
      const db = getDb();
      return await db
        .select({
          id: moderatorRelationships.id,
          streamerId: users.id,
          streamerName: users.displayName,
          status: moderatorRelationships.status,
        })
        .from(moderatorRelationships)
        .innerJoin(users, eq(users.id, moderatorRelationships.streamerId))
        .where(
          and(
            eq(moderatorRelationships.moderatorId, userId),
            eq(moderatorRelationships.status, 'pending'),
          ),
        );
    },
  );

  server.get(
    '/moderators/invitations/outgoing',
    {
      schema: {
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              moderatorId: z.string(),
              moderatorName: z.string(),
              status: z.string(),
            }),
          ),
        },
      },
    },
    async (request) => {
      const userId = ((request as any).user as JwtPayload).sub;
      const db = getDb();
      return await db
        .select({
          id: moderatorRelationships.id,
          moderatorId: users.id,
          moderatorName: users.displayName,
          status: moderatorRelationships.status,
        })
        .from(moderatorRelationships)
        .innerJoin(users, eq(users.id, moderatorRelationships.moderatorId))
        .where(
          and(
            eq(moderatorRelationships.streamerId, userId),
            eq(moderatorRelationships.status, 'pending'),
          ),
        );
    },
  );

  server.post(
    '/moderators/invitations/:id/accept',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request, reply) => {
      const userId = ((request as any).user as JwtPayload).sub;
      const { id } = request.params;
      const db = getDb();

      await db.transaction(async (tx) => {
        const [rel] = await tx
          .select()
          .from(moderatorRelationships)
          .where(
            and(
              eq(moderatorRelationships.id, id),
              eq(moderatorRelationships.moderatorId, userId),
              eq(moderatorRelationships.status, 'pending'),
            ),
          );
        if (!rel) {
          reply.status(404);
          throw new Error('Invitation not found or not pending');
        }

        await tx
          .update(moderatorRelationships)
          .set({ status: 'active', acceptedAt: new Date() })
          .where(eq(moderatorRelationships.id, id));

        await logAudit(
          tx,
          'invitation.accept',
          rel.streamerId,
          userId,
          true,
          {},
          id,
        );
      });
      return { success: true };
    },
  );

  server.post(
    '/moderators/invitations/:id/reject',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request, reply) => {
      const userId = ((request as any).user as JwtPayload).sub;
      const { id } = request.params;
      const db = getDb();

      await db.transaction(async (tx) => {
        const [rel] = await tx
          .select()
          .from(moderatorRelationships)
          .where(
            and(
              eq(moderatorRelationships.id, id),
              eq(moderatorRelationships.moderatorId, userId),
              eq(moderatorRelationships.status, 'pending'),
            ),
          );
        if (!rel) {
          reply.status(404);
          throw new Error('Invitation not found or not pending');
        }

        await tx
          .update(moderatorRelationships)
          .set({ status: 'rejected', rejectedAt: new Date() })
          .where(eq(moderatorRelationships.id, id));

        await logAudit(
          tx,
          'invitation.reject',
          rel.streamerId,
          userId,
          true,
          {},
          id,
        );
      });
      return { success: true };
    },
  );

  server.delete(
    '/moderators/invitations/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request, reply) => {
      const userId = ((request as any).user as JwtPayload).sub;
      const { id } = request.params;
      const db = getDb();

      await db.transaction(async (tx) => {
        const [rel] = await tx
          .select()
          .from(moderatorRelationships)
          .where(
            and(
              eq(moderatorRelationships.id, id),
              eq(moderatorRelationships.streamerId, userId),
              eq(moderatorRelationships.status, 'pending'),
            ),
          );
        if (!rel) {
          reply.status(404);
          throw new Error('Invitation not found');
        }

        await tx
          .delete(moderatorRelationships)
          .where(eq(moderatorRelationships.id, id));
        await logAudit(
          tx,
          'invitation.cancel',
          userId,
          rel.moderatorId,
          true,
          {},
          id,
        );
      });
      return { success: true };
    },
  );

  server.get(
    '/moderators',
    {
      schema: {
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              moderatorId: z.string(),
              moderatorName: z.string(),
              status: z.string(),
            }),
          ),
        },
      },
    },
    async (request) => {
      const streamerId = ((request as any).user as JwtPayload).sub;
      const db = getDb();

      return await db
        .select({
          id: moderatorRelationships.id,
          moderatorId: users.id,
          moderatorName: users.displayName,
          status: moderatorRelationships.status,
        })
        .from(moderatorRelationships)
        .innerJoin(users, eq(users.id, moderatorRelationships.moderatorId))
        .where(eq(moderatorRelationships.streamerId, streamerId));
    },
  );

  server.patch(
    '/moderators/:relationshipId/status',
    {
      schema: {
        params: z.object({ relationshipId: z.string().uuid() }),
        body: z.object({ status: z.enum(['active', 'paused', 'revoked']) }),
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request, reply) => {
      const streamerId = ((request as any).user as JwtPayload).sub;
      const { relationshipId } = request.params;
      const { status } = request.body;
      const db = getDb();

      await db.transaction(async (tx) => {
        const [rel] = await tx
          .select()
          .from(moderatorRelationships)
          .where(
            and(
              eq(moderatorRelationships.id, relationshipId),
              eq(moderatorRelationships.streamerId, streamerId),
            ),
          );
        if (!rel) {
          reply.status(404);
          throw new Error('Relationship not found');
        }

        const updateData: Record<string, unknown> = { status };
        if (status === 'paused') updateData.pausedAt = new Date();
        if (status === 'revoked') updateData.revokedAt = new Date();

        await tx
          .update(moderatorRelationships)
          .set(updateData)
          .where(eq(moderatorRelationships.id, relationshipId));
        await logAudit(
          tx,
          `relationship.${status}`,
          streamerId,
          rel.moderatorId,
          true,
          {},
          relationshipId,
        );
      });
      return { success: true };
    },
  );

  server.delete(
    '/moderators/:relationshipId',
    {
      schema: {
        params: z.object({ relationshipId: z.string().uuid() }),
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request, reply) => {
      const userId = ((request as any).user as JwtPayload).sub;
      const { relationshipId } = request.params;
      const db = getDb();

      await db.transaction(async (tx) => {
        const [rel] = await tx
          .select()
          .from(moderatorRelationships)
          .where(
            and(
              eq(moderatorRelationships.id, relationshipId),
              or(
                eq(moderatorRelationships.streamerId, userId),
                eq(moderatorRelationships.moderatorId, userId),
              ),
            ),
          );
        if (!rel) {
          reply.status(404);
          throw new Error('Relationship not found');
        }

        await tx
          .delete(moderatorRelationships)
          .where(eq(moderatorRelationships.id, relationshipId));
        await logAudit(
          tx,
          'relationship.delete',
          userId,
          rel.streamerId === userId ? rel.moderatorId : rel.streamerId,
          true,
          {},
          relationshipId,
        );
      });
      return { success: true };
    },
  );

  server.get(
    '/moderators/:relationshipId/permissions',
    {
      schema: {
        params: z.object({ relationshipId: z.string().uuid() }),
        response: { 200: z.array(z.string()) },
      },
    },
    async (request, reply) => {
      const userId = ((request as any).user as JwtPayload).sub;
      const { relationshipId } = request.params;
      const db = getDb();

      const [rel] = await db
        .select()
        .from(moderatorRelationships)
        .where(
          and(
            eq(moderatorRelationships.id, relationshipId),
            or(
              eq(moderatorRelationships.streamerId, userId),
              eq(moderatorRelationships.moderatorId, userId),
            ),
          ),
        );
      if (!rel) {
        reply.status(404);
        throw new Error('Relationship not found');
      }

      const perms = await db
        .select({ key: moderatorPermissions.permissionKey })
        .from(moderatorPermissions)
        .where(
          and(
            eq(moderatorPermissions.relationshipId, relationshipId),
            eq(moderatorPermissions.allowed, true),
          ),
        );

      return perms.map((p) => p.key);
    },
  );

  server.put(
    '/moderators/:relationshipId/permissions',
    {
      schema: {
        params: z.object({ relationshipId: z.string().uuid() }),
        body: z.object({ permissions: z.array(z.string()) }),
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (request, reply) => {
      const streamerId = ((request as any).user as JwtPayload).sub;
      const { relationshipId } = request.params;
      const { permissions } = request.body;
      const db = getDb();

      await db.transaction(async (tx) => {
        const [rel] = await tx
          .select()
          .from(moderatorRelationships)
          .where(
            and(
              eq(moderatorRelationships.id, relationshipId),
              eq(moderatorRelationships.streamerId, streamerId),
            ),
          );
        if (!rel) {
          reply.status(404);
          throw new Error('Relationship not found');
        }

        await tx
          .delete(moderatorPermissions)
          .where(eq(moderatorPermissions.relationshipId, relationshipId));

        if (permissions.length > 0) {
          const permissionInserts = permissions.map((p) => ({
            relationshipId,
            permissionKey: p,
            allowed: true,
          }));
          await tx.insert(moderatorPermissions).values(permissionInserts);
        }

        await tx
          .update(moderatorRelationships)
          .set({ permissionsVersion: crypto.randomUUID() })
          .where(eq(moderatorRelationships.id, relationshipId));

        await logAudit(
          tx,
          'permissions.update',
          streamerId,
          rel.moderatorId,
          true,
          { permissions },
          relationshipId,
        );
      });
      return { success: true };
    },
  );

  server.get(
    '/access/streamers',
    {
      schema: {
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              streamerId: z.string(),
              streamerName: z.string(),
              status: z.string(),
            }),
          ),
        },
      },
    },
    async (request) => {
      const moderatorId = ((request as any).user as JwtPayload).sub;
      const db = getDb();

      return await db
        .select({
          id: moderatorRelationships.id,
          streamerId: users.id,
          streamerName: users.displayName,
          status: moderatorRelationships.status,
        })
        .from(moderatorRelationships)
        .innerJoin(users, eq(users.id, moderatorRelationships.streamerId))
        .where(
          and(
            eq(moderatorRelationships.moderatorId, moderatorId),
            eq(moderatorRelationships.status, 'active'),
          ),
        );
    },
  );
}
