// app/Scripts/check-sessions.ts
/**
 * Diagnostic script to check what sessions exist in the database
 */

import "dotenv/config";
import { query } from "../utils/db.server";

async function checkSessions() {
  console.log("🔍 Checking database tables...\n");

  try {
    const tablesResult = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Tables found:", tablesResult.rows.map(r => r.table_name).join(", "));
    console.log("");
    // Get all sessions
    const sessionsResult = await query("SELECT * FROM shopify_sessions");
    const sessions = sessionsResult.rows;
    
    console.log(`Found ${sessions.length} session(s):\n`);
    
    if (sessions.length === 0) {
      console.log("❌ No sessions found in database!");
      console.log("\nThis means the app was not properly installed.");
    } else {
      sessions.forEach((session: any, index: number) => {
        console.log(`Session ${index + 1}:`);
        console.log(`  ID: ${session.id}`);
        console.log(`  Shop: ${session.shop}`);
        console.log(`  Is Online: ${session.isOnline}`);
        console.log(`  State: ${session.state}`);
        console.log(`  Scope: ${session.scope}`);
        console.log(`  Has Access Token: ${session.accessToken ? '✅ Yes' : '❌ No'}`);
        if (session.accessToken) {
          console.log(`  Token Preview: ${session.accessToken.substring(0, 20)}...`);
        }
        console.log(`  Expires: ${session.expires || 'Never (offline token)'}`);
        console.log("");
      });
    }

    // Get all merchants
    const merchantsResult = await query("SELECT * FROM merchants");
    const merchants = merchantsResult.rows;
    console.log(`\nFound ${merchants.length} merchant(s):\n`);
    
    if (merchants.length > 0) {
      merchants.forEach((merchant: any, index: number) => {
        console.log(`Merchant ${index + 1}:`);
        console.log(`  ID: ${merchant.id}`);
        console.log(`  Shop Domain: ${merchant.shop_domain}`);
        console.log(`  Is Active: ${merchant.is_active || 'N/A'}`);
        console.log(`  Has Access Token: ${merchant.access_token ? '✅ Yes' : '❌ No'}`);
        console.log("");
      });
    }

  } catch (error) {
    console.error("❌ Error checking sessions:", error);
  }

  process.exit(0);
}

checkSessions();
