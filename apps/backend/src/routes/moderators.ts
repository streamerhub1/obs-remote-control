import { FastifyInstance } from 'fastify';
import { getDb } from '../db.js';
import { users, moderatorRelationships, moderatorPermissions } from '@obs-remote/database';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { Presets, PermissionKey } from '@obs-remote/permissions';

interface JwtPayload {
  sub: string;
  deviceId?: string;
}

export default async function moderatorsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // Use the same preHandler for auth
  server.addHook('preHandler', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify<JwtPayload>();
      (request as any).user = decoded; // we will type it properly later
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
      return reply;
    }
  });

  // Lookup user by invite code
  server.get('/moderators/lookup', {
    schema: {
      querystring: z.object({
        inviteCode: z.string().min(1),
      }),
      response: {
        200: z.object({
          id: z.string(),
          displayName: z.string(),
          avatarUrl: z.string().nullable(),
        }),
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { inviteCode } = request.query;
    const db = getDb();

    const [targetUser] = await db.select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    }).from(users).where(eq(users.inviteCodeNormalized, inviteCode.toLowerCase()));

    if (!targetUser) return reply.status(404).send({ error: 'User not found' });

    return targetUser;
  });

  // Invite a moderator
  server.post('/moderators/invite', {
    schema: {
      body: z.object({
        moderatorId: z.string().uuid(),
        permissions: z.array(z.string()).default(Presets.Observer),
      }),
      response: {
        200: z.object({
          id: z.string(),
          status: z.string(),
        }),
        400: z.object({ error: z.string() }),
      }
    }
  }, async (request, reply) => {
    const streamerId = ((request as any).user as JwtPayload).sub;
    const { moderatorId, permissions } = request.body;
    
    if (streamerId === moderatorId) {
      return reply.status(400).send({ error: 'Cannot invite yourself' });
    }

    const db = getDb();
    
    return await db.transaction(async (tx) => {
      // Check existing relationship
      const existing = await tx.select().from(moderatorRelationships)
        .where(and(eq(moderatorRelationships.streamerId, streamerId), eq(moderatorRelationships.moderatorId, moderatorId)));
      
      if (existing.length > 0) {
        return reply.status(400).send({ error: 'Relationship already exists' });
      }

      const [relationship] = await tx.insert(moderatorRelationships).values({
        streamerId,
        moderatorId,
        status: 'pending',
        createdBy: streamerId,
      }).returning();

      const permissionInserts = permissions.map(p => ({
        relationshipId: relationship.id,
        permissionKey: p,
        allowed: true,
      }));

      if (permissionInserts.length > 0) {
        await tx.insert(moderatorPermissions).values(permissionInserts);
      }

      return {
        id: relationship.id,
        status: relationship.status,
      };
    });
  });

  // List relationships for streamer
  server.get('/moderators', {
    schema: {
      response: {
        200: z.array(z.object({
          id: z.string(),
          moderatorId: z.string(),
          moderatorName: z.string(),
          status: z.string(),
          permissions: z.array(z.string()),
        }))
      }
    }
  }, async (request, reply) => {
    const streamerId = ((request as any).user as JwtPayload).sub;
    const db = getDb();
    
    const rels = await db.select({
      id: moderatorRelationships.id,
      moderatorId: users.id,
      moderatorName: users.displayName,
      status: moderatorRelationships.status,
    })
    .from(moderatorRelationships)
    .innerJoin(users, eq(users.id, moderatorRelationships.moderatorId))
    .where(eq(moderatorRelationships.streamerId, streamerId));

    const result = [];
    for (const rel of rels) {
      const perms = await db.select({ key: moderatorPermissions.permissionKey })
        .from(moderatorPermissions)
        .where(and(eq(moderatorPermissions.relationshipId, rel.id), eq(moderatorPermissions.allowed, true)));
        
      result.push({
        ...rel,
        permissions: perms.map(p => p.key),
      });
    }

    return result;
  });
}
