import "dotenv/config";
import { query } from "../utils/db.server";
import fs from "fs";

async function importSessions() {
  console.log("📥 Importing sessions into PostgreSQL...");
  try {
    const sessions = JSON.parse(fs.readFileSync("ai-chat-app/sessions-export.json", "utf-8"));
    
    for (const session of sessions) {
      console.log(`Processing session for ${session.shop}...`);
      
      const onlineAccessInfo = session.userId ? JSON.stringify({
        associated_user: {
          id: session.userId,
          first_name: session.firstName,
          last_name: session.lastName,
          email: session.email,
          account_owner: session.accountOwner,
          locale: session.locale,
          collaborator: session.collaborator,
          email_verified: session.emailVerified
        }
      }) : null;

      // Correct columns found: id, shop, state, isOnline, scope, expires, onlineAccessInfo, accessToken
      await query(
        `INSERT INTO shopify_sessions (
          id, shop, state, "isOnline", scope, expires, "onlineAccessInfo", "accessToken"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          shop = EXCLUDED.shop,
          state = EXCLUDED.state,
          "isOnline" = EXCLUDED."isOnline",
          scope = EXCLUDED.scope,
          expires = EXCLUDED.expires,
          "onlineAccessInfo" = EXCLUDED."onlineAccessInfo",
          "accessToken" = EXCLUDED."accessToken"`,
        [
          session.id, session.shop, session.state, session.isOnline, session.scope, 
          session.expires ? Math.floor(new Date(session.expires).getTime() / 1000) : null, 
          onlineAccessInfo,
          session.accessToken
        ]
      );
      
      // Update/Insert merchant
      const merchantExists = await query("SELECT id FROM merchants WHERE shop_domain = $1", [session.shop]);
      if (merchantExists.rows.length === 0) {
        console.log(`   Creating merchant record for ${session.shop}...`);
        await query(
          "INSERT INTO merchants (shop_domain, shop_name, installed_at, updated_at) VALUES ($1, $2, NOW(), NOW())",
          [session.shop, session.shop.split('.')[0]]
        );
      } else {
        console.log(`   Merchant ${session.shop} already exists.`);
        await query(
          "UPDATE merchants SET updated_at = NOW() WHERE shop_domain = $1",
          [session.shop]
        );
      }
    }
    
    console.log("✅ Sessions successfully imported to PostgreSQL.");
  } catch (error) {
    console.error("❌ Import failed:", error);
  } finally {
    process.exit(0);
  }
}

importSessions();
