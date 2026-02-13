import "dotenv/config";
import { query } from "~/utils/db.server";

async function seeTestMerchant() {
  const shop = "test-simulation.myshopify.com";
  
  console.log(`🌱 Seeding test merchant: ${shop}`);
  
  try {
    await query(
      `INSERT INTO merchants (shop_domain, shop_name)
       VALUES ($1, 'Test Simulation Shop')
       ON CONFLICT (shop_domain) DO NOTHING`,
      [shop]
    );
    console.log("✅ Test merchant seeded.");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seeTestMerchant();
