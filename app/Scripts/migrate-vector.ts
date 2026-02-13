
import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function migrateVectorSchema() {
  const client = await pool.connect();
  try {
    console.log("Reading schema file...");
    const schemaPath = path.join(process.cwd(), "supabase-setup.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");

    console.log("Applying Vector Database Schema Migration...");
    
    // We need to drop the table if it exists to ensure the new columns (fts) are created correctly 
    // AND to avoid "relation already exists" errors if we just ran the CREATE TABLE part.
    // However, dropping it deletes data. Since this is dev/test, it's fine to re-seed.
    // BUT to be safe, let's try to ALTER first or just run the full script if it's idempotent.
    // The script uses CREATE IF NOT EXISTS.
    // The issue is adding the generated column.
    
    // Let's modify the checks.
    
    // Strategy: Just run the SQL. It has DROP FUNCTION/POLICY which handles updates.
    // For the table, we might need to manually add the column if it exists.
    
    // Simplest approach for this dev environment: Drop and Re-create to ensure clean state.
    await client.query("DROP TABLE IF EXISTS product_embeddings CASCADE");
    console.log("Dropped existing product_embeddings table.");
    
    await client.query(schemaSql);
    console.log("✅ Schema applied successfully!");

    console.log("⚠️ NOTE: You will need to re-generate embeddings as the table was recreated.");

  } catch (err) {
    console.error("Error migrating schema:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateVectorSchema();
