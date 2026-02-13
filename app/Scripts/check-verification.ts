import "dotenv/config";
import { query } from "~/utils/db.server";

async function checkVerification() {
  const shop = "test-simulation.myshopify.com";
  console.log(`Checking DB for shop: ${shop}`);

  const merchant = await query("SELECT * FROM merchants WHERE shop_domain = $1", [shop]);
  console.log("Merchant found:", merchant.rows.length > 0 ? "YES" : "NO");
  if (merchant.rows.length > 0) {
    console.log("Merchant ID:", merchant.rows[0].id);
  }

  const product = await query("SELECT * FROM products WHERE title = $1", ["Test Product from Simulation"]);
  console.log("Product found:", product.rows.length > 0 ? "YES" : "NO");
  if (product.rows.length > 0) {
    console.log("Product ID:", product.rows[0].id);
    console.log("Product details:", product.rows[0].title);
  } else {
    console.log("⚠️ Product not found yet. Worker might be processing or failed.");
  }
  
  process.exit(0);
}

checkVerification();
