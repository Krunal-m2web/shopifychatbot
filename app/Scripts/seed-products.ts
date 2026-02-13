
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function seedProducts() {
  const client = await pool.connect();
  try {
    console.log("Seeding products for Merchant ID 2...");

    // Get merchant ID 2
    const merchantRes = await client.query(
      "SELECT id FROM merchants WHERE shop_domain = 'test-shop.myshopify.com'"
    );
    
    if (merchantRes.rows.length === 0) {
      console.error("Merchant not found!");
      return;
    }

    const merchantId = merchantRes.rows[0].id;
    console.log(`Merchant ID: ${merchantId}`);

    // Sample products
    const products = [
      {
        title: "Wireless Bluetooth Headphones",
        description: "Premium wireless headphones with noise cancellation, 30-hour battery life, and superior sound quality. Perfect for music lovers and professionals.",
        price: 89.99,
        collections: ["Electronics", "Audio"],
        tags: ["wireless", "bluetooth", "headphones", "audio", "music"],
        shopify_id: "prod_2001"
      },
      {
        title: "Classic Cotton T-Shirt",
        description: "Comfortable 100% cotton t-shirt available in multiple colors. Soft, breathable fabric perfect for everyday wear.",
        price: 24.99,
        collections: ["Clothing", "Casual"],
        tags: ["t-shirt", "cotton", "casual", "clothing", "apparel"],
        shopify_id: "prod_2002"
      },
      {
        title: "Ergonomic Laptop Stand",
        description: "Adjustable aluminum laptop stand that improves posture and reduces neck strain. Compatible with all laptop sizes.",
        price: 49.99,
        collections: ["Office", "Accessories"],
        tags: ["laptop", "stand", "office", "ergonomic", "aluminum"],
        shopify_id: "prod_2003"
      },
      {
        title: "Stainless Steel Water Bottle",
        description: "Insulated water bottle keeps drinks cold for 24 hours or hot for 12 hours. BPA-free, leak-proof, and eco-friendly.",
        price: 29.99,
        collections: ["Lifestyle", "Outdoor"],
        tags: ["water bottle", "insulated", "stainless steel", "eco-friendly"],
        shopify_id: "prod_2004"
      },
      {
        title: "Wireless Gaming Mouse",
        description: "High-precision gaming mouse with customizable RGB lighting, programmable buttons, and ergonomic design.",
        price: 59.99,
        collections: ["Electronics", "Gaming"],
        tags: ["mouse", "gaming", "wireless", "rgb", "computer"],
        shopify_id: "prod_2005"
      },
      {
        title: "Yoga Mat - Premium Non-Slip",
        description: "Extra-thick yoga mat with superior grip and cushioning. Perfect for yoga, pilates, and home workouts.",
        price: 39.99,
        collections: ["Fitness", "Sports"],
        tags: ["yoga", "mat", "fitness", "exercise", "workout"],
        shopify_id: "prod_2006"
      },
      {
        title: "LED Desk Lamp",
        description: "Modern LED desk lamp with adjustable brightness and color temperature. Energy-efficient and eye-friendly.",
        price: 44.99,
        collections: ["Office", "Lighting"],
        tags: ["lamp", "led", "desk", "office", "lighting"],
        shopify_id: "prod_2007"
      },
      {
        title: "Portable Phone Charger 20000mAh",
        description: "High-capacity portable power bank with fast charging support. Charges multiple devices simultaneously.",
        price: 34.99,
        collections: ["Electronics", "Accessories"],
        tags: ["charger", "power bank", "portable", "phone", "battery"],
        shopify_id: "prod_2008"
      }
    ];

    for (const product of products) {
      // Check if product already exists
      const existingProduct = await client.query(
        "SELECT id FROM products WHERE merchant_id = $1 AND title = $2",
        [merchantId, product.title]
      );

      if (existingProduct.rows.length > 0) {
        console.log(`⏭ Skipped (already exists): ${product.title}`);
        continue;
      }

      await client.query(`
        INSERT INTO products (merchant_id, shopify_id, title, description, price, collections, tags, available)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        merchantId,
        product.shopify_id,
        product.title,
        product.description,
        product.price,
        product.collections,
        product.tags,
        true
      ]);

      console.log(`✓ Added: ${product.title}`);
    }

    console.log("\n✅ Products seeded successfully!");
    
    // Show count
    const countRes = await client.query(
      "SELECT COUNT(*) FROM products WHERE merchant_id = $1",
      [merchantId]
    );
    console.log(`Total products for merchant ${merchantId}: ${countRes.rows[0].count}`);

  } catch (err) {
    console.error("Error seeding products:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedProducts();
