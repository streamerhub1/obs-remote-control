import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './app.js';
import { FastifyInstance } from 'fastify';

describe('App', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    app = await buildApp();
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
