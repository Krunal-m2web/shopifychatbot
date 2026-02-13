import { BaseRealtime, WebSocketTransport, FetchRequest } from "ably/modular";

let realtimeClient = null;

export function initializeAbly(apiKey) {
  if (!realtimeClient) {
    realtimeClient = new BaseRealtime({
      key: apiKey,
      echoMessages: false,
      plugins: {
        WebSocketTransport,
        FetchRequest,
      },
    });
  }

  return realtimeClient;
}

export function subscribeToChannel(channelName, onMessage) {
  if (!realtimeClient) {
    console.error("Ably not initialized");
    return null;
  }

  const channel = realtimeClient.channels.get(channelName);

  channel.subscribe("message", (message) => {
    onMessage(message.data);
  });

  return channel;
}

export function publishMessage(channelName, message) {
  if (!realtimeClient) {
    console.error("Ably not initialized");
    return;
  }

  const channel = realtimeClient.channels.get(channelName);
  channel.publish("message", message);
}

export function disconnectAbly() {
  if (realtimeClient) {
    realtimeClient.close();
    realtimeClient = null;
  }
}
