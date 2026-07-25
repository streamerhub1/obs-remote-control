import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import signalingRoutes from './signaling.js';
import remoteSessionsRoutes from './remoteSessions.js';
import authRoutes from './auth.js';
import { relationshipsRoutes } from './relationships.js';
import { initDb, getDb } from '../db.js';
import { initRedis, getRedis } from '../redis.js';
import {
  users,
  devices,
  moderatorRelationships,
  moderatorPermissions,
  auditLogs,
  remoteSessions,
} from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import fastifyWebsocket from '@fastify/websocket';

describe('Moderator API Flow Integration', () => {
  let app: FastifyInstance;
  let streamerId: string;
  let moderatorId: string;
  let moderatorTwitchLogin: string;
  let streamerDeviceId: string;
  let moderatorDeviceId: string;
  let streamerToken: string;
  let moderatorToken: string;
  let relationshipId: string;
  let remoteSessionId: string;

  beforeAll(async () => {
    initDb(process.env.DATABASE_URL!);
    initRedis(process.env.REDIS_URL!);

    app = fastify();

    const { serializerCompiler, validatorCompiler } =
      await import('fastify-type-provider-zod');
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    const fastifyJwt = await import('@fastify/jwt');
    app.register(fastifyJwt.default || fastifyJwt, { secret: 'test-secret' });
    app.register(fastifyWebsocket);

    await app.register(authRoutes, { prefix: '/api/v1/auth' });
    await app.register(remoteSessionsRoutes, { prefix: '/api/v1' });
    await app.register(relationshipsRoutes, { prefix: '/api/v1' });
    await app.register(signalingRoutes, { prefix: '/api/v1' });

    await app.ready();

    const db = getDb();
    const streamerInviteCode = crypto.randomUUID();
    const [streamer] = await db
      .insert(users)
      .values({
        twitchId: crypto.randomUUID(),
        twitchLogin: crypto.randomUUID(),
        displayName: 'Test Streamer',
        avatarUrl: '',
        inviteCode: streamerInviteCode,
        inviteCodeNormalized: streamerInviteCode,
      })
      .returning();
    streamerId = streamer.id;

    const { publicKey: sPk } = crypto.generateKeyPairSync('ed25519');
    const [sDev] = await db
      .insert(devices)
      .values({
        userId: streamerId,
        publicKey: sPk.export({ type: 'spki', format: 'pem' }) as string,
        name: 'Streamer PC',
        platform: 'Windows',
        appVersion: '1.0.0',
      })
      .returning();
    streamerDeviceId = sDev.id;

    moderatorTwitchLogin = crypto.randomUUID();
    const moderatorInviteCode = crypto.randomUUID();
    const [moderator] = await db
      .insert(users)
      .values({
        twitchId: crypto.randomUUID(),
        twitchLogin: moderatorTwitchLogin,
        displayName: 'Test Moderator',
        avatarUrl: '',
        inviteCode: moderatorInviteCode,
        inviteCodeNormalized: moderatorInviteCode,
      })
      .returning();
    moderatorId = moderator.id;

    const { publicKey: mPk } = crypto.generateKeyPairSync('ed25519');
    const [mDev] = await db
      .insert(devices)
      .values({
        userId: moderatorId,
        publicKey: mPk.export({ type: 'spki', format: 'pem' }) as string,
        name: 'Moderator PC',
        platform: 'Windows',
        appVersion: '1.0.0',
      })
      .returning();
    moderatorDeviceId = mDev.id;

    streamerToken = app.jwt.sign({
      sub: streamerId,
      deviceId: streamerDeviceId,
    });
    moderatorToken = app.jwt.sign({
      sub: moderatorId,
      deviceId: moderatorDeviceId,
    });
  });

  afterAll(async () => {
    const db = getDb();
    if (remoteSessionId) {
      await db
        .delete(auditLogs)
        .where(eq(auditLogs.remoteSessionId, remoteSessionId));
      await db
        .delete(remoteSessions)
        .where(eq(remoteSessions.id, remoteSessionId));
    }
    if (relationshipId) {
      await db
        .delete(auditLogs)
        .where(eq(auditLogs.relationshipId, relationshipId));
      await db
        .delete(moderatorPermissions)
        .where(eq(moderatorPermissions.relationshipId, relationshipId));
      await db
        .delete(moderatorRelationships)
        .where(eq(moderatorRelationships.id, relationshipId));
    }
    if (streamerDeviceId) {
      await db.delete(devices).where(eq(devices.id, streamerDeviceId));
    }
    if (moderatorDeviceId) {
      await db.delete(devices).where(eq(devices.id, moderatorDeviceId));
    }
    if (streamerId) {
      await db.delete(users).where(eq(users.id, streamerId));
    }
    if (moderatorId) {
      await db.delete(users).where(eq(users.id, moderatorId));
    }

    const redis = getRedis();
    if (streamerId && streamerDeviceId) {
      await redis.del(`presence:${streamerId}:${streamerDeviceId}`);
    }
    await app.close();
    await redis.quit();
  });

  it('Complete Moderator Flow: Invite -> Accept -> Grant -> Connect -> Request Session', async () => {
    const inviteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/relationships/invite',
      headers: { authorization: `Bearer ${streamerToken}` },
      payload: { twitchLogin: moderatorTwitchLogin },
    });
    expect(inviteRes.statusCode).toBe(201);
    relationshipId = JSON.parse(inviteRes.payload).id;

    const acceptRes = await app.inject({
      method: 'POST',
      url: `/api/v1/relationships/${relationshipId}/respond`,
      headers: { authorization: `Bearer ${moderatorToken}` },
      payload: { action: 'accept' },
    });
    expect(acceptRes.statusCode).toBe(200);

    const permRes = await app.inject({
      method: 'POST',
      url: `/api/v1/relationships/${relationshipId}/permissions`,
      headers: { authorization: `Bearer ${streamerToken}` },
      payload: { permissions: { 'obs.manage': true } },
    });
    expect(permRes.statusCode).toBe(200);

    const redis = getRedis();
    await redis.setex(
      `presence:${streamerId}:${streamerDeviceId}`,
      60,
      JSON.stringify({ online: true }),
    );

    const sessionRes = await app.inject({
      method: 'POST',
      url: '/api/v1/remote-sessions',
      headers: { authorization: `Bearer ${moderatorToken}` },
      payload: { relationshipId },
    });
    expect(sessionRes.statusCode).toBe(200);
    const sessionData = JSON.parse(sessionRes.payload);
    expect(sessionData.authorizationToken).toBeDefined();
    remoteSessionId = sessionData.remoteSessionId;
  });
});
