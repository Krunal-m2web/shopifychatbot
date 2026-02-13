// IMPORTANT: Import env loader first to ensure environment variables are loaded
import './env.js';
import Redis from 'ioredis';

// Lazy initialization to allow environment variables to load first
let _redis: Redis | null = null;

function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

function initializeRedis(): Redis {
  const redisUrl = getRedisUrl();
  console.log(`🔗 Connecting to Redis: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`); // Hide password in log

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 10000,
    retryStrategy(times) {
      if (times > 3) return null; // Stop after 3 retries
      return Math.min(times * 500, 2000);
    },
    reconnectOnError(err) {
      // Reconnect on connection reset errors
      return err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT');
    },
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
  });

  // Connection event handlers
  client.on('connect', () => {
    console.log('✅ Redis connected');
  });

  client.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
  });

  return client;
}

// Lazy-loaded Redis client using Proxy
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    if (!_redis) {
      _redis = initializeRedis();
    }
    return (_redis as any)[prop];
  },
  apply(_target, _thisArg, args) {
    if (!_redis) {
      _redis = initializeRedis();
    }
    return (_redis as any)(...args);
  }
});
