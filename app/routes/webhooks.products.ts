import { type ActionFunctionArgs } from 'react-router';
import { authenticate } from '~/shopify.server';
import { enqueueWebhookJob } from '~/lib/queue';
import prisma from '~/db.server';

/**
 * Handle Shopify product webhooks (create/update/delete)
 * POST /webhooks/products
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { topic, shop, session, payload } = await authenticate.webhook(request);

    console.log(`📦 Received webhook: ${topic} from ${shop}`);

    // Get merchant ID
    const merchant = await prisma.merchant.findUnique({
      where: { shopDomain: shop },
      select: { id: true },
    });

    if (!merchant) {
      console.warn(`⚠️ Webhook received for unknown shop: ${shop}`);
      return new Response('OK', { status: 200 });
    }

    // Queue the webhook for background processing
    await enqueueWebhookJob({
      topic,
      merchantId: merchant.id,
      shopifyId: payload.id,
      data: payload,
    });

    console.log(`✅ Webhook queued for processing: ${topic}`);

    // Return 200 immediately to avoid Shopify timeout
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to avoid Shopify retries
    return new Response('OK', { status: 200 });
  }
}
