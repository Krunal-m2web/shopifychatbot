import { Worker, Job } from "bullmq";
import Redis from "ioredis";

import { query } from "../utils/pg.server";

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  connectTimeout: 5000, // 5 seconds timeout
});

connection.on("connect", () => console.log("📡 Redis: Connecting..."));
connection.on("ready", () => console.log("✨ Redis: Connected and Ready!"));
connection.on("error", (err) => console.error("❌ Redis: Connection Error:", err.message));
connection.on("reconnecting", () => console.log("🔄 Redis: Reconnecting..."));

// Webhook processors
import { upsertProduct, deleteProduct } from "./shopify-sync.server";

async function processProductCreate(payload: any, shopDomain: string) {
  console.log(`📦 Creating product: ${payload.title}`);
  await upsertProduct(payload, shopDomain);
}

async function processProductUpdate(payload: any, shopDomain: string) {
  console.log(`🔄 Updating product: ${payload.title}`);
  await upsertProduct(payload, shopDomain);
}

async function processProductDelete(payload: any, shopDomain: string) {
  console.log(`🗑️  Deleting product ID: ${payload.id}`);
  await deleteProduct(payload.id, shopDomain);
}

async function processCollectionUpdate(payload: any, shopDomain: string) {
  console.log(`📂 Collection updated: ${payload.title}`);

  // Update collection metadata
}

async function processAppUninstalled(payload: any, shopDomain: string) {
  console.log(`⚠️  App uninstalled from: ${shopDomain}`);

  // Clean up merchant data
  await query("UPDATE merchants SET installed_at = NULL WHERE shop_domain = $1", [
    shopDomain,
  ]);
}

async function processShopUpdate(payload: any, shopDomain: string) {
  console.log(`🏪 Shop updated: ${shopDomain}`);

  // Update shop metadata
  await query(
    `UPDATE merchants
     SET shop_name = $1, updated_at = CURRENT_TIMESTAMP
     WHERE shop_domain = $2`,
    [payload.name, shopDomain]
  );
}

// Main webhook processor
async function processWebhook(job: Job) {
  const { webhookId, topic, shopDomain, payload } = job.data;

  console.log(`\n🔔 Processing webhook: ${topic}`);
  console.log(`   Shop: ${shopDomain}`);
  console.log(`   Webhook ID: ${webhookId}`);

  // Check idempotency
  const existing = await query(
    "SELECT processed FROM webhook_logs WHERE webhook_id = $1",
    [webhookId]
  );

  if (existing.rows.length > 0 && existing.rows[0].processed) {
    console.log("⏭️  Already processed, skipping");
    return { skipped: true };
  }

  try {
    // Process based on topic
    switch (topic) {
      case "products/create":
        await processProductCreate(payload, shopDomain);
        break;

      case "products/update":
        await processProductUpdate(payload, shopDomain);
        break;

      case "products/delete":
        await processProductDelete(payload, shopDomain);
        break;

      case "collections/update":
        await processCollectionUpdate(payload, shopDomain);
        break;

      case "app/uninstalled":
        await processAppUninstalled(payload, shopDomain);
        break;

      case "shop/update":
        await processShopUpdate(payload, shopDomain);
        break;

      default:
        console.log(`⚠️  Unknown topic: ${topic}`);
    }

    // Mark as processed
    await query(
      `UPDATE webhook_logs
       SET processed = true, processed_at = CURRENT_TIMESTAMP
       WHERE webhook_id = $1`,
      [webhookId]
    );

    console.log("✅ Webhook processed successfully");
    return { success: true };
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error);

    // Log error
    // Log error with Upsert
    await query(
      `INSERT INTO webhook_logs (webhook_id, topic, shop_domain, payload, error, retry_count, processed)
       VALUES ($1, $2, $3, $4, $5, 1, false)
       ON CONFLICT (webhook_id) 
       DO UPDATE SET 
         error = EXCLUDED.error,
         retry_count = webhook_logs.retry_count + 1`,
      [webhookId, topic, shopDomain, payload, error.message]
    );

    throw error; // Re-throw for BullMQ retry
  }
}

// Create and start worker
export const webhookWorker = new Worker("webhooks", processWebhook, {
  connection,
  concurrency: 5, // Process 5 jobs concurrently
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000, // Per second
  },
});

// Worker event handlers
webhookWorker.on("completed", (job) => {
  console.log(`✅ Worker completed job ${job.id}`);
});

webhookWorker.on("failed", (job, error) => {
  console.error(`❌ Worker failed job ${job?.id}: ${error.message}`);
});

webhookWorker.on("error", (error) => {
  console.error("❌ Worker error:", error);
});

console.log("🚀 Webhook worker started");
