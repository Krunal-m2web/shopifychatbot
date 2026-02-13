
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function checkProducts() {
  const client = await pool.connect();
  try {
    // Check products for merchant 2
    const products = await client.query(
      "SELECT id, title, price, tags FROM products WHERE merchant_id = 2 LIMIT 10"
    );
    
    console.log(`Found ${products.rows.length} products for Merchant ID 2:`);
    products.rows.forEach(p => {
      console.log(`- ${p.title} ($${p.price})`);
      console.log(`  Tags: ${p.tags}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkProducts();
