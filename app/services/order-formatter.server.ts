// Convert Shopify status to human-friendly text
export function formatOrderStatus(fulfillmentStatus: string): string {
  const statusMap: Record<string, string> = {
    fulfilled: "Delivered",
    partial: "Partially Shipped",
    unfulfilled: "Processing",
    restocked: "Cancelled",
  };

  return statusMap[fulfillmentStatus] || "Unknown";
}

export function formatOrderDetails(order: any): string {
  const status = formatOrderStatus(order.fulfillment_status);
  const statusMessage = getStatusMessage(order.fulfillment_status);
  const orderDate = formatOrderDate(order.created_at);

  let details = `📦 **Order #${order.order_number}**\n\n`;

  details += `${statusMessage}\n\n`;

  details += `**Order Details:**\n`;
  details += `• Status: ${status}\n`;
  details += `• Order Date: ${orderDate}\n`;
  details += `• Total: $${order.total_price}\n\n`;

  // Format line items
  details += `**Items Ordered:**\n`;
  order.line_items.forEach((item: any) => {
    details += `• ${item.quantity}x ${item.title} - $${item.price}\n`;
  });

  // Add tracking information
  details += `\n`;
  details += formatTrackingInfo(order.fulfillments);

  return details;
}



// Get a descriptive message for the status
export function getStatusMessage(fulfillmentStatus: string): string {
  const messages: Record<string, string> = {
    fulfilled: "✅ Your order has been delivered!",
    partial: "📦 Part of your order has been shipped.",
    unfulfilled: "⏳ We're preparing your order for shipment.",
    restocked: "❌ This order was cancelled.",
  };

  return messages[fulfillmentStatus] || "Order status is being updated.";
}

// Format the order date
export function formatOrderDate(dateString: string): string {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTrackingInfo(fulfillments: any[]): string {
  if (!fulfillments || fulfillments.length === 0) {
    return "📭 No tracking information available yet. You'll receive an email when your order ships.";
  }

  let tracking = "\n**Tracking Information:**\n";

  fulfillments.forEach((fulfillment, index) => {
    const shipmentNum =
      fulfillments.length > 1 ? ` (Shipment ${index + 1})` : "";

    tracking += `\n🚚 ${fulfillment.tracking_company}${shipmentNum}\n`;
    tracking += `• Tracking Number: ${fulfillment.tracking_number}\n`;
    tracking += `• Status: ${formatTrackingStatus(fulfillment.status)}\n`;
    tracking += `• Track Package: ${fulfillment.tracking_url}\n`;
  });

  return tracking;
}

function formatTrackingStatus(status: string): string {
  const statusMap: Record<string, string> = {
    in_transit: "In Transit 🚛",
    out_for_delivery: "Out for Delivery 🚚",
    delivered: "Delivered ✅",
    attempted_delivery: "Delivery Attempted 📦",
    failure: "Delivery Issue ⚠️",
  };

  return statusMap[status] || "Processing";
}

