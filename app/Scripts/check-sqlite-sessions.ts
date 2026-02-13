import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function checkSqliteSessions() {
  const dbPath = path.join('c:', 'Users', 'HP', 'Desktop', 'PratikProj', 'shopify-ai-chatbot', 'ai-chat-app', 'prisma', 'dev.sqlite');
  console.log(`🔍 Checking SQLite database at ${dbPath}...\n`);

  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    const sessions = await db.all('SELECT * FROM Session');
    console.log(`Found ${sessions.length} session(s) in SQLite:\n`);

    if (sessions.length === 0) {
      console.log("❌ No sessions found in SQLite database!");
    } else {
      sessions.forEach((session: any, index: number) => {
        console.log(`Session ${index + 1}:`);
        console.log(`  ID: ${session.id}`);
        console.log(`  Shop: ${session.shop}`);
        console.log(`  Is Online: ${session.isOnline}`);
        console.log(`  Scope: ${session.scope}`);
        console.log(`  Has Access Token: ${session.accessToken ? '✅ Yes' : '❌ No'}`);
        if (session.accessToken) {
          console.log(`  Token Preview: ${session.accessToken.substring(0, 20)}...`);
        }
        console.log("");
      });
    }

    await db.close();
  } catch (error) {
    console.error("❌ Error checking SQLite sessions:", error);
  }
}

checkSqliteSessions();
