import { AdminApiContext } from '@shopify/shopify-app-react-router/server';
import { syncProducts, SyncResult } from './productSync';
import { syncCollections } from './collectionSync';
import { syncPolicies } from './policySync';

export interface FullSyncResult {
  products: SyncResult;
  collections: SyncResult;
  policies: SyncResult;
  totalSynced: number;
  totalErrors: number;
  totalDuration: number;
}

/**
 * Run a complete sync of all Shopify data to the vector store
 * @param admin Shopify Admin API context
 * @param merchantId Merchant UUID
 */
export async function fullSync(
  admin: AdminApiContext,
  merchantId: string
): Promise<FullSyncResult> {
  console.log(`🚀 Starting full sync for merchant ${merchantId}...`);

  const startTime = Date.now();

  // Run all syncs sequentially
  const products = await syncProducts(admin, merchantId);
  const collections = await syncCollections(admin, merchantId);
  const policies = await syncPolicies(admin, merchantId);

  const totalDuration = Date.now() - startTime;
  const totalSynced = products.synced + collections.synced + policies.synced;
  const totalErrors = products.errors + collections.errors + policies.errors;

  console.log(`✅ Full sync complete in ${totalDuration}ms`);
  console.log(`   Products: ${products.synced}, Collections: ${collections.synced}, Policies: ${policies.synced}`);
  console.log(`   Total synced: ${totalSynced}, Errors: ${totalErrors}`);

  return {
    products,
    collections,
    policies,
    totalSynced,
    totalErrors,
    totalDuration,
  };
}

// Re-export individual sync functions
export { syncProducts } from './productSync';
export { syncCollections } from './collectionSync';
export { syncPolicies } from './policySync';
export type { SyncResult } from './productSync';
