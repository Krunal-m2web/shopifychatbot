import { Queue } from 'bullmq';
import { redis } from './redis';

// Lazily create queues to avoid connecting on import
let _webhookQueue: Queue | null = null;
let _syncQueue: Queue | null = null;

function getWebhookQueue(): Queue {
  if (!_webhookQueue) {
    _webhookQueue = new Queue('webhooks', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 500,
        },
      },
    });
  }
  return _webhookQueue;
}

function getSyncQueue(): Queue {
  if (!_syncQueue) {
    _syncQueue = new Queue('sync', {
      connection: redis,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 50,
        },
        removeOnFail: {
          count: 200,
        },
      },
    });
  }
  return _syncQueue;
}

// Helper to enqueue a webhook processing job
export async function enqueueWebhookJob(payload: {
  topic: string;
  merchantId: string;
  shopifyId?: string;
  data: any;
}) {
  try {
    const job = await getWebhookQueue().add('process-webhook', payload, {
      jobId: `webhook-${payload.topic}-${payload.shopifyId || Date.now()}`,
    });
    return job;
  } catch (error) {
    console.error('Failed to enqueue webhook job:', error);
    throw error;
  }
}

// Helper to enqueue a sync job
export async function enqueueSyncJob(payload: {
  merchantId: string;
  shopDomain: string;
  syncType: 'full' | 'products' | 'collections' | 'policies';
}) {
  try {
    const job = await getSyncQueue().add('process-sync', payload, {
      jobId: `sync-${payload.merchantId}-${payload.syncType}-${Date.now()}`,
    });
    return job;
  } catch (error) {
    console.error('Failed to enqueue sync job:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeQueues() {
  if (_webhookQueue) await _webhookQueue.close();
  if (_syncQueue) await _syncQueue.close();
  await redis.quit();
}
