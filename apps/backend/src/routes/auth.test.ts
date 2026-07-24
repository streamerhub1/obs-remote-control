import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify from 'fastify';
import authRoutes from './auth.js';
import { getRedis } from '../redis.js';
import { getDb } from '../db.js';
import crypto from 'crypto';

vi.mock('../redis.js', () => ({
  getRedis: vi.fn(),
}));

vi.mock('../db.js', () => ({
  getDb: vi.fn(),
}));

describe('Auth Routes Security Tests', () => {
  let app: any;
  let mockRedis: any;
  let mockDb: any;

  beforeEach(async () => {
    app = fastify();

    const { serializerCompiler, validatorCompiler } =
      await import('fastify-type-provider-zod');
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.jwt = { sign: vi.fn().mockReturnValue('mock-jwt') };

    await app.register(authRoutes);

    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };
    (getRedis as any).mockReturnValue(mockRedis);

    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockDb)),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
    };
    (getDb as any).mockReturnValue(mockDb);
  });

  it('Device Identity: generate key pair, request challenge, sign, successful verify', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pubKeyPem = publicKey.export({
      type: 'spki',
      format: 'pem',
    }) as string;

    const deviceId = crypto.randomUUID();

    // Challenge
    mockDb.where.mockResolvedValueOnce([{ id: deviceId, revokedAt: null }]); // Not revoked

    const challengeResponse = await app.inject({
      method: 'POST',
      url: '/desktop/challenge',
      payload: { deviceId },
    });

    expect(challengeResponse.statusCode).toBe(200);
    const { challenge } = JSON.parse(challengeResponse.payload);
    expect(challenge).toBeDefined();

    // Verify
    mockRedis.get.mockResolvedValueOnce(challenge); // Redis returns challenge
    mockDb.where.mockResolvedValueOnce([
      {
        publicKey: pubKeyPem,
        revokedAt: null,
        userId: 'user1',
      },
    ]); // DB returns device

    const signature = crypto
      .sign(null, Buffer.from(challenge), privateKey)
      .toString('base64');

    // Simulate refresh endpoint (which handles the verify)
    // Wait, let's mock the session
    mockDb.where.mockResolvedValueOnce([
      {
        id: 'session1',
        tokenHash: crypto
          .createHash('sha256')
          .update('valid-refresh')
          .digest('hex'),
        familyId: 'family1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        replacedBySessionId: null,
      },
    ]);
    mockDb.returning.mockResolvedValueOnce([{ id: 'new-session-id' }]); // insert new session

    const verifyResponse = await app.inject({
      method: 'POST',
      url: '/desktop/refresh',
      payload: {
        deviceId,
        refreshToken: 'valid-refresh',
        signature,
      },
    });

    expect(verifyResponse.statusCode).toBe(200);
    expect(JSON.parse(verifyResponse.payload).accessToken).toBeDefined();
  });

  it('Device Identity: modified challenge rejected', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pubKeyPem = publicKey.export({
      type: 'spki',
      format: 'pem',
    }) as string;

    mockRedis.get.mockResolvedValueOnce('real-challenge');
    mockDb.where.mockResolvedValueOnce([
      { publicKey: pubKeyPem, revokedAt: null, userId: 'user1' },
    ]);

    const signature = crypto
      .sign(null, Buffer.from('fake-challenge'), privateKey)
      .toString('base64');

    const response = await app.inject({
      method: 'POST',
      url: '/desktop/refresh',
      payload: {
        deviceId: crypto.randomUUID(),
        refreshToken: 'valid-refresh',
        signature,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload).error).toBe('Invalid signature');
  });

  it('Device Identity: wrong key rejected', async () => {
    const { publicKey } = crypto.generateKeyPairSync('ed25519'); // wrong public key registered
    const { privateKey: otherPrivateKey } =
      crypto.generateKeyPairSync('ed25519');

    const pubKeyPem = publicKey.export({
      type: 'spki',
      format: 'pem',
    }) as string;

    mockRedis.get.mockResolvedValueOnce('challenge');
    mockDb.where.mockResolvedValueOnce([
      { publicKey: pubKeyPem, revokedAt: null, userId: 'user1' },
    ]);

    const signature = crypto
      .sign(null, Buffer.from('challenge'), otherPrivateKey)
      .toString('base64');

    const response = await app.inject({
      method: 'POST',
      url: '/desktop/refresh',
      payload: {
        deviceId: crypto.randomUUID(),
        refreshToken: 'valid-refresh',
        signature,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload).error).toBe('Invalid signature');
  });

  it('Device Identity: revoked device rejected', async () => {
    mockRedis.get.mockResolvedValueOnce('challenge');
    mockDb.where.mockResolvedValueOnce([
      { publicKey: 'pub', revokedAt: new Date(), userId: 'user1' },
    ]); // Revoked!

    const response = await app.inject({
      method: 'POST',
      url: '/desktop/refresh',
      payload: {
        deviceId: crypto.randomUUID(),
        refreshToken: 'valid-refresh',
        signature: 'sigsig',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.payload).error).toBe('Device revoked');
  });

  it('Refresh Token: reuse old token revokes family', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pubKeyPem = publicKey.export({
      type: 'spki',
      format: 'pem',
    }) as string;

    const challenge = 'challenge';
    mockRedis.get.mockResolvedValueOnce(challenge);
    mockDb.where.mockResolvedValueOnce([
      { publicKey: pubKeyPem, revokedAt: null, userId: 'user1' },
    ]);

    // Simulate reuse: session has replacedBySessionId
    mockDb.where.mockResolvedValueOnce([
      {
        id: 'session1',
        familyId: 'family1',
        replacedBySessionId: 'session2', // ALREADY USED
        expiresAt: new Date(Date.now() + 100000),
      },
    ]);

    const signature = crypto
      .sign(null, Buffer.from(challenge), privateKey)
      .toString('base64');

    const response = await app.inject({
      method: 'POST',
      url: '/desktop/refresh',
      payload: {
        deviceId: crypto.randomUUID(),
        refreshToken: 'stolen-refresh-token',
        signature,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload).error).toBe(
      'Token reuse detected. Family revoked.',
    );

    // Should have updated the DB to revoke the family
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
  });
});
