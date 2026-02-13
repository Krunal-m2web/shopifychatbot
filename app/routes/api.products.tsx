import type { Route } from "./+types/api.products";
import { query } from "../utils/db.server";

export async function loader({ request }: Route.LoaderArgs) {
  const result = await query("SELECT * FROM products ORDER BY created_at DESC");

  return Response.json({ products: result.rows });
}
