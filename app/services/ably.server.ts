import * as Ably from "ably";

let ablyInstance: Ably.Rest | null = null;

function getAbly() {
  if (!ablyInstance) {
    const key = process.env.ABLY_API_KEY;
    if (!key || key === "your_ably_key") {
      throw new Error("ABLY_API_KEY is not configured in environment variables.");
    }
    ablyInstance = new Ably.Rest({ key });
  }
  return ablyInstance;
}

export async function publishChatMessage(sessionId: string, message: string) {
  try {
    const ably = getAbly();
    const channel = ably.channels.get(`chat-${sessionId}`);

    await channel.publish("message", {
      content: message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Ably publish error:", error);
    // Don't throw if realtime fails, just log it as it's secondary to the chat response
  }
}

export async function getAblyClientKey() {
  // Return a client key for the widget to use
  // In production, you'd want to create token auth
  return process.env.ABLY_API_KEY;
}

export const ably = {
  get instance() {
    return getAbly();
  }
};
