/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from './app.js';

vi.mock('./redis.js', () => ({
  initRedis: vi.fn(),
  getRedis: vi.fn().mockReturnValue({
    ping: vi.fn().mockResolvedValue('PONG'),
    duplicate: vi.fn().mockReturnValue({
      subscribe: vi.fn(),
      on: vi.fn(),
    }),
  }),
}));

vi.mock('./db.js', () => ({
  initDb: vi.fn(),
  getDb: vi.fn().mockReturnValue({ execute: vi.fn().mockResolvedValue(true) }),
}));

describe('Collaborations API', () => {
  let app: any;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    app = await buildApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should require authentication to create a collaboration', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborations',
      payload: {
        title: 'Test Collab',
        startAt: new Date().toISOString(),
        expectedDurationMinutes: 60,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
