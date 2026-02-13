import "dotenv/config";
import { query } from "~/utils/db.server";

async function checkLogs() {
  console.log("Checking webhook_logs...");
  const logs = await query("SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 5");
  
  if (logs.rows.length === 0) {
    console.log("No logs found.");
  } else {
    logs.rows.forEach(log => {
      console.log(`[${log.created_at}] ID: ${log.webhook_id}, Topic: ${log.topic}, Shop: ${log.shop_domain}, Processed: ${log.processed}, Error: ${log.error}`);
    });
  }
  process.exit(0);
}

checkLogs();
