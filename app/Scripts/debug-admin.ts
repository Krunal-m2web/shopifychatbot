import "dotenv/config";
import shopify from "../shopify.server";

async function debugAdmin() {
  const shop = "my-test-shop-123465.myshopify.com";
  console.log(`🔍 Debugging admin context for ${shop}...`);
  try {
    const { admin } = await shopify.unauthenticated.admin(shop);
    console.log("Admin object keys:", Object.keys(admin));
    if ((admin as any).rest) {
      console.log("✅ admin.rest exists");
    } else {
      console.log("❌ admin.rest is UNDEFINED");
      // Check for other properties
      if ((admin as any).graphql) console.log("✅ admin.graphql exists");
    }
  } catch (error) {
    console.error("❌ Debug failed:", error);
  } finally {
    process.exit(0);
  }
}

debugAdmin();
