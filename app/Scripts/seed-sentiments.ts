import "dotenv/config";
import pool, { query } from "../utils/db.server";
import { analyzeSentiment } from "../services/sentiment.server";

async function seedSentiments() {
  const merchantId = 2; // Test merchant
  
  const testConversations = [
    {
      email: "happy.customer@example.com",
      message: "I love these great products! The quality is excellent and I am very happy.",
      intent: "general_question"
    },
    {
      email: "angry.user@example.com",
      message: "This is terrible. The last order was broken and slow. Terrible experience.",
      intent: "order_tracking"
    },
    {
      email: "best.fan@example.com",
      message: "Thanks! You are the best. This is awesome and wonderful.",
      intent: "product_search"
    },
    {
      email: "sad.shopper@example.com",
      message: "Bad quality. I hate this product. It's the worst and very poor.",
      intent: "price_inquiry"
    },
    {
      email: "neutral.guy@example.com",
      message: "I am looking for a blue shirt in large size.",
      intent: "product_search"
    }
  ];

  console.log("🌱 Seeding diverse sentiments...");

  try {
    for (const conv of testConversations) {
      const sessionId = `test_sent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const sentiment = analyzeSentiment(conv.message);
      
      // 1. Create Session
      await query(
        "INSERT INTO chat_sessions (session_id, merchant_id, customer_email, metadata) VALUES ($1, $2, $3, $4)",
        [sessionId, merchantId, conv.email, JSON.stringify({ test: true })]
      );
      
      // 2. Add Message
      await query(
        "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)",
        [sessionId, "user", conv.message]
      );
      
      // 3. Add Analytics
      await query(
        `INSERT INTO conversation_analytics 
         (session_id, merchant_id, message_count, intent_primary, sentiment_score, is_resolved)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, merchantId, 1, conv.intent, sentiment.score, Math.random() > 0.5]
      );
      
      console.log(`✅ Created ${conv.email}: Score ${sentiment.score} (${sentiment.label})`);
    }
    
    console.log("\n✨ Seeding complete! Refresh your dashboard to see the results.");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await pool.end();
  }
}

seedSentiments();
