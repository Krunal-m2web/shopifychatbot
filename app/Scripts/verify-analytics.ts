import "dotenv/config";
import pool, { query } from "../utils/db.server";

async function verifyAnalytics() {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error("Please provide a sessionId");
    process.exit(1);
  }

  try {
    const result = await query(
      "SELECT * FROM conversation_analytics WHERE session_id = $1",
      [sessionId]
    );

    if (result.rows.length === 0) {
      console.log(`❌ No analytics found for session: ${sessionId}`);
    } else {
      console.log(`✅ Analytics found for session: ${sessionId}`);
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
  } catch (err) {
    console.error("Error verifying analytics:", err);
  } finally {
    await pool.end();
  }
}

verifyAnalytics();
