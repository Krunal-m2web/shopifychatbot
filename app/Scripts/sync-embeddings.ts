import "dotenv/config";
import { query } from "../utils/db.server";
import { syncAllProducts } from "../services/shopify-sync.server";

async function syncEmbeddings() {
  try {
    console.log("🔄 Starting embedding sync...");

    // Get merchant
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || "my-test-shop-123465.myshopify.com";
    console.log(`🔍 Looking for merchant with domain: ${shopDomain}`);

    const merchantResult = await query(
      "SELECT id, shop_domain FROM merchants WHERE shop_domain = $1",
      [shopDomain]
    );

    if (merchantResult.rows.length === 0) {
      console.error("❌ No merchant found. Run seed first.");
      process.exit(1);
    }

    const merchantId = merchantResult.rows[0].id;
    // shopDomain is already declared above from process.env

    console.log(`📡 Syncing products and embeddings for: ${shopDomain}`);

    // Clear existing embeddings first to remove stale data
    console.log("🧹 Clearing existing embeddings...");
    const { vectorStore } = await import("../services/vector-store.server");
    await vectorStore.deleteDocuments(merchantId);

    // Sync all products from Shopify (this will also generate embeddings)
    await syncAllProducts(shopDomain);

    console.log(`✅ Synced products and embeddings from real Shopify data`);
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Sync failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

syncEmbeddings();
