// IMPORTANT: Import env loader first to ensure environment variables are loaded
import './env.js';
import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';

// Lazy initialization to allow environment variables to load first
let _redis: Redis | null = null;

function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

export function getRedisOptions(): RedisOptions {
  const redisUrl = getRedisUrl();
  return {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    connectTimeout: 10000,
    retryStrategy(times) {
      const delay = Math.min(times * 500, 5000);
      console.log(`🔄 Redis retry attempt ${times}, next in ${delay}ms`);
      return delay;
    },
    reconnectOnError(err) {
      return err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT');
    },
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
  };
}

function initializeRedis(): Redis {
  const redisUrl = getRedisUrl();
  console.log(`🔗 Connecting to Redis: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);

  const client = new Redis(redisUrl, getRedisOptions());

  client.on('connect', () => {
    console.log('✅ Redis connected');
  });

  client.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
  });

  client.on('close', () => {
    console.warn('⚠️ Redis connection closed');
  });

  return client;
}

export function getRedis(): Redis {
  if (!_redis) {
    _redis = initializeRedis();
  }
  return _redis;
}

// For backwards compatibility - direct export as a lazy getter
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getRedis() as any)[prop];
  },
});
