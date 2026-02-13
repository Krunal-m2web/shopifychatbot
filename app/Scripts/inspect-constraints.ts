import "dotenv/config";
import { query } from "../utils/db.server";

async function inspectConstraints() {
  console.log("🔍 Inspecting unique constraints for products table...");
  try {
    const result = await query(`
      SELECT
          tc.constraint_name, kcu.column_name
      FROM
          information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE' AND tc.table_name = 'products';
    `);
    console.log("Unique constraints found:");
    result.rows.forEach(r => {
      console.log(`  ${r.constraint_name}: ${r.column_name}`);
    });
    
    const pkResult = await query(`
      SELECT
          tc.constraint_name, kcu.column_name
      FROM
          information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = 'products';
    `);
    console.log("Primary key found:");
    pkResult.rows.forEach(r => {
      console.log(`  ${r.constraint_name}: ${r.column_name}`);
    });
  } catch (error) {
    console.error("❌ Inspection failed:", error);
  } finally {
    process.exit(0);
  }
}

inspectConstraints();
