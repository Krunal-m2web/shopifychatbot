import "dotenv/config";
import crypto from "crypto";

const webhookSecret = process.env.SHOPIFY_API_SECRET || "test-secret";

async function sendTestWebhook(topic: string, payload: any) {
  const body = JSON.stringify(payload);

  // Generate HMAC
  const hmac = crypto
    .createHmac("sha256", webhookSecret)
    .update(body, "utf8")
    .digest("base64");

  const webhookId = `test_${Date.now()}`;
  const baseUrl = process.env.APP_URL || "http://localhost:5173";

  try {
    const response = await fetch(`${baseUrl}/webhooks/receive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Topic": topic,
        "X-Shopify-Shop-Domain": "test-store.myshopify.com",
        "X-Shopify-Webhook-Id": webhookId,
        "X-Shopify-Hmac-Sha256": hmac,
        "X-Shopify-API-Version": "2024-01",
      },
      body,
    });

    if (!response.ok) {
      console.error(`❌ ${topic} failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`   Body: ${text}`);
      return;
    }

    const result = await response.json();
    console.log(`✅ ${topic}:`, result);
  } catch (error: any) {
    console.error(`❌ ${topic} error connecting to ${baseUrl}:`, error.message);
  }
}

async function runTests() {
  console.log("🧪 Testing webhooks...\n");

  // Test product create
  await sendTestWebhook("products/create", {
    id: "gid://shopify/Product/999",
    title: "Test Product",
    variants: [{ price: "99.99" }],
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Test product update
  await sendTestWebhook("products/update", {
    id: "gid://shopify/Product/1",
    title: "Updated Headphones",
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Test shop update
  await sendTestWebhook("shop/update", {
    name: "Updated Store Name",
    email: "updated@store.com",
  });

  console.log("\n✅ Test webhooks sent!");
  console.log("Check worker terminal for processing logs");
}

runTests().then(() => process.exit(0));
