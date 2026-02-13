import "dotenv/config";
import { query } from "../utils/db.server";

async function inspectTable() {
  console.log("🔍 Inspecting products table...");
  try {
    const result = await query("SELECT * FROM products LIMIT 0");
    console.log("Columns found:", result.fields.map(f => f.name).join(", "));
  } catch (error) {
    console.error("❌ Inspection failed:", error);
  } finally {
    process.exit(0);
  }
}

inspectTable();
