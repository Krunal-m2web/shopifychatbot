import prisma from "./app/db.server";
import fs from "fs";

async function exportSession() {
  console.log("📤 Exporting sessions from SQLite...");
  try {
    const sessions = await (prisma as any).session.findMany();
    console.log(`Found ${sessions.length} session(s).`);
    
    fs.writeFileSync("sessions-export.json", JSON.stringify(sessions, null, 2));
    console.log("✅ Sessions exported to sessions-export.json");
  } catch (error) {
    console.error("❌ Export failed:", error);
  } finally {
    await (prisma as any).$disconnect();
  }
}

exportSession();
