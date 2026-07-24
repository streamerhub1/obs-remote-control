import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
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

interface MockRedis {
  get: Mock;
  set: Mock;
  del: Mock;
}

interface MockDb {
  select: Mock;
  from: Mock;
  where: Mock;
  transaction: Mock;
  insert: Mock;
  values: Mock;
  update: Mock;
  set: Mock;
  returning: Mock;
}

describe('Auth Routes Security Tests', () => {
  let app: FastifyInstance;
  let mockRedis: MockRedis;
  let mockDb: MockDb;

  beforeEach(async () => {
    app = fastify();

    const { serializerCompiler, validatorCompiler } =
      await import('fastify-type-provider-zod');
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.decorate('jwt', {
      sign: vi.fn().mockReturnValue('mock-jwt'),
    } as unknown as import('@fastify/jwt').JWT);

    const fastifyCookie = (await import('@fastify/cookie')).default;
    await app.register(fastifyCookie);
    await app.register(authRoutes);

    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };
    (getRedis as Mock).mockReturnValue(mockRedis);

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
    (getDb as Mock).mockReturnValue(mockDb);
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

describe('Twitch OAuth Flow', () => {
  let app: FastifyInstance;
  let mockRedis: MockRedis;
  let mockDb: MockDb;
  let fetchMock: Mock;
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(async () => {
    process.env.TWITCH_CLIENT_ID = 'test-client-id';
    process.env.TWITCH_CLIENT_SECRET = 'test-secret';
    process.env.TWITCH_REDIRECT_URI = 'http://test-redirect';
    process.env.TOKEN_ENCRYPTION_KEY =
      'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
    process.env.DESKTOP_DEEP_LINK = 'streamerhub://auth/callback';

    app = fastify();

    const { serializerCompiler, validatorCompiler } =
      await import('fastify-type-provider-zod');
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('jwt', {
      sign: vi.fn().mockReturnValue('mock-jwt'),
    } as unknown as import('@fastify/jwt').JWT);

    const fastifyCookie = (await import('@fastify/cookie')).default;
    await app.register(fastifyCookie);
    await app.register(authRoutes);

    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };
    (getRedis as Mock).mockReturnValue(mockRedis);

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
    (getDb as Mock).mockReturnValue(mockDb);

    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('1 & 2. authorize URL contains correct redirect_uri, state, and no PKCE', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/desktop/login',
    });

    expect(response.statusCode).toBe(302);
    const location = new URL(response.headers.location as string);
    expect(location.hostname).toBe('id.twitch.tv');
    expect(location.pathname).toBe('/oauth2/authorize');
    expect(location.searchParams.get('client_id')).toBe('test-client-id');
    expect(location.searchParams.get('redirect_uri')).toBe(
      'http://test-redirect',
    );
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(location.searchParams.get('state')).toBeTruthy();

    // NO PKCE
    expect(location.searchParams.has('code_challenge')).toBe(false);
    expect(location.searchParams.has('code_challenge_method')).toBe(false);

    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining('auth:state:'),
      expect.stringContaining('"flow":"desktop"'),
      'EX',
      600,
    );
  });

  it('3, 4, 5, 6, 8. token request format is correct and successful flow creates exchange code', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ flow: 'desktop' }));

    // Mock Token Response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'mock-access',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
      }),
    });

    // Mock Validate Response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        client_id: 'test-client-id',
        user_id: '123',
      }),
    });

    // Mock User Response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '123',
            login: 'testuser',
            display_name: 'TestUser',
            profile_image_url: 'img',
          },
        ],
      }),
    });

    mockDb.where.mockResolvedValueOnce([]); // No existing user
    mockDb.returning.mockResolvedValueOnce([{ id: 'new-user-id' }]); // User insert
    mockDb.where.mockResolvedValueOnce([]); // No existing oauth
    mockDb.values.mockResolvedValueOnce([{ id: 'new-oauth-id' }]); // OAuth insert

    const response = await app.inject({
      method: 'GET',
      url: '/twitch/callback?code=test-code&state=test-state',
      cookies: { oauth_state: 'test-state' },
    });

    // Validate fetch calls
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const tokenCall = fetchMock.mock.calls[0];
    expect(tokenCall[0]).toBe('https://id.twitch.tv/oauth2/token');
    expect(tokenCall[1].method).toBe('POST');
    expect(tokenCall[1].headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
    expect(tokenCall[1].headers['Authorization']).toBeUndefined(); // No basic auth

    const body = tokenCall[1].body as URLSearchParams;
    expect(body.get('client_id')).toBe('test-client-id');
    expect(body.get('client_secret')).toBe('test-secret');
    expect(body.get('code')).toBe('test-code');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('redirect_uri')).toBe('http://test-redirect'); // matches exactly

    expect(response.statusCode).toBe(200);
    expect(response.payload).toContain(
      'window.location.href = "streamerhub://auth/callback?code=',
    );
    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining('auth:exchange:'),
      expect.stringContaining('"userId":"new-user-id"'),
      'EX',
      300,
    );
  });

  it('7. Twitch error is handled gracefully', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ flow: 'desktop' }));

    // Mock Token Error Response
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid token' }),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/twitch/callback?code=test-code&state=test-state',
      cookies: { oauth_state: 'test-state' },
    });

    expect(response.statusCode).toBe(200); // Renders HTML error page
    expect(response.payload).toContain('Authorization Failed');
    expect(response.payload).toContain(
      'We could not validate your Twitch login',
    );
  });
});
