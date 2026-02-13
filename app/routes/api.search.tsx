import type { Route } from "./+types/api.search";
import { searchProducts } from "~/services/embeddings.server";
import { query } from "~/utils/db.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  if (!q) {
    return Response.json(
      { error: "Query parameter required" },
      { status: 400 }
    );
  }

  try {
    // Get merchant ID
    const merchantResult = await query(
      "SELECT id FROM merchants WHERE shop_domain = $1",
      ["test-store.myshopify.com"]
    );

    const merchantId = merchantResult.rows[0].id;

    // Search products
    const results = await searchProducts(merchantId, q, 3);

    return Response.json({
      query: q,
      results: results.map((r: any) => ({
        title: r.metadata.title,
        price: r.metadata.price,
        similarity: r.similarity,
        content: r.content.substring(0, 200) + "...",
      })),
    });
  } catch (error: any) {
    console.error("Search error:", error);

    return Response.json(
      { error: "Search failed", details: error.message || error },
      { status: 500 }
    );
  }
}
