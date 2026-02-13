import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";

// Create Redis connection (Singleton for development)
const redisOptions = {
  maxRetriesPerRequest: null,
  connectTimeout: 10000, // Increased to 10 seconds
  tls: process.env.REDIS_URL?.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
};

let connection: Redis;

declare global {
  var __redis: Redis | undefined;
}

if (process.env.NODE_ENV === "production") {
  connection = new Redis(process.env.REDIS_URL!, redisOptions);
} else {
  if (!global.__redis) {
    const url = process.env.REDIS_URL?.trim();
    const host = url?.split("@")[1] || "unknown";
    console.log(`🔌 Redis Initializing with host: ${host}`);
    global.__redis = new Redis(url!, redisOptions);
  }
  connection = global.__redis;
}

connection.on("connect", () => console.log("📡 Queue Redis: Connecting..."));
connection.on("ready", () => console.log("✨ Queue Redis: Connected and Ready!"));
connection.on("error", (err) => console.error("❌ Queue Redis: Error:", err.message));

// Create webhook queue
export const webhookQueue = new Queue("webhooks", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Queue events for monitoring
export const webhookQueueEvents = new QueueEvents("webhooks", { connection });

// Listen to queue events
webhookQueueEvents.on("completed", ({ jobId }: { jobId: string }) => {
  console.log(`✅ Job ${jobId} completed`);
});

webhookQueueEvents.on("failed", ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
  console.error(`❌ Job ${jobId} failed: ${failedReason}`);
});

// Add job to queue
export async function addWebhookJob(
  webhookId: string,
  topic: string,
  shopDomain: string,
  payload: any
) {
  return await webhookQueue.add(
    topic,
    {
      webhookId,
      topic,
      shopDomain,
      payload,
      receivedAt: new Date().toISOString(),
    },
    {
      jobId: webhookId, // Use webhook ID for deduplication
    }
  );
}

// Get queue metrics
export async function getQueueMetrics() {
  const waiting = await webhookQueue.getWaitingCount();
  const active = await webhookQueue.getActiveCount();
  const completed = await webhookQueue.getCompletedCount();
  const failed = await webhookQueue.getFailedCount();

  return { waiting, active, completed, failed };
}
