
import "dotenv/config";
import pg from "pg";
import { generateProductEmbeddings } from "~/services/embeddings.server";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Fetching products for Merchant ID 2...");
    
    // Get products
    const result = await client.query(
      `SELECT 
        id, 
        merchant_id, 
        shopify_id as "id", 
        title, 
        description, 
        price, 
        collections, 
        tags, 
        available 
       FROM products 
       WHERE merchant_id = 2`
    );

    if (result.rows.length === 0) {
      console.log("No products found for merchant 2.");
      return;
    }

    const products = result.rows.map(row => ({
      id: row.id, // shopify_id
      title: row.title,
      description: row.description,
      // Create mock variants array as expected by transformer
      variants: [{
        price: row.price,
        available: row.available
      }],
      collections: row.collections || [],
      tags: row.tags || [],
      // Ensure other fields accessed by transformer exist
      vendor: "Test Vendor",
      product_type: "General",
      body_html: row.description
    }));

    console.log(`Found ${products.length} products. Generating embeddings...`);

    // Generate and store embeddings
    // Note: The service expects products with 'id' property which maps to shopify_id usually
    // Let's verify what transformProductsToDocuments expects.
    // Looking at embeddings.server.ts -> transformProductsToDocuments
    
    await generateProductEmbeddings(2, products);

    console.log("✅ Embeddings generated successfully!");

  } catch (err) {
    console.error("Error generating embeddings:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
