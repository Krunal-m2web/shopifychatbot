import shopify from "../shopify.server";
import { query } from "../utils/pg.server";

// Find order with secure verification from real Shopify API
export async function findOrder(
  orderNumber: number,
  email?: string,
  zipCode?: string
): Promise<any | null> {
  try {
    // Get merchant to retrieve shop domain
    const merchantResult = await query(
      "SELECT shop_domain FROM merchants LIMIT 1"
    );

    if (merchantResult.rows.length === 0) {
      console.error("❌ No merchant found in database");
      return null;
    }

    const shopDomain = merchantResult.rows[0].shop_domain;

    // Get Shopify admin client
    const { admin } = await shopify.unauthenticated.admin(shopDomain);

    if (!admin) {
      console.error(`❌ No session found for shop ${shopDomain}`);
      return null;
    }

    // Fetch order by order number using REST API
    const response: any = await (admin as any).rest.get({
      path: "orders",
      query: { name: `#${orderNumber}`, status: "any" },
    });

    const orders = response.body.orders;

    if (!orders || orders.length === 0) {
      return null;
    }

    const order = orders[0];

    // Verify ownership with email OR zip code
    if (email) {
      const emailMatch = order.email?.toLowerCase() === email.toLowerCase();
      return emailMatch ? order : null;
    }

    if (zipCode) {
      const zipMatch = order.billing_address?.zip === zipCode;
      return zipMatch ? order : null;
    }

    // No verification provided
    return null;
  } catch (error: any) {
    console.error("❌ Error fetching order from Shopify:", error.message);
    return null;
  }
}

// Get all orders for a shop (for testing/admin purposes)
export async function getAllOrders(shopDomain: string, limit: number = 50) {
  try {
    const { admin } = await shopify.unauthenticated.admin(shopDomain);

    if (!admin) {
      throw new Error(`No session found for shop ${shopDomain}`);
    }

    const response: any = await (admin as any).rest.get({
      path: "orders",
      query: { limit, status: "any" },
    });

    return response.body.orders || [];
  } catch (error: any) {
    console.error("❌ Error fetching orders from Shopify:", error.message);
    return [];
  }
}
