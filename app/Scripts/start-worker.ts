import "dotenv/config";
// Import worker to start it
import "../services/webhook-worker.server";

console.log("👷 Webhook worker is running...");
console.log("Press Ctrl+C to stop");

// Keep process alive
process.on("SIGINT", () => {
  console.log("\n👋 Stopping worker...");
  process.exit(0);
});
