import { AdminApiContext } from '@shopify/shopify-app-remix/server';

export interface OrderLookupResult {
  found: boolean;
  order?: any;
  error?: string;
}

/**
 * Look up an order by order number and verify customer email
 * @param admin Shopify Admin API context
 * @param orderNumber Order number (e.g., "#1001")
 * @param customerEmail Customer's email for verification
 */
export async function lookupOrder(
  admin: AdminApiContext['admin'],
  orderNumber: string,
  customerEmail: string
): Promise<OrderLookupResult> {
  try {
    // Remove # prefix if present
    const cleanOrderNumber = orderNumber.replace('#', '');

    const response = await admin.graphql(
      `#graphql
        query getOrder($query: String!) {
          orders(first: 1, query: $query) {
            edges {
              node {
                id
                name
                email
                createdAt
                totalPrice
                financialStatus
                fulfillmentStatus
                shippingAddress {
                  address1
                  city
                  province
                  zip
                  country
                }
                lineItems(first: 10) {
                  edges {
                    node {
                      title
                      quantity
                      originalUnitPrice
                    }
                  }
                }
                fulfillments(first: 5) {
                  trackingInfo {
                    number
                    url
                    company
                  }
                  status
                }
              }
            }
          }
        }
      `,
      {
        variables: {
          query: `name:${cleanOrderNumber}`,
        },
      }
    );

    const data = await response.json();
    const orders = data.data?.orders?.edges || [];

    if (orders.length === 0) {
      return {
        found: false,
        error: `Order ${orderNumber} not found`,
      };
    }

    const order = orders[0].node;

    // Verify email matches (case-insensitive)
    if (order.email?.toLowerCase() !== customerEmail.toLowerCase()) {
      return {
        found: false,
        error: 'Email does not match order records',
      };
    }

    return {
      found: true,
      order,
    };
  } catch (error) {
    console.error('Order lookup error:', error);
    return {
      found: false,
      error: 'Unable to look up order at this time',
    };
  }
}
