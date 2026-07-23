import { FastifyInstance } from 'fastify';
import { getDb } from '../db.js';
import { users, moderatorRelationships, moderatorPermissions, remoteSessions, auditLogs, devices } from '@obs-remote/database';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import crypto from 'crypto';
import { getRedis } from '../redis.js';

interface JwtPayload {
  sub: string;
  deviceId?: string;
}

export default async function remoteSessionsRoutes(app: FastifyInstance) {
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

  const logAudit = async (tx: any, action: string, streamerId: string, moderatorId: string, success: boolean, meta?: any, relationshipId?: string, remoteSessionId?: string) => {
    await tx.insert(auditLogs).values({
      actorUserId: moderatorId,
      targetUserId: streamerId,
      relationshipId,
      remoteSessionId,
      action,
      success,
      metadataJson: meta,
      requestId: crypto.randomUUID(),
    });
  };

  server.post('/remote-sessions', {
    schema: {
      body: z.object({
        relationshipId: z.string().uuid(),
      }),
      response: {
        200: z.object({
          remoteSessionId: z.string(),
          authorizationToken: z.string(),
        })
      }
    }
  }, async (request, reply) => {
    const moderatorUserId = ((request as any).user as JwtPayload).sub;
    const moderatorDeviceId = ((request as any).user as JwtPayload).deviceId;
    if (!moderatorDeviceId) {
      reply.status(403); throw new Error('Device ID required');
    }

    const { relationshipId } = request.body;
    const db = getDb();
    
    return await db.transaction(async (tx) => {
      // Check relationship
      const [rel] = await tx.select().from(moderatorRelationships).where(and(eq(moderatorRelationships.id, relationshipId), eq(moderatorRelationships.moderatorId, moderatorUserId)));
      if (!rel) { reply.status(404); throw new Error('Relationship not found'); }
      if (rel.status !== 'active') { reply.status(403); throw new Error('Relationship is not active'); }

      const streamerUserId = rel.streamerId;

      // Check streamer presence and device
      const redis = getRedis();
      // Find active streamer device
      // In real scenario, we might need to know which device streamer is using, or streamer presence holds deviceId.
      // We will look up all presence keys for streamer.
      const presenceKeys = await redis.keys(`presence:${streamerUserId}:*`);
      if (presenceKeys.length === 0) {
        reply.status(400); throw new Error('Streamer is offline');
      }
      const streamerDeviceId = presenceKeys[0].split(':')[2];

      // Verify devices are not revoked
      const [modDev] = await tx.select().from(devices).where(eq(devices.id, moderatorDeviceId));
      if (!modDev || modDev.revokedAt) { reply.status(403); throw new Error('Moderator device is revoked or not found'); }

      const [streamDev] = await tx.select().from(devices).where(eq(devices.id, streamerDeviceId));
      if (!streamDev || streamDev.revokedAt) { reply.status(403); throw new Error('Streamer device is revoked or not found'); }

      // Get permissions
      const perms = await tx.select({ key: moderatorPermissions.permissionKey })
        .from(moderatorPermissions)
        .where(and(eq(moderatorPermissions.relationshipId, relationshipId), eq(moderatorPermissions.allowed, true)));
      const permissionsList = perms.map(p => p.key);

      // Create remote session
      const publicId = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12); // 12 hours

      const [session] = await tx.insert(remoteSessions).values({
        publicId,
        streamerId: streamerUserId,
        moderatorId: moderatorUserId,
        streamerDeviceId,
        moderatorDeviceId,
        relationshipId,
        status: 'signaling',
        permissionsVersion: rel.permissionsVersion,
        expiresAt,
      }).returning();

      const nonce = crypto.randomUUID();
      
      const payload = {
        remoteSessionId: session.id,
        streamerUserId,
        moderatorUserId,
        streamerDeviceId,
        moderatorDeviceId,
        relationshipId,
        permissions: permissionsList,
        permissionsVersion: rel.permissionsVersion,
        protocolVersion: '1.0',
        nonce,
        issuedAt: Date.now(),
        expiresAt: expiresAt.getTime()
      };

      const authorizationToken = app.jwt.sign(payload, { expiresIn: '12h' });

      await logAudit(tx, 'remote_session.create', streamerUserId, moderatorUserId, true, { sessionId: session.id }, relationshipId, session.id);

      return {
        remoteSessionId: session.id,
        authorizationToken,
      };
    });
  });

  server.get('/remote-sessions', {
    schema: {
      response: {
        200: z.array(z.object({
          id: z.string(),
          status: z.string(),
          streamerId: z.string(),
          moderatorId: z.string(),
          createdAt: z.string()
        }))
      }
    }
  }, async (request) => {
    const userId = ((request as any).user as JwtPayload).sub;
    const db = getDb();
    
    const sessions = await db.select({
      id: remoteSessions.id,
      status: remoteSessions.status,
      streamerId: remoteSessions.streamerId,
      moderatorId: remoteSessions.moderatorId,
      createdAt: remoteSessions.createdAt,
    }).from(remoteSessions)
    .where(or(eq(remoteSessions.streamerId, userId), eq(remoteSessions.moderatorId, userId)));

    return sessions.map(s => ({ ...s, createdAt: s.createdAt.toISOString() }));
  });

  server.get('/remote-sessions/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: {
        200: z.object({
          id: z.string(),
          status: z.string(),
          streamerId: z.string(),
          moderatorId: z.string(),
        })
      }
    }
  }, async (request, reply) => {
    const userId = ((request as any).user as JwtPayload).sub;
    const { id } = request.params;
    const db = getDb();
    
    const [session] = await db.select().from(remoteSessions)
      .where(and(eq(remoteSessions.id, id), or(eq(remoteSessions.streamerId, userId), eq(remoteSessions.moderatorId, userId))));

    if (!session) { reply.status(404); throw new Error('Session not found'); }
    
    return {
      id: session.id,
      status: session.status,
      streamerId: session.streamerId,
      moderatorId: session.moderatorId,
    };
  });

  server.delete('/remote-sessions/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: { 200: z.object({ success: z.boolean() }) }
    }
  }, async (request, reply) => {
    const userId = ((request as any).user as JwtPayload).sub;
    const { id } = request.params;
    const db = getDb();
    
    await db.transaction(async (tx) => {
      const [session] = await tx.select().from(remoteSessions)
        .where(and(eq(remoteSessions.id, id), or(eq(remoteSessions.streamerId, userId), eq(remoteSessions.moderatorId, userId))));

      if (!session) { reply.status(404); throw new Error('Session not found'); }
      
      await tx.update(remoteSessions).set({
        status: 'closed',
        endedAt: new Date(),
        closeReason: 'user_requested'
      }).where(eq(remoteSessions.id, id));

      await logAudit(tx, 'remote_session.close', session.streamerId, session.moderatorId, true, { reason: 'user_requested' }, session.relationshipId, id);
    });

    return { success: true };
  });
}
