
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Seeding dashboard data...");

    // 1. Ensure merchant exists
    const merchantRes = await client.query(
      `INSERT INTO merchants (shop_domain, shop_name) 
       VALUES ('test-shop.myshopify.com', 'Test Shop') 
       ON CONFLICT (shop_domain) DO UPDATE SET shop_name = EXCLUDED.shop_name 
       RETURNING id`
    );
    const merchantId = merchantRes.rows[0].id;
    console.log(`Merchant ID: ${merchantId}`);

    // 2. Clear existing analytics (optional, for clean state)
    // await client.query("DELETE FROM conversation_analytics");
    // await client.query("DELETE FROM dashboard_metrics");

    // 3. Generate sample conversations for last 7 days
    const days = 7;
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      // Random metrics for the day
      const dailyConversations = Math.floor(Math.random() * 20) + 5;
      const resolved = Math.floor(dailyConversations * 0.8);
      const avgResponseTime = Math.floor(Math.random() * 2000) + 500;
      
      console.log(`Generating data for ${dateStr}: ${dailyConversations} conversations`);

      // Store daily metrics
      await client.query(`
        INSERT INTO dashboard_metrics (
          merchant_id, metric_date, total_conversations, resolved_conversations, 
          avg_response_time_ms, total_messages, avg_messages_per_conversation,
          top_products, top_intents, sentiment_scores
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (merchant_id, metric_date) DO NOTHING
      `, [
        merchantId, 
        dateStr, 
        dailyConversations, 
        resolved, 
        avgResponseTime,
        dailyConversations * 8, // Approx 8 messages per conv
        8,
        JSON.stringify([
          { product: "Wireless Headphones", count: Math.floor(Math.random() * 10) },
          { product: "Smart Watch", count: Math.floor(Math.random() * 8) },
          { product: "Laptop Stand", count: Math.floor(Math.random() * 5) }
        ]),
         JSON.stringify([
          { intent: "product_search", count: Math.floor(Math.random() * 10) },
          { intent: "order_status", count: Math.floor(Math.random() * 8) }
        ]),
        JSON.stringify({
          positive: Math.floor(dailyConversations * 0.6),
          neutral: Math.floor(dailyConversations * 0.3),
          negative: Math.floor(dailyConversations * 0.1)
        })
      ]);

      // Create detailed conversations for today and yesterday only (to save time)
      if (i < 2) {
        for (let j = 0; j < 5; j++) {
          const sessionId = `test_session_${date.getTime()}_${j}`;
          const duration = Math.floor(Math.random() * 600) + 60;
          
          // 1. Create chat_session record first (Foreign Key requirement)
           await client.query(`
            INSERT INTO chat_sessions (session_id, merchant_id, started_at, ended_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (session_id) DO NOTHING
          `, [
            sessionId, 
            merchantId, 
            new Date(date.getTime() - duration * 1000).toISOString(),
            date.toISOString()
          ]);

          // 2. Create analytics record
          await client.query(`
            INSERT INTO conversation_analytics (
              session_id, merchant_id, 
              message_count, is_resolved, resolution_type, 
              intent_primary, duration_seconds, sentiment_score, products_mentioned, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (session_id) DO NOTHING
          `, [
            sessionId,
            merchantId,
            Math.floor(Math.random() * 10) + 2,
            Math.random() > 0.2, // 80% resolved
            "auto",
            "product_search",
            duration,
            (Math.random() * 1 - 0.2).toFixed(2), // Random sentiment
            ["Wireless Headphones"],
            new Date(date.getTime() - duration * 1000).toISOString() // created_at
          ]);
          
           // Add some dummy messages
           await client.query(`
             INSERT INTO chat_messages (session_id, role, content, created_at)
             VALUES 
             ($1, 'user', 'Do you have headphones?', $2),
             ($1, 'assistant', 'Yes, we have several models.', $2)
           `, [sessionId, new Date(date.getTime() - duration * 1000).toISOString()]);
        }
      }
    }

    console.log("Seeding complete!");
  } catch (err) {
    console.error("Error seeding data:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
