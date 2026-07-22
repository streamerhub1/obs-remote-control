import { describe, it, expect } from 'vitest';
import { buildApp } from './app.js';

describe('App', () => {
  it('health route works', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toHaveProperty('status', 'ok');
  });
});
