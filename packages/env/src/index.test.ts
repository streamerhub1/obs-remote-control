import { describe, it, expect } from 'vitest';
import { parseEnv, envSchemas } from './index.js';

describe('env', () => {
  it('parses valid backend env', () => {
    const env = { DATABASE_URL: 'postgres://a', REDIS_URL: 'redis://b' };
    const parsed = parseEnv(envSchemas.backend, env);
    expect(parsed.PORT).toBe(3000);
  });
  it('throws on invalid env', () => {
    expect(() => parseEnv(envSchemas.backend, {})).toThrow(/DATABASE_URL/);
  });
});
