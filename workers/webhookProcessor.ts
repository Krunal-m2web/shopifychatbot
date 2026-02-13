import { Worker, Job } from 'bullmq';
import { redis } from '../app/lib/redis';
import { vectorStore } from '../app/services/vectorStore/index';
import { generateEmbedding } from '../app/services/rag/embeddings';
import prisma from '../app/db.server';

interface WebhookJobData {
  topic: string;
  merchantId: string;
  shopifyId?: string;
  data: any;
}

// Process webhook jobs
const webhookWorker = new Worker<WebhookJobData>(
  'webhooks',
  async (job: Job<WebhookJobData>) => {
    const { topic, merchantId, shopifyId, data } = job.data;

    console.log(`📦 Processing webhook: ${topic} for merchant ${merchantId}`);

    try {
      if (topic.startsWith('products/')) {
        await processProductWebhook(topic, merchantId, shopifyId!, data);
      } else if (topic.startsWith('collections/')) {
        await processCollectionWebhook(topic, merchantId, shopifyId!, data);
      } else {
        console.log(`⚠️  Unhandled webhook topic: ${topic}`);
      }

      console.log(`✅ Webhook processed: ${topic}`);
    } catch (error) {
      console.error(`❌ Webhook processing failed: ${topic}`, error);
      throw error; // Retry the job
    }
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

// Process product webhooks
async function processProductWebhook(
  topic: string,
  merchantId: string,
  shopifyId: string,
  product: any
) {
  if (topic === 'products/delete') {
    // Delete product from vector store
    await vectorStore.delete([`product-${shopifyId}`]);
    return;
  }

  // For create/update: build content and upsert
  const content = `
Product: ${product.title}
Price: ${product.variants?.[0]?.price || 'N/A'}
Description: ${product.body_html?.replace(/<[^>]*>/g, '') || 'No description'}
Vendor: ${product.vendor || 'Unknown'}
Type: ${product.product_type || 'General'}
Tags: ${product.tags || 'None'}
Status: ${product.status}
  `.trim();

  const embedding = await generateEmbedding(content);

  await vectorStore.upsert([
    {
      id: `product-${shopifyId}`,
      merchantId,
      content,
      embedding,
      docType: 'product',
      shopifyId,
      metadata: {
        title: product.title,
        price: product.variants?.[0]?.price,
        handle: product.handle,
        image: product.image?.src,
        inStock: product.variants?.some((v: any) => v.inventory_quantity > 0),
      },
    },
  ]);
}

// Process collection webhooks
async function processCollectionWebhook(
  topic: string,
  merchantId: string,
  shopifyId: string,
  collection: any
) {
  if (topic === 'collections/delete') {
    await vectorStore.delete([`collection-${shopifyId}`]);
    return;
  }

  const content = `
Collection: ${collection.title}
Description: ${collection.body_html?.replace(/<[^>]*>/g, '') || 'No description'}
  `.trim();

  const embedding = await generateEmbedding(content);

  await vectorStore.upsert([
    {
      id: `collection-${shopifyId}`,
      merchantId,
      content,
      embedding,
      docType: 'collection',
      shopifyId,
      metadata: {
        title: collection.title,
        handle: collection.handle,
      },
    },
  ]);
}

// Event handlers
webhookWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});

webhookWorker.on('error', (err) => {
  console.error('❌ Webhook worker error:', err);
});

export default webhookWorker;
