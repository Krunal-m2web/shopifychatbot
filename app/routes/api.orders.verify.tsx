import type { Route } from "./+types/api.orders.verify";
import { findOrder } from "~/services/order-lookup.server";
import { formatOrderDetails } from "~/services/order-formatter.server";

export async function action({ request }: Route.ActionArgs) {
  try {
    const body = await request.json();
    const { orderNumber, email, zipCode } = body;

    // Validate input
    if (!orderNumber) {
      return Response.json(
        { error: "Order number is required" },
        { status: 400 }
      );
    }

    if (!email && !zipCode) {
      return Response.json(
        { error: "Email or ZIP code is required for verification" },
        { status: 400 }
      );
    }

    // Find and verify order
    const order = await findOrder(
      parseInt(orderNumber),
      email?.trim(),
      zipCode?.trim()
    );

    if (!order) {
      return Response.json({
        success: false,
        message:
          "Order not found. Please check your order number and verification details.",
      });
    }

    // ✅ Format full order details
    const formattedDetails = formatOrderDetails(order);

    // ✅ Return formatted message + order info
    return Response.json({
      success: true,
      message: formattedDetails,
      order: {
        number: order.order_number,
        status: order.fulfillment_status,
        total: order.total_price,
      },
      verified: true,
    });
  } catch (error) {
    console.error("Verification error:", error);

    return Response.json({ error: "Verification failed" }, { status: 500 });
  }
}
