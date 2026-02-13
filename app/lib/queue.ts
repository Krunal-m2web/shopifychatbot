import { Queue } from 'bullmq';
import { redis } from './redis';

// Create BullMQ queues
export const webhookQueue = new Queue('webhooks', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
    },
  },
});

export const syncQueue = new Queue('sync', {
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

// Helper to enqueue a webhook processing job
export async function enqueueWebhookJob(payload: {
  topic: string;
  merchantId: string;
  shopifyId?: string;
  data: any;
}) {
  const job = await webhookQueue.add('process-webhook', payload, {
    jobId: `webhook-${payload.topic}-${payload.shopifyId || Date.now()}`,
  });

  return job;
}

// Helper to enqueue a sync job
export async function enqueueSyncJob(payload: {
  merchantId: string;
  shopDomain: string;
  syncType: 'full' | 'products' | 'collections' | 'policies';
}) {
  const job = await syncQueue.add('process-sync', payload, {
    jobId: `sync-${payload.merchantId}-${payload.syncType}-${Date.now()}`,
  });

  return job;
}

// Graceful shutdown
export async function closeQueues() {
  await webhookQueue.close();
  await syncQueue.close();
  await redis.quit();
}
