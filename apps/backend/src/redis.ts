import { Redis } from 'ioredis';

let _redis: Redis | null = null;

export function initRedis(url: string) {
  _redis = new Redis(url);
  return _redis;
}

export function getRedis() {
  if (!_redis) throw new Error('Redis not initialized');
  return _redis;
}
