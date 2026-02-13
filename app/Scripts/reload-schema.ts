
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function reloadSchema() {
  const client = await pool.connect();
  try {
    console.log("Reloading PostgREST schema cache...");
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log("✅ Schema reload notification sent.");
  } catch (err) {
    console.error("Error reloading schema:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

reloadSchema();
