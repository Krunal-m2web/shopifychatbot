/**
 * Format order status into a human-readable message
 */
export function formatOrderStatus(order: any): string {
  const orderNumber = order.name || order.id;
  const financialStatus = order.financialStatus || 'PENDING';
  const fulfillmentStatus = order.fulfillmentStatus || 'UNFULFILLED';

  // Build status message
  let statusMessage = `Order ${orderNumber}\n\n`;

  // Financial status
  switch (financialStatus) {
    case 'PAID':
      statusMessage += '✅ Payment confirmed\n';
      break;
    case 'PENDING':
      statusMessage += '⏳ Payment pending\n';
      break;
    case 'REFUNDED':
      statusMessage += '💰 Refunded\n';
      break;
    case 'PARTIALLY_REFUNDED':
      statusMessage += '💰 Partially refunded\n';
      break;
    default:
      statusMessage += `Payment status: ${financialStatus}\n`;
  }

  // Fulfillment status
  switch (fulfillmentStatus) {
    case 'FULFILLED':
      statusMessage += '📦 Order shipped\n';
      break;
    case 'UNFULFILLED':
      statusMessage += '📋 Order being prepared\n';
      break;
    case 'PARTIALLY_FULFILLED':
      statusMessage += '📦 Partially shipped\n';
      break;
    default:
      statusMessage += `Fulfillment: ${fulfillmentStatus}\n`;
  }

  // Add items
  const items = order.lineItems?.edges || [];
  if (items.length > 0) {
    statusMessage += '\nItems:\n';
    items.forEach((edge: any) => {
      const item = edge.node;
      statusMessage += `• ${item.title} (Qty: ${item.quantity})\n`;
    });
  }

  // Add tracking info if available
  const fulfillments = order.fulfillments || [];
  const trackingInfo = fulfillments.find((f: any) => f.trackingInfo?.number);

  if (trackingInfo?.trackingInfo) {
    statusMessage += `\n📍 Tracking: ${trackingInfo.trackingInfo.number}`;
    if (trackingInfo.trackingInfo.url) {
      statusMessage += `\nTrack your package: ${trackingInfo.trackingInfo.url}`;
    }
  }

  // Add shipping address
  if (order.shippingAddress) {
    const addr = order.shippingAddress;
    statusMessage += `\n\nShipping to:\n${addr.address1}\n${addr.city}, ${addr.province} ${addr.zip}`;
  }

  // Order total
  if (order.totalPrice) {
    statusMessage += `\n\nTotal: $${order.totalPrice}`;
  }

  return statusMessage;
}

/**
 * Get a simple status summary for display
 */
export function getStatusSummary(order: any): string {
  const fulfillmentStatus = order.fulfillmentStatus || 'UNFULFILLED';

  switch (fulfillmentStatus) {
    case 'FULFILLED':
      return 'Shipped';
    case 'UNFULFILLED':
      return 'Processing';
    case 'PARTIALLY_FULFILLED':
      return 'Partially Shipped';
    case 'ON_HOLD':
      return 'On Hold';
    case 'SCHEDULED':
      return 'Scheduled';
    default:
      return fulfillmentStatus;
  }
}
