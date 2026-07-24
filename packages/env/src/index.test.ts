import { describe, it, expect } from 'vitest';
import { parseEnv, envSchemas } from './index.js';

describe('env', () => {
  it('parses valid backend env', () => {
    const env = {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgres://localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      TWITCH_CLIENT_ID: 'id',
      TWITCH_CLIENT_SECRET: 'secret',
      TWITCH_REDIRECT_URI: 'http://localhost',
      DESKTOP_DEEP_LINK: 'streamerhub://auth/callback',
      JWT_SECRET: 'jwt-secret-123',
      SESSION_SECRET: 'session-secret-123',
      TOKEN_ENCRYPTION_KEY:
        '1234567890123456789012345678901234567890123456789012345678901234',
    };
    const parsed = parseEnv(envSchemas.backend, env);
    expect(parsed.PORT).toBe(3000);
  });
  it('throws on invalid env', () => {
    expect(() => parseEnv(envSchemas.backend, {})).toThrow(/DATABASE_URL/);
  });
});
