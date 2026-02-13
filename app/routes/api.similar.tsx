import type { Route } from "./+types/api.similar";
import { findSimilarProducts } from "~/services/similar-products.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const merchantId = url.searchParams.get("merchantId");
  const sessionId = url.searchParams.get("sessionId");
  const limit = parseInt(url.searchParams.get("limit") || "5");

  if (!productId || !merchantId) {
    return Response.json(
      { error: "productId and merchantId are required" },
      { status: 400 }
    );
  }

  try {
    const similarProducts = await findSimilarProducts(
      parseInt(merchantId),
      productId,
      sessionId || undefined,
      { limit }
    );

    return Response.json({
      productId,
      similarProducts,
      count: similarProducts.length,
    });
  } catch (error: any) {
    console.error("Similar products API error:", error);

    return Response.json(
      {
        error: "Failed to find similar products",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
