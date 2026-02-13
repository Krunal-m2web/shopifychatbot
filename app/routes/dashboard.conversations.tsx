/**
 * Conversations List Page
 * Browse and filter conversation history
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
  IndexTable,
  useIndexResourceState,
  Pagination,
} from "@shopify/polaris";
import {
  ChatIcon,
  CheckIcon,
  SearchIcon,
  ExportIcon,
} from "@shopify/polaris-icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

interface Conversation {
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

export default function DashboardConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
  }, [page]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/dashboard/conversations?page=${page}&limit=20&merchantId=2`
      );
      const data = await response.json();
      setConversations(data.conversations || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getSentimentEmoji = (score: number | null) => {
    if (score === null) return "😐";
    if (score > 0.6) return "😊";
    if (score < 0.4) return "😞";
    return "😐";
  };

  const formatIntent = (intent: string | null) => {
    if (!intent) return "Unknown";
    return intent
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const resourceName = {
    singular: "conversation",
    plural: "conversations",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(conversations as any);

  const rowMarkup = conversations.map(
    (
      {
        sessionId,
        customerEmail,
        startedAt,
        messageCount,
        isResolved,
        intentPrimary,
        sentimentScore,
      },
      index
    ) => (
      <IndexTable.Row
        id={sessionId}
        key={sessionId}
        selected={selectedResources.includes(sessionId)}
        position={index}
        onClick={() => navigate(`/dashboard/conversations/${sessionId}`)}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {customerEmail || `Sess_${sessionId.slice(-6)}`}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {isResolved ? (
            <Badge tone="success">Resolved</Badge>
          ) : (
            <Badge tone="attention">Active</Badge>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {formatIntent(intentPrimary)}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.2rem" }}>
            <span>{getSentimentEmoji(sentimentScore)}</span>
            <Text as="span" tone="subdued">
              {sentimentScore ? `${Math.round(sentimentScore * 100)}%` : "N/A"}
            </Text>
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div style={{ textAlign: "center" }}>
            <Text as="span">{messageCount}</Text>
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" tone="subdued">{formatDate(startedAt)}</Text>
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  if (loading) {
    return (
      <Page title="Conversations">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: "4rem", textAlign: "center" }}>
                <Spinner size="large" />
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Conversations"
      subtitle="View and analyze customer chat history"
      fullWidth
      primaryAction={{
        content: "Export CSV",
        icon: ExportIcon,
        onAction: () => {
          window.open("/api/dashboard/export?type=conversations&merchantId=2", "_blank");
        },
      }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {conversations.length === 0 ? (
              <div style={{ padding: "4rem", textAlign: "center" }}>
                <BlockStack gap="400">
                  <Text as="p" variant="bodyLg" tone="subdued">
                    No conversations yet.
                  </Text>
                  <Text as="p" tone="subdued">
                    Start chatting with customers to see data here.
                  </Text>
                </BlockStack>
              </div>
            ) : (
              <>
                <IndexTable
                  resourceName={resourceName}
                  itemCount={conversations.length}
                  selectedItemsCount={
                    allResourcesSelected ? "All" : selectedResources.length
                  }
                  onSelectionChange={handleSelectionChange}
                  headings={[
                    { title: "Customer / Session" },
                    { title: "Status" },
                    { title: "Primary Intent" },
                    { title: "Sentiment" },
                    { title: "Messages", alignment: "center" },
                    { title: "Started At" },
                  ]}
                  selectable={false}
                >
                  {rowMarkup}
                </IndexTable>
                <div style={{ 
                  padding: "16px", 
                  display: "flex", 
                  justifyContent: "center", 
                  borderTop: "1px solid var(--p-color-border-muted)" 
                }}>
                  <Pagination
                    hasPrevious={page > 1}
                    onPrevious={() => setPage(page - 1)}
                    hasNext={page < totalPages}
                    onNext={() => setPage(page + 1)}
                    label={`Page ${page} of ${totalPages}`}
                  />
                </div>
              </>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

