import "dotenv/config";
import { query } from "./app/utils/db.server";

async function check() {
  try {
    const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("Tables in DB:", tables.rows.map(r => r.table_name));

    const sessionTable = tables.rows.find(r => r.table_name.includes('session'));
    if (sessionTable) {
      const sessions = await query(`SELECT * FROM ${sessionTable.table_name}`);
      console.log(`Found ${sessions.rows.length} sessions in ${sessionTable.table_name}`);
      if (sessions.rows.length > 0) {
        console.log("First session shop:", sessions.rows[0].shop);
      }
    } else {
      console.log("No session table found!");
    }
  } catch (error) {
    console.error("Check failed:", error);
  } finally {
    process.exit(0);
  }
}

check();
