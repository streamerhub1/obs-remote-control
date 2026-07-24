import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify from 'fastify';
import authRoutes from './auth.js';
import { initDb, getDb } from '../db.js';
import { initRedis, getRedis } from '../redis.js';
import { sessions, devices, users, moderatorRelationships, moderatorPermissions } from '@obs-remote/database';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Real Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
      console.warn("Skipping real integration tests because DATABASE_URL or REDIS_URL are missing.");
      return;
    }
    
    initDb(process.env.DATABASE_URL!);
    initRedis(process.env.REDIS_URL!);
    
    app = fastify();
    
    const { serializerCompiler, validatorCompiler } = await import('fastify-type-provider-zod');
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    
    app.jwt = { sign: () => 'mock-jwt' }; // We only mock JWT signing since Twitch OAuth is external

    await app.register(authRoutes);
  });

  afterAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.REDIS_URL) return;
    const redis = getRedis();
    await redis.quit();
  });

  it.skipIf(!process.env.DATABASE_URL || !process.env.REDIS_URL)('Creates user, registers device, and performs challenge/response', async () => {
    const db = getDb();
    
    // 1. Create a dummy user
    const [user] = await db.insert(users).values({
      twitchId: '123456',
      twitchLogin: 'integration_test_user',
      displayName: 'Integration Tester',
      avatarUrl: '',
      inviteCode: 'integ-test-user',
      inviteCodeNormalized: 'integ-test-user',
    }).returning();

    // 2. Register Device
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pubKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    
    const [device] = await db.insert(devices).values({
      userId: user.id,
      publicKey: pubKeyPem,
      name: 'Integration Test PC',
      platform: 'Windows',
      appVersion: '1.0.0',
    }).returning();

    // 3. Request Challenge
    const challengeRes = await app.inject({
      method: 'POST',
      url: '/desktop/challenge',
      payload: { deviceId: device.id },
    });
    
    expect(challengeRes.statusCode).toBe(200);
    const { challenge } = JSON.parse(challengeRes.payload);
    expect(challenge).toBeDefined();

    // 4. Verify Signature (Mock session to allow refresh)
    const [session] = await db.insert(sessions).values({
      userId: user.id,
      deviceId: device.id,
      tokenHash: crypto.createHash('sha256').update('real-refresh-token').digest('hex'),
      familyId: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 100000),
    }).returning();

    const signature = crypto.sign(null, Buffer.from(challenge), privateKey).toString('base64');
    
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/desktop/refresh',
      payload: {
        deviceId: device.id,
        refreshToken: 'real-refresh-token',
        signature,
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyPayload = JSON.parse(verifyRes.payload);
    expect(verifyPayload.accessToken).toBeDefined();

    // Cleanup
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await db.delete(devices).where(eq(devices.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  });
});
