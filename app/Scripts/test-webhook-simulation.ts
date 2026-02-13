import "dotenv/config";
import { addWebhookJob } from "~/services/queue.server";

async function simulateWebhook() {
  console.log("🚀 Simulating 'products/create' webhook...");

  const mockPayload = {
    id: 987654321,
    title: "Test Product from Simulation",
    body_html: "This is a test product created via simulation script.",
    vendor: "Test Vendor",
    product_type: "Test Type",
    created_at: new Date().toISOString(),
    handle: "test-product-simulation",
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    template_suffix: null,
    status: "active",
    published_scope: "global",
    tags: "simulation, test",
    admin_graphql_api_id: "gid://shopify/Product/987654321",
    variants: [
      {
        id: 123456789,
        product_id: 987654321,
        title: "Default Title",
        price: "19.99",
        sku: "SIM-001",
        position: 1,
        inventory_policy: "deny",
        compare_at_price: null,
        fulfillment_service: "manual",
        inventory_management: "shopify",
        option1: "Default Title",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        taxable: true,
        barcode: "",
        grams: 100,
        image_id: null,
        weight: 0.1,
        weight_unit: "kg",
        inventory_item_id: 123456789,
        quantity_rule: {
          min: 1,
          max: null,
          increment: 1,
        },
        requires_shipping: true,
      },
    ],
    options: [
      {
        id: 123456789,
        product_id: 987654321,
        name: "Title",
        position: 1,
        values: ["Default Title"],
      },
    ],
    images: [],
    image: null,
  };

  const shop = "test-simulation.myshopify.com";
  const webhookId = `sim-${Date.now()}`;

  try {
    // 1. Queue logic
    await addWebhookJob(webhookId, "products/create", shop, mockPayload);
    console.log("✅ Simulation job added to queue.");
    console.log("Check the worker logs to see if it processes 'Test Product from Simulation'.");
    
    // Note: The worker needs to be running.
    // The worker will fail if it tries to fetch from Shopify since this is a fake shop.
    // However, shopify-sync.server.ts upsertProduct uses the payload directly mostly.
    // But syncAllProducts fetches. 
    // The webhook worker calls `upsertProduct(payload, shopDomain)`.
    // `upsertProduct` checks for merchant in DB.
    // So we need a merchant in DB for "test-simulation.myshopify.com".
    
  } catch (error) {
    console.error("❌ Simulation failed:", error);
  } finally {
    process.exit(0);
  }
}

simulateWebhook();
