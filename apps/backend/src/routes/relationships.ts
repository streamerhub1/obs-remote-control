import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db.js';
import {
  moderatorRelationships,
  moderatorPermissions,
  users,
} from '@obs-remote/database';
import { eq, and, or } from 'drizzle-orm';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import crypto from 'crypto';

export const relationshipsRoutes: FastifyPluginAsync = async (appOriginal) => {
  const app = appOriginal.withTypeProvider<ZodTypeProvider>();
  // Get all relationships for the current user
  app.get('/relationships', async (request, reply) => {
    const userId = (request.user as any).sub;
    const db = getDb();

    // As Streamer (I have invited moderators)
    const asStreamer = await db
      .select({
        id: moderatorRelationships.id,
        status: moderatorRelationships.status,
        createdAt: moderatorRelationships.createdAt,
        moderatorId: users.id,
        moderatorLogin: users.twitchLogin,
        moderatorName: users.displayName,
      })
      .from(moderatorRelationships)
      .innerJoin(users, eq(moderatorRelationships.moderatorId, users.id))
      .where(eq(moderatorRelationships.streamerId, userId));

    // As Moderator (I have been invited)
    const asModerator = await db
      .select({
        id: moderatorRelationships.id,
        status: moderatorRelationships.status,
        createdAt: moderatorRelationships.createdAt,
        streamerId: users.id,
        streamerLogin: users.twitchLogin,
        streamerName: users.displayName,
      })
      .from(moderatorRelationships)
      .innerJoin(users, eq(moderatorRelationships.streamerId, users.id))
      .where(eq(moderatorRelationships.moderatorId, userId));

    return reply.send({ asStreamer, asModerator });
  });

  // Create an invitation (Streamer invites Moderator via Twitch Login or inviteCode)
  app.post(
    '/relationships/invite',
    {
      schema: {
        body: z
          .object({
            twitchLogin: z.string().optional(),
            inviteCode: z.string().optional(),
          })
          .refine((data) => data.twitchLogin || data.inviteCode, {
            message: 'Either twitchLogin or inviteCode must be provided',
          }),
      },
    },
    async (request, reply) => {
      const streamerId = (request.user as any).sub;
      const { twitchLogin, inviteCode } = request.body;

      const db = getDb();

      // Find the user to invite
      let moderator;
      if (inviteCode) {
        const normalized = inviteCode.toUpperCase().trim();
        [moderator] = await db
          .select()
          .from(users)
          .where(eq(users.inviteCodeNormalized, normalized));
      } else if (twitchLogin) {
        [moderator] = await db
          .select()
          .from(users)
          .where(eq(users.twitchLogin, twitchLogin.toLowerCase()));
      }

      if (!moderator) {
        return reply.status(404).send({ error: 'User not found' });
      }

      if (moderator.id === streamerId) {
        return reply.status(400).send({ error: 'Cannot invite yourself' });
      }

      // Check if relationship exists
      const [existing] = await db
        .select()
        .from(moderatorRelationships)
        .where(
          and(
            eq(moderatorRelationships.streamerId, streamerId),
            eq(moderatorRelationships.moderatorId, moderator.id),
          ),
        );

      if (existing) {
        return reply.status(400).send({ error: 'Relationship already exists' });
      }

      // Create relationship
      const [relationship] = await db
        .insert(moderatorRelationships)
        .values({
          streamerId,
          moderatorId: moderator.id,
          createdBy: streamerId,
          status: 'pending',
        })
        .returning();

      // Setup default permissions (none)
      const granularPerms = [
        'scenes.read',
        'scenes.switch',
        'sceneItems.read',
        'sceneItems.visibility',
        'audio.read',
        'audio.mute',
        'audio.volume',
        'stream.read',
        'stream.start',
        'stream.stop',
        'record.read',
        'record.start',
        'record.stop',
        'obs.manage',
      ];

      await db.insert(moderatorPermissions).values(
        granularPerms.map((perm) => ({
          relationshipId: relationship.id,
          permissionKey: perm,
          allowed: false,
        })),
      );

      return reply.status(201).send(relationship);
    },
  );

  // Accept/Reject an invitation (Moderator action)
  app.post(
    '/relationships/:id/respond',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          action: z.enum(['accept', 'reject']),
        }),
      },
    },
    async (request, reply) => {
      const moderatorId = (request.user as any).sub;
      const { id } = request.params;
      const { action } = request.body;

      const db = getDb();
      const [relationship] = await db
        .select()
        .from(moderatorRelationships)
        .where(eq(moderatorRelationships.id, id));

      if (!relationship)
        return reply.status(404).send({ error: 'Relationship not found' });
      if (relationship.moderatorId !== moderatorId)
        return reply.status(403).send({ error: 'Not your invitation' });
      if (relationship.status !== 'pending')
        return reply.status(400).send({ error: 'Invitation not pending' });

      const status = action === 'accept' ? 'active' : 'rejected';
      const timestampField = action === 'accept' ? 'acceptedAt' : 'rejectedAt';

      await db
        .update(moderatorRelationships)
        .set({ status, [timestampField]: new Date(), updatedAt: new Date() })
        .where(eq(moderatorRelationships.id, id));

      return reply.send({ success: true, status });
    },
  );

  // Revoke a relationship (Streamer or Moderator action)
  app.post(
    '/relationships/:id/revoke',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params;

      const db = getDb();
      const [relationship] = await db
        .select()
        .from(moderatorRelationships)
        .where(eq(moderatorRelationships.id, id));

      if (!relationship)
        return reply.status(404).send({ error: 'Relationship not found' });
      if (
        relationship.streamerId !== userId &&
        relationship.moderatorId !== userId
      ) {
        return reply.status(403).send({ error: 'Unauthorized' });
      }

      await db
        .update(moderatorRelationships)
        .set({
          status: 'revoked',
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(moderatorRelationships.id, id));

      return reply.send({ success: true });
    },
  );

  // Get permissions for a relationship (Streamer only)
  app.get(
    '/relationships/:id/permissions',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params;

      const db = getDb();
      const [relationship] = await db
        .select()
        .from(moderatorRelationships)
        .where(eq(moderatorRelationships.id, id));
      if (!relationship || relationship.streamerId !== userId)
        return reply.status(403).send({ error: 'Unauthorized' });

      const permissions = await db
        .select()
        .from(moderatorPermissions)
        .where(eq(moderatorPermissions.relationshipId, id));
      return reply.send(permissions);
    },
  );

  // Update permissions (Streamer only)
  app.post(
    '/relationships/:id/permissions',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          permissions: z.record(z.boolean()),
        }),
      },
    },
    async (request, reply) => {
      const userId = (request.user as any).sub;
      const { id } = request.params;
      const { permissions } = request.body;

      const db = getDb();
      const [relationship] = await db
        .select()
        .from(moderatorRelationships)
        .where(eq(moderatorRelationships.id, id));
      if (!relationship || relationship.streamerId !== userId)
        return reply.status(403).send({ error: 'Unauthorized' });

      // Handle permissions upsert
      for (const [key, allowed] of Object.entries(permissions)) {
        const existing = await db
          .select()
          .from(moderatorPermissions)
          .where(
            and(
              eq(moderatorPermissions.relationshipId, id),
              eq(moderatorPermissions.permissionKey, key),
            ),
          );

        if (existing.length > 0) {
          await db
            .update(moderatorPermissions)
            .set({ allowed: allowed as boolean, updatedAt: new Date() })
            .where(
              and(
                eq(moderatorPermissions.relationshipId, id),
                eq(moderatorPermissions.permissionKey, key),
              ),
            );
        } else {
          await db.insert(moderatorPermissions).values({
            relationshipId: id,
            permissionKey: key,
            allowed: allowed as boolean,
          });
        }
      }

      // Bump permissions version to invalidate active sessions
      await db
        .update(moderatorRelationships)
        .set({ permissionsVersion: crypto.randomUUID(), updatedAt: new Date() })
        .where(eq(moderatorRelationships.id, id));

      return reply.send({ success: true });
    },
  );
};
