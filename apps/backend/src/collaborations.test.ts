import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import { FastifyInstance } from 'fastify';

describe('Collaborations API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
      console.warn("Skipping collaborations test because DATABASE_URL or REDIS_URL are missing.");
      return;
    }
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
      }
    });

    expect(response.statusCode).toBe(401);
  });
});
