/**
 * Test Chat Interface
 * Allows merchants to test the chatbot before customers see it
 */

import {
  Page,
  Card,
  Layout,
  TextField,
  Button,
  BlockStack,
  Text,
  InlineStack,
  Badge,
  Divider,
} from "@shopify/polaris";
import { useState } from "react";
import { ProductCarousel } from "~/components/ProductCarousel";
import type { ProductData } from "~/components/ProductCard";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  products?: ProductData[]; // Rich product data
}

interface DebugInfo {
  intent?: any;
  responseTime?: number;
  tokensUsed?: number;
}

export default function DashboardTestChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputValue,
          sessionId: sessionId,
          testMode: true,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date().toISOString(),
        products: data.products || [], // Store structured product data
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setSessionId(data.sessionId);

      // Store debug info if available
      if (data.debug) {
        setDebugInfo(data.debug);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, there was an error processing your message.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setSessionId(null);
    setDebugInfo(null);
  };

  const handleMoreLikeThis = async (productId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/similar?productId=${productId}&merchantId=2&sessionId=${sessionId || ''}&limit=5`
      );
      const data = await response.json();

      if (data.similarProducts && data.similarProducts.length > 0) {
        // Add similar products as a new message
        const similarMessage: Message = {
          role: "assistant",
          content: `Here are ${data.similarProducts.length} products similar to the one you selected:`,
          timestamp: new Date().toISOString(),
          products: data.similarProducts,
        };
        setMessages((prev) => [...prev, similarMessage]);
      } else {
        const noResultsMessage: Message = {
          role: "assistant",
          content: "Sorry, I couldn't find similar products at the moment.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, noResultsMessage]);
      }
    } catch (error) {
      console.error("Error fetching similar products:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, there was an error finding similar products.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Page
      title="Test Chat"
      subtitle="Preview your chatbot's behavior in a safe testing environment"
      secondaryActions={[
        {
          content: showDebug ? "Hide Debug" : "Show Debug",
          onAction: () => setShowDebug(!showDebug),
        },
        {
          content: "Reset Session",
          onAction: handleReset,
          destructive: true,
        },
      ]}
    >
      <Layout>
        <Layout.Section variant={showDebug ? "oneHalf" : "fullWidth"}>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">
                  Chat Window
                </Text>
                <Badge tone="info">Test Mode</Badge>
              </InlineStack>

              {/* Messages */}
              <div
                style={{
                  minHeight: "400px",
                  maxHeight: "500px",
                  overflowY: "auto",
                  border: "1px solid #e1e3e5",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <Text as="p" tone="subdued">
                      Start a conversation to test your chatbot
                    </Text>
                  </div>
                ) : (
                  <BlockStack gap="300">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          backgroundColor:
                            message.role === "user" ? "#f6f6f7" : "#e3f2fd",
                        }}
                      >
                        <InlineStack align="space-between" blockAlign="start">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            {message.role === "user" ? "You" : "AI Assistant"}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {formatTime(message.timestamp)}
                          </Text>
                        </InlineStack>
                        <div style={{ marginTop: "8px" }}>
                          <Text as="p">{message.content}</Text>
                        </div>
                        
                        {/* Product Cards - Show if assistant message has products */}
                        {message.role === "assistant" && message.products && message.products.length > 0 && (
                          <div style={{ marginTop: "16px" }}>
                            <ProductCarousel
                              products={message.products}
                              onMoreLikeThis={handleMoreLikeThis}
                              showSimilarity={showDebug}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </BlockStack>
                )}
              </div>

              {/* Input */}
              <InlineStack gap="200" blockAlign="end">
                <div style={{ flex: 1 }}>
                  <TextField
                    label=""
                    value={inputValue}
                    onChange={setInputValue}
                    placeholder="Type your message..."
                    autoComplete="off"
                  />
                </div>
                <Button onClick={handleSend} loading={loading} variant="primary">
                  Send
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Debug Panel */}
        {showDebug && (
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Debug Information
                </Text>

                {debugInfo ? (
                  <BlockStack gap="300">
                    {debugInfo.intent && (
                      <div>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Detected Intent
                        </Text>
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "12px",
                            backgroundColor: "#f6f6f7",
                            borderRadius: "8px",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            overflowX: "auto",
                          }}
                        >
                          <pre>{JSON.stringify(debugInfo.intent, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {debugInfo.responseTime && (
                      <div>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Response Time
                        </Text>
                        <Text as="p" variant="bodyMd">
                          {debugInfo.responseTime}ms
                        </Text>
                      </div>
                    )}

                    {sessionId && (
                      <div>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Session ID
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {sessionId}
                        </Text>
                      </div>
                    )}
                  </BlockStack>
                ) : (
                  <Text as="p" tone="subdued">
                    Send a message to see debug information
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
