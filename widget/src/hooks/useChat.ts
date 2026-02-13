import { useState, useEffect } from 'preact/hooks';
import Ably from 'ably';
import { Message } from '../types';

export function useChat(merchantId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionId] = useState(() => {
    // Get or create session ID
    let sid = localStorage.getItem('shopify-chat-session-id');
    if (!sid) {
      sid = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('shopify-chat-session-id', sid);
    }
    return sid;
  });

  const [ably, setAbly] = useState<Ably.Realtime | null>(null);

  // Initialize Ably connection
  useEffect(() => {
    const initAbly = async () => {
      try {
        // Get Ably token
        const response = await fetch(`/api/ably-token?sessionId=${sessionId}`);
        const tokenRequest = await response.json();

        // Initialize Ably client
        const ablyClient = new Ably.Realtime({
          authUrl: `/api/ably-token?sessionId=${sessionId}`,
        });

        ablyClient.connection.on('connected', () => {
          console.log('Ably connected');
          setIsConnected(true);
        });

        ablyClient.connection.on('disconnected', () => {
          setIsConnected(false);
        });

        setAbly(ablyClient);

        return () => {
          ablyClient.close();
        };
      } catch (error) {
        console.error('Failed to initialize Ably:', error);
      }
    };

    initAbly();
  }, [sessionId]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!ably || !conversationId) return;

    const channel = ably.channels.get(`conversation:${conversationId}`);

    // Listen for messages
    channel.subscribe('message', (message) => {
      const msg = message.data as Message;
      setMessages(prev => [...prev, msg]);
    });

    // Listen for typing indicators
    channel.subscribe('typing', (message) => {
      if (message.data.role === 'assistant') {
        setIsTyping(message.data.isTyping);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [ably, conversationId]);

  // Send message
  const sendMessage = async (content: string) => {
    try {
      // Optimistically add user message
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMessage]);

      // Send to server
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId,
          conversationId,
          sessionId,
          content,
        }),
      });

      const data = await response.json();

      // Store conversation ID for future messages
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Could add error handling UI here
    }
  };

  return {
    messages,
    isTyping,
    isConnected,
    sendMessage,
  };
}
