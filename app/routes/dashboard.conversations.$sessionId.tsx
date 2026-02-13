/**
 * Individual Conversation Detail Page
 * Shows full message history and metadata
 */

import {
  Page,
  Card,
  Layout,
  Text,
  BlockStack,
  InlineStack,
  Spinner,
  Badge,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";

interface Message {
  id: number;
  role: string;
  content: string;
  createdAt: string;
}

interface ConversationDetail {
  sessionId: string;
  customerEmail: string | null;
  startedAt: string;
  endedAt: string | null;
  messageCount: number;
  isResolved: boolean;
  resolutionType: string | null;
  intentPrimary: string | null;
  durationSeconds: number | null;
  sentimentScore: number | null;
  productsMentioned: string[];
}

export default function ConversationDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchConversation();
    }
  }, [sessionId]);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/conversations/${sessionId}`);
      const data = await response.json();
      setConversation(data.conversation);
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error fetching conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString();
  };

  if (loading) {
    return (
      <Page
        title="Conversation Details"
        backAction={{ onAction: () => navigate("/dashboard/conversations") }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <Spinner size="large" />
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!conversation) {
    return (
      <Page
        title="Conversation Not Found"
        backAction={{ onAction: () => navigate("/dashboard/conversations") }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Text as="p">Conversation not found.</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title={`Conversation: ${conversation.customerEmail || sessionId?.slice(0, 20)}`}
      backAction={{ onAction: () => navigate("/dashboard/conversations") }}
    >
      <Layout>
        {/* Metadata */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200">
                <Text as="h2" variant="headingMd">
                  Status:
                </Text>
                {conversation.isResolved ? (
                  <Badge tone="success">Resolved</Badge>
                ) : (
                  <Badge>Active</Badge>
                )}
              </InlineStack>
              <InlineStack gap="400" wrap={false}>
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Messages
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {conversation.messageCount}
                  </Text>
                </div>
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Intent
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {conversation.intentPrimary || "N/A"}
                  </Text>
                </div>
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Sentiment
                  </Text>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {conversation.sentimentScore
                      ? conversation.sentimentScore > 0.3
                        ? "Positive"
                        : conversation.sentimentScore < -0.3
                        ? "Negative"
                        : "Neutral"
                      : "N/A"}
                  </Text>
                </div>
              </InlineStack>
              {conversation.productsMentioned && conversation.productsMentioned.length > 0 && (
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Products Mentioned
                  </Text>
                  <InlineStack gap="200">
                    {conversation.productsMentioned.map((product, idx) => (
                      <Badge key={idx}>{product}</Badge>
                    ))}
                  </InlineStack>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Messages */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Conversation History
              </Text>
              <BlockStack gap="300">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      backgroundColor: message.role === "user" ? "#f6f6f7" : "#e3f2fd",
                    }}
                  >
                    <InlineStack align="space-between" blockAlign="start">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {message.role === "user" ? "Customer" : "AI Assistant"}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {formatTime(message.createdAt)}
                      </Text>
                    </InlineStack>
                    <div style={{ marginTop: "8px" }}>
                      <Text as="p">{message.content}</Text>
                    </div>
                  </div>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
