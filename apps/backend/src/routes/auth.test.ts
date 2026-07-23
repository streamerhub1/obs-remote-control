import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify from 'fastify';
import authRoutes from './auth.js';
import { getRedis } from '../redis.js';

vi.mock('../redis.js', () => ({
  getRedis: vi.fn(),
}));

describe('Auth Routes Security Tests', () => {
  let app: any;
  let mockRedis: any;

  beforeEach(async () => {
    app = fastify();
    await app.register(authRoutes);

    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };
    (getRedis as any).mockReturnValue(mockRedis);
  });

  it('should reject callback if state does not match', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/twitch/callback?code=testcode&state=badstate',
      cookies: {
        oauth_state: 'goodstate',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).error).toBe('Invalid state');
  });

  it('should reject callback if login request expired', async () => {
    mockRedis.get.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/auth/twitch/callback?code=testcode&state=goodstate',
      cookies: {
        oauth_state: 'goodstate',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).error).toBe('Login request expired or invalid');
  });

  it('should reject desktop exchange if code is invalid or expired', async () => {
    mockRedis.get.mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/desktop/exchange',
      payload: {
        code: 'expired-code',
        publicKey: 'pubkey',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).error).toBe('Invalid or expired exchange code');
  });

  it('should reject device challenge verify if signature is invalid', async () => {
    mockRedis.get.mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/desktop/verify',
      payload: {
        deviceId: 'some-device-id',
        signature: 'badsig',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).error).toBe('Challenge expired or not found');
  });
});
