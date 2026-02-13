
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function check() {
  const client = await pool.connect();
  try {
    const merchants = await client.query("SELECT * FROM merchants");
    console.log("Merchants:", merchants.rows);
    
    const conversations = await client.query("SELECT count(*) FROM conversation_analytics");
    console.log("Total Conversations:", conversations.rows[0].count);

    const metrics = await client.query("SELECT count(*) FROM dashboard_metrics");
    console.log("Total Metrics Days:", metrics.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
