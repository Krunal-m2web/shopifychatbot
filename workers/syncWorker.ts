import { Worker, Job } from 'bullmq';
import { redis } from '../app/lib/redis';
import shopify from '../app/shopify.server';
import { fullSync } from '../app/services/sync/index';
import { syncProducts } from '../app/services/sync/productSync';
import { syncCollections } from '../app/services/sync/collectionSync';
import { syncPolicies } from '../app/services/sync/policySync';
import prisma from '../app/db.server';

interface SyncJobData {
  merchantId: string;
  shopDomain: string;
  syncType: 'full' | 'products' | 'collections' | 'policies';
}

// Process sync jobs
const syncWorker = new Worker<SyncJobData>(
  'sync',
  async (job: Job<SyncJobData>) => {
    const { merchantId, shopDomain, syncType } = job.data;

    console.log(`🔄 Starting ${syncType} sync for merchant ${merchantId} (${shopDomain})`);

    try {
      // Get merchant session
      const session = await prisma.session.findFirst({
        where: { shop: shopDomain },
      });

      if (!session) {
        throw new Error(`No session found for shop: ${shopDomain}`);
      }

      // Get Shopify admin client
      const { admin } = await shopify.authenticate.admin({
        session: {
          shop: session.shop,
          accessToken: session.accessToken,
          state: session.state,
          isOnline: session.isOnline === 1,
          id: session.id,
        },
      } as any);

      // Run the appropriate sync
      let result;
      switch (syncType) {
        case 'full':
          result = await fullSync(admin, merchantId);
          break;
        case 'products':
          result = await syncProducts(admin, merchantId);
          break;
        case 'collections':
          result = await syncCollections(admin, merchantId);
          break;
        case 'policies':
          result = await syncPolicies(admin, merchantId);
          break;
        default:
          throw new Error(`Unknown sync type: ${syncType}`);
      }

      console.log(`✅ ${syncType} sync completed for ${shopDomain}:`, result);

      // Update merchant's last sync time
      await prisma.merchant.update({
        where: { id: merchantId },
        data: {
          updatedAt: new Date(),
          settings: {
            lastSync: new Date().toISOString(),
            lastSyncResult: result,
          },
        },
      });

      return result;
    } catch (error) {
      console.error(`❌ Sync failed for ${shopDomain}:`, error);
      throw error; // Retry the job
    }
  },
  {
    connection: redis,
    concurrency: 2, // Process up to 2 sync jobs concurrently (sync is heavy)
  }
);

// Event handlers
syncWorker.on('completed', (job, result) => {
  console.log(`✅ Sync job ${job.id} completed:`, result);
});

syncWorker.on('failed', (job, err) => {
  console.error(`❌ Sync job ${job?.id} failed:`, err);
});

syncWorker.on('error', (err) => {
  console.error('❌ Sync worker error:', err);
});

export default syncWorker;
