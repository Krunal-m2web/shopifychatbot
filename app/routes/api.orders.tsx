import type { Route } from "./+types/api.orders";
import { findOrder } from "~/services/order-lookup.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const orderNumberStr = url.searchParams.get("orderNumber");
  const email = url.searchParams.get("email");
  const zipCode = url.searchParams.get("zipCode");

  if (!orderNumberStr) {
    return Response.json({ error: "Order number is required" }, { status: 400 });
  }

  const orderNumber = parseInt(orderNumberStr, 10);
  if (isNaN(orderNumber)) {
    return Response.json({ error: "Invalid order number" }, { status: 400 });
  }

  if (!email && !zipCode) {
    return Response.json(
      { error: "Email or Zip Code is required for verification" },
      { status: 400 }
    );
  }

  const order = await findOrder(orderNumber, email || undefined, zipCode || undefined);

  if (!order) {
    return Response.json({ error: "Order not found or verification failed" }, { status: 404 });
  }

  return Response.json({ order });
}
