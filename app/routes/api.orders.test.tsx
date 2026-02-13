import type { Route } from "./+types/api.orders.test";

export async function loader({ request }: Route.LoaderArgs) {
  return Response.json({
    ok: true,
    message: "Orders Test API is active.",
    testCases: [
      {
        description: "Find order 1001 with correct email",
        url: "/api/orders?orderNumber=1001&email=john.doe@example.com"
      },
      {
        description: "Find order 1002 with correct zip",
        url: "/api/orders?orderNumber=1002&zipCode=90210"
      },
      {
        description: "Fail verification for order 1003",
        url: "/api/orders?orderNumber=1003&email=wrong@example.com"
      }
    ]
  });
}
