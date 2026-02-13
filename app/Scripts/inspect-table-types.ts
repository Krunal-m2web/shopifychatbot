import "dotenv/config";
import { query } from "../utils/db.server";

async function inspectTableTypes() {
  console.log("🔍 Inspecting shopify_sessions column types...");
  try {
    const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shopify_sessions'
    `);
    console.log("Column types:");
    result.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type}`);
    });
  } catch (error) {
    console.error("❌ Inspection failed:", error);
  } finally {
    process.exit(0);
  }
}

inspectTableTypes();
