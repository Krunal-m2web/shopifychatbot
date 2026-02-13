import * as Ably from "ably";

const ably = new Ably.Rest({
  key: process.env.ABLY_API_KEY,
});

export async function publishChatMessage(sessionId: string, message: string) {
  const channel = ably.channels.get(`chat-${sessionId}`);

  await channel.publish("message", {
    content: message,
    timestamp: new Date().toISOString(),
  });
}

export async function getAblyClientKey() {
  // Return a client key for the widget to use
  // In production, you'd want to create token auth
  return process.env.ABLY_API_KEY;
}

export { ably };
