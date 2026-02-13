
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function checkMerchants() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM merchants");
    console.log("Merchants:", res.rows);
    
    // Check products count per merchant
    const prodRes = await client.query("SELECT merchant_id, COUNT(*) FROM products GROUP BY merchant_id");
    console.log("Products per merchant:", prodRes.rows);
    
    // Check embeddings count per merchant
    const embRes = await client.query("SELECT merchant_id, COUNT(*) FROM product_embeddings GROUP BY merchant_id");
    console.log("Embeddings per merchant:", embRes.rows);
    
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

checkMerchants();
