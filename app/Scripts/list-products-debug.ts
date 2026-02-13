
import { query } from "../utils/db.server";

async function listProducts() {
  try {
    const result = await query("SELECT shopify_id, title FROM products LIMIT 5", []);
    console.log("Existing Products:");
    result.rows.forEach((p: any) => {
      console.log(`- ID: ${p.shopify_id}, Title: ${p.title}`);
    });
  } catch (error) {
    console.error("Error listing products:", error);
  }
}

listProducts();
