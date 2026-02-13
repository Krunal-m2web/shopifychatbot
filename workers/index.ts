// Environment variables are loaded automatically when importing workers (via redis.ts → env.ts)
import webhookWorker from './webhookProcessor.js';
import syncWorker from './syncWorker.js';

console.log('🚀 Starting BullMQ workers...');
console.log(`📍 Redis: ${process.env.REDIS_URL ? '✓ Configured' : '✗ Not set'}`);
console.log('');

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down workers...');

  try {
    await webhookWorker.close();
    await syncWorker.close();
    console.log('✅ Workers shut down gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('✅ Workers started:');
console.log('   - Webhook processor (concurrency: 5)');
console.log('   - Sync worker (concurrency: 2)');
console.log('');
console.log('Press Ctrl+C to stop');
