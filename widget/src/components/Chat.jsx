import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { initializeAbly, subscribeToChannel } from "../services/ably";
import { ProductCarousel } from "./ProductCard";

export function Chat({ apiUrl: rawApiUrl, ablyKey, settings, merchantId, onClose }) {
  // Normalize API URL (remove trailing slashes and any /api/chat suffix)
  const apiUrl = (rawApiUrl || "")
    .replace(/\/+$/, "")
    .replace(/\/api\/chat$/, "");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [channel, setChannel] = useState(null);

  const messagesEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize Ably and session
  useEffect(() => {
    const id = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    setSessionId(id);

    let ablyChannel = null;

    // Initialize Ably
    if (ablyKey) {
      initializeAbly(ablyKey);

      ablyChannel = subscribeToChannel(`chat-${id}`, (message) => {
        // Received message from server
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: message.content,
            products: message.products || [], // Store products
            timestamp: message.timestamp || new Date().toISOString(),
          },
        ]);

        setIsLoading(false);
      });

      setChannel(ablyChannel);
    }

    // Welcome message from settings or default
    const welcomeMsg = settings?.welcomeMessage || "👋 Hi! I'm your AI shopping assistant. How can I help you today?";

    setMessages([
      {
        role: "assistant",
        content: welcomeMsg,
        timestamp: new Date().toISOString(),
      },
    ]);

    return () => {
      if (ablyChannel) {
        ablyChannel.unsubscribe();
      }
    };
  }, [ablyKey, settings]);

  const sendMessage = async (e) => {
    e?.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Send to API (response will come through Ably)
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          sessionId: sessionId,
          merchantId: merchantId, // Pass merchantId to chat API if needed, though usually inferred from session or handle
          useRealtime: !!ablyKey,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      // If not using Ably, get response directly
      if (!ablyKey) {
        const data = await response.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            products: data.products || [], // Store products
            timestamp: new Date().toISOString(),
          },
        ]);

        setIsLoading(false);
      }

      // Otherwise, response comes through Ably subscription
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);

      setIsLoading(false);
    }
  };

  const handleMoreLikeThis = async (productId) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/api/similar?productId=${productId}&merchantId=${merchantId}&sessionId=${sessionId || ''}&limit=5`
      );
      const data = await response.json();

      if (data.similarProducts && data.similarProducts.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Here are ${data.similarProducts.length} products similar to the one you selected:`,
            products: data.similarProducts,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Similar products error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title">
          <div className="chat-avatar">
            {settings?.avatarUrl ? (
              <img src={settings.avatarUrl} alt="Avatar" />
            ) : (
              "🤖"
            )}
          </div>

          <div>
            <div className="chat-name">AI Assistant</div>
            <div className="chat-status">Online</div>
          </div>
        </div>

        <button className="chat-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role}`}>
            <div className="message-content">{msg.content}</div>

            {/* Product Cards */}
            {msg.role === "assistant" && msg.products && msg.products.length > 0 && (
              <ProductCarousel
                products={msg.products}
                onMoreLikeThis={handleMoreLikeThis}
              />
            )}

            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-input" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onInput={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />

        <button type="submit" disabled={isLoading || !input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}
