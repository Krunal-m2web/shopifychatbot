import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '~/shopify.server';
import { enqueueSyncJob } from '~/lib/queue';
import { fullSync } from '~/services/sync';
import prisma from '~/db.server';

/**
 * Trigger a full sync of Shopify data to the vector store
 * POST /api/sync
 * Authenticated - merchant dashboard only
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { admin, session } = await authenticate.admin(request);

    const body = await request.json();
    const { background = false } = body;

    // Get merchant ID
    const merchant = await prisma.merchant.findUnique({
      where: { shopDomain: session.shop },
      select: { id: true },
    });

    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }

    if (background) {
      // Queue sync job for background processing
      await enqueueSyncJob({
        merchantId: merchant.id,
        shopDomain: session.shop,
        syncType: 'full',
      });

      return Response.json({
        success: true,
        message: 'Sync job queued',
        status: 'queued',
      });
    } else {
      // Run sync immediately (for manual dashboard triggers)
      const result = await fullSync(admin, merchant.id);

      return Response.json({
        success: true,
        message: 'Sync completed',
        status: 'completed',
        result,
      });
    }
  } catch (error) {
    console.error('Sync API error:', error);
    return Response.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}
