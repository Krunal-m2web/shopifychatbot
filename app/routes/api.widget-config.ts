import type { LoaderFunctionArgs } from 'react-router';
import prisma from '~/db.server';

// CORS headers for cross-origin requests from storefront widget
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Get widget configuration for a merchant's store
 * GET /api/widget-config?shop=store.myshopify.com
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const shopDomain = url.searchParams.get('shop');

    if (!shopDomain) {
      return Response.json(
        { error: 'shop parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Look up merchant by shop domain
    const merchant = await prisma.merchant.findUnique({
      where: { shopDomain },
      select: {
        id: true,
        shopName: true,
        widgetConfig: true,
      },
    });

    if (!merchant) {
      return Response.json(
        { error: 'Merchant not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Return widget configuration
    return Response.json(
      {
        merchantId: merchant.id,
        shopName: merchant.shopName,
        config: merchant.widgetConfig,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Widget config error:', error);
    return Response.json(
      { error: 'Failed to fetch widget configuration' },
      { status: 500, headers: corsHeaders }
    );
  }
}
