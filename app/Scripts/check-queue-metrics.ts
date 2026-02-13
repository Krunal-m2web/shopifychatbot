import "dotenv/config";
import { getQueueMetrics } from "~/services/queue.server";

async function checkMetrics() {
  console.log("Checking queue metrics...");
  try {
    const metrics = await getQueueMetrics();
    console.log("Queue Metrics:", metrics);
  } catch (error) {
    console.error("Error getting metrics:", error);
  }
  process.exit(0);
}

checkMetrics();
