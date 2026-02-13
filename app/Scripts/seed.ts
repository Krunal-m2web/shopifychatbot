import "dotenv/config";
import { query } from "../utils/db.server";
import { syncAllProducts } from "../services/shopify-sync.server";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Use shop domain from environment or fallback
    let shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || "testing-m2web.myshopify.com";

    const existingMerchant = await query(
      "SELECT id, shop_domain FROM merchants WHERE shop_domain = $1",
      [shopDomain]
    );

    let merchantId: number;

    if (existingMerchant.rows.length > 0) {
      merchantId = existingMerchant.rows[0].id;
      shopDomain = existingMerchant.rows[0].shop_domain;
      console.log(`✅ Using existing merchant: ${shopDomain} (ID: ${merchantId})`);
    } else {
      const merchant = await query(
        "INSERT INTO merchants (shop_domain, shop_name) VALUES ($1, $2) RETURNING id, shop_domain",
        [shopDomain, "Shopify Store"]
      );
      merchantId = merchant.rows[0].id;
      shopDomain = merchant.rows[0].shop_domain;
      console.log(`✅ Created merchant: ${shopDomain} (ID: ${merchantId})`);
    }

    // Sync real products from Shopify
    console.log("📦 Syncing products from Shopify...");
    await syncAllProducts(shopDomain);

    console.log("✅ Database seeded with real Shopify data");
  } catch (error: any) {
    console.error("❌ Seed failed:", error.message);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
