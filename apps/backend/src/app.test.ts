import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from './app.js';

vi.mock('./redis.js', () => ({
  initRedis: vi.fn(),
  getRedis: vi.fn().mockReturnValue({
    ping: vi.fn().mockResolvedValue('PONG'),
    duplicate: vi.fn().mockReturnValue({
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn(),
      quit: vi.fn(),
    }),
  }),
}));

vi.mock('./db.js', () => ({
  initDb: vi.fn(),
  getDb: vi.fn().mockReturnValue({ execute: vi.fn().mockResolvedValue(true) }),
}));

describe('App', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('health route works', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toHaveProperty('status', 'ok');
  });
});
