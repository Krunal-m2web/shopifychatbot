import type { Route } from "./+types/api.orders.lookup";
import { findOrder } from "~/services/order-lookup.server";
import { formatOrderDetails } from "~/services/order-formatter.server";

export async function action({ request }: Route.ActionArgs) {
  try {
    const body = await request.json();
    const { orderNumber, email, zipCode } = body;

    // Validate
    if (!orderNumber) {
      return Response.json({ error: "Order number required" }, { status: 400 });
    }

    if (!email && !zipCode) {
      return Response.json(
        { error: "Email or ZIP code required" },
        { status: 400 }
      );
    }

    // Find order
    const order = await findOrder(
      parseInt(orderNumber),
      email?.trim(),
      zipCode?.trim()
    );

    if (!order) {
      return Response.json({
        success: false,
        message:
          "❌ Order not found or verification failed.\n\nPlease check:\n• Order number is correct\n• Email or ZIP matches your order",
      });
    }

    // Return formatted details
    return Response.json({
      success: true,
      message: formatOrderDetails(order),
      order: {
        number: order.order_number,
        status: order.fulfillment_status,
        total: order.total_price,
        hasTracking: order.fulfillments && order.fulfillments.length > 0,
        trackingCount: order.fulfillments?.length || 0,
      },
    });
  } catch (error) {
    console.error("Order lookup error:", error);

    return Response.json(
      { error: "Failed to lookup order" },
      { status: 500 }
    );
  }
}
