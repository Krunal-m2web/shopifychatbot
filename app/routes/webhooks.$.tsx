import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { addWebhookJob } from "~/services/queue.server";
import { query } from "~/utils/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!payload) {
    return new Response("No payload found", { status: 400 });
  }

  console.log(`\n📨 Webhook received: ${topic}`);
  console.log(`   Shop: ${shop}`);

  // Log webhook (idempotency)
  // We use the shopify header 'X-Shopify-Webhook-Id' but authenticate.webhook doesn't return it directly in the destructured object?
  // It returns the payload. The ID is usually in the header.
  // We can get it from request.headers.get("X-Shopify-Webhook-Id");
  const webhookId = request.headers.get("X-Shopify-Webhook-Id") || `unknown-${Date.now()}`;

  try {
    await query(
      `INSERT INTO webhook_logs (webhook_id, topic, shop_domain, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (webhook_id) DO NOTHING`,
      [webhookId, topic, shop, payload]
    );
  } catch (dbError) {
    console.error("⚠️  Failed to log webhook to DB:", dbError);
  }

  // Queue the job
  try {
    await addWebhookJob(webhookId, topic, shop, payload);
    console.log(`✅ Webhook queued: ${webhookId}`);
  } catch (queueError) {
    console.error("⚠️  Failed to queue webhook:", queueError);
    return new Response("Failed to queue", { status: 500 });
  }

  return new Response("Webhook processed", { status: 200 });
};
