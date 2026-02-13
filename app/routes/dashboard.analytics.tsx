/**
 * Dashboard Analytics Page
 * Displays key metrics, trends, and top products
 */

import {
  Page,
  Card,
  Layout,
  Text,
  BlockStack,
  InlineStack,
  Spinner,
  IndexTable,
  Badge,
  ProgressBar,
} from "@shopify/polaris";
import { ExportIcon } from "@shopify/polaris-icons";
import { useEffect, useState } from "react";

interface DashboardMetrics {
  totalConversations: number;
  avgResponseTime: string;
  resolutionRate: number;
  topProducts: Array<{ product: string; count: number }>;
  trend: {
    daily: Array<{
      date: string;
      conversations: number;
      resolved: number;
      avgResponseTime: number;
      messages: number;
    }>;
  };
}

export default function DashboardAnalytics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/metrics?period=${period}&merchantId=2`);
      const data = await response.json();
      setMetrics(data.metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxMentions = () => {
    if (!metrics || metrics.topProducts.length === 0) return 0;
    return Math.max(...metrics.topProducts.map((p) => p.count));
  };

  const trendRows = metrics?.trend.daily.map((day, index) => (
    <IndexTable.Row id={index.toString()} key={index} position={index}>
      <IndexTable.Cell>
        <Text fontWeight="bold" as="span">{day.date}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div style={{ textAlign: "right" }}>{day.conversations}</div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div style={{ textAlign: "right" }}>
          <Badge tone={day.resolved > day.conversations / 2 ? "success" : "attention"}>
            {day.resolved.toString()}
          </Badge>
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div style={{ textAlign: "right" }}>{day.messages}</div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div style={{ textAlign: "right" }}>{day.avgResponseTime}s</div>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  if (loading) {
    return (
      <Page title="Analytics">
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

  if (!metrics) {
    return (
      <Page title="Analytics">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <Text as="p" tone="critical">Failed to load metrics. Please try again later.</Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const maxMentions = getMaxMentions();

  return (
    <Page
      title="Analytics"
      subtitle="Monitor your chatbot's performance and customer interactions"
      fullWidth
      primaryAction={{
        content: "Export Report",
        icon: ExportIcon,
        onAction: () => {
          window.open("/api/dashboard/export?type=metrics&merchantId=2", "_blank");
        },
      }}
    >
      <Layout>
        {/* Key Metrics Cards */}
        <Layout.Section>
          <InlineStack gap="400">
            <div style={{ flex: 1, minWidth: "240px" }}>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd" tone="subdued">
                    Total Conversations
                  </Text>
                  <Text as="p" variant="heading2xl" fontWeight="bold">
                    {metrics.totalConversations}
                  </Text>
                  <Badge tone="info">{`Last ${period === "1d" ? "24h" : period}`}</Badge>
                </BlockStack>
              </Card>
            </div>

            <div style={{ flex: 1, minWidth: "240px" }}>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd" tone="subdued">
                    Avg Response Time
                  </Text>
                  <Text as="p" variant="heading2xl" fontWeight="bold">
                    {metrics.avgResponseTime}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Time to first response
                  </Text>
                </BlockStack>
              </Card>
            </div>

            <div style={{ flex: 1, minWidth: "240px" }}>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd" tone="subdued">
                    Resolution Rate
                  </Text>
                  <Text as="p" variant="heading2xl" fontWeight="bold" tone="success">
                    {(metrics.resolutionRate * 100).toFixed(0)}%
                  </Text>
                  <div style={{ width: "100%" }}>
                    <ProgressBar progress={metrics.resolutionRate * 100} size="small" tone="success" />
                  </div>
                </BlockStack>
              </Card>
            </div>
          </InlineStack>
        </Layout.Section>

        {/* Two column section: Top Products & Trending List */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Top Products
              </Text>
              <Text as="p" tone="subdued" variant="bodySm">
                Most discussed products by customers
              </Text>
              {metrics.topProducts.length === 0 ? (
                <div style={{ padding: "2rem 0", textAlign: "center" }}>
                   <Text as="p" tone="subdued">No product data available yet.</Text>
                </div>
              ) : (
                <BlockStack gap="500">
                  {metrics.topProducts.map((product, index) => (
                    <BlockStack key={index} gap="100">
                      <InlineStack align="space-between">
                        <Text as="p" fontWeight="semibold">{product.product}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {product.count} times
                        </Text>
                      </InlineStack>
                      <ProgressBar 
                        progress={(product.count / maxMentions) * 100} 
                        size="small" 
                      />
                    </BlockStack>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            <div style={{ padding: "16px" }}>
              <BlockStack gap="100">
                <Text as="h2" variant="headingLg">
                  Performance Trend
                </Text>
                <Text as="p" tone="subdued" variant="bodySm">
                  Daily breakdown of chatbot activity
                </Text>
              </BlockStack>
            </div>
            {metrics.trend.daily.length === 0 ? (
              <div style={{ padding: "4rem", textAlign: "center" }}>
                <Text as="p" tone="subdued">No trend data available yet.</Text>
              </div>
            ) : (
              <IndexTable
                resourceName={{ singular: "day", plural: "days" }}
                itemCount={metrics.trend.daily.length}
                headings={[
                  { title: "Date" },
                  { title: "Conversations", alignment: "end" },
                  { title: "Resolved", alignment: "end" },
                  { title: "Total Messages", alignment: "end" },
                  { title: "Avg Speed", alignment: "end" },
                ]}
                selectable={false}
              >
                {trendRows}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

