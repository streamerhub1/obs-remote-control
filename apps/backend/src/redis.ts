import { Redis } from 'ioredis';

let _redis: Redis | null = null;

export function initRedis(url: string) {
  const opts: Record<string, unknown> = {};

  // Enable TLS for rediss:// connections (e.g. managed Redis providers)
  if (url.startsWith('rediss://')) {
    opts.tls = { rejectUnauthorized: false };
  }

  _redis = new Redis(url, opts);
  return _redis;
}

export function getRedis() {
  if (!_redis) throw new Error('Redis not initialized');
  return _redis;
}
