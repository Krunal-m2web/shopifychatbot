import Ably from 'ably';

// Server-side Ably client with full permissions
export const ablyServer = new Ably.Rest(process.env.ABLY_API_KEY!);

/**
 * Generate a scoped Ably token for client-side authentication
 * @param clientId Unique identifier for the client (e.g., sessionId)
 * @param capabilities Permissions map (e.g., { "conversation:123": ["subscribe", "publish"] })
 */
export async function generateAblyToken(
  clientId: string,
  capabilities: Record<string, string[]>
) {
  const tokenRequest = await ablyServer.auth.createTokenRequest({
    clientId,
    capability: capabilities,
  });
  return tokenRequest;
}

/**
 * Publish a message to an Ably channel from the server
 * @param channelName Channel to publish to
 * @param eventName Event name
 * @param data Message payload
 */
export async function publishMessage(
  channelName: string,
  eventName: string,
  data: any
) {
  const channel = ablyServer.channels.get(channelName);
  await channel.publish(eventName, data);
}
