import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { authenticate } from '~/shopify.server';
import prisma from '~/db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
    select: { id: true },
  });

  if (!merchant) {
    return { metrics: null };
  }

  // Get conversation stats
  const [
    totalConversations,
    escalatedConversations,
    totalMessages,
    recentEscalations,
  ] = await Promise.all([
    prisma.conversation.count({ where: { merchantId: merchant.id } }),
    prisma.conversation.count({
      where: { merchantId: merchant.id, status: 'escalated' },
    }),
    prisma.message.count({
      where: { conversation: { merchantId: merchant.id } },
    }),
    prisma.escalation.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { reason: true },
    }),
  ]);

  const resolvedByAI = totalConversations - escalatedConversations;
  const resolutionRate =
    totalConversations > 0 ? Math.round((resolvedByAI / totalConversations) * 100) : 0;

  const avgMessagesPerConversation =
    totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0;

  // Count escalation reasons
  const escalationReasons: Record<string, number> = {};
  recentEscalations.forEach((esc) => {
    escalationReasons[esc.reason] = (escalationReasons[esc.reason] || 0) + 1;
  });

  const topReasons = Object.entries(escalationReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  return {
    metrics: {
      totalConversations,
      escalatedConversations,
      resolvedByAI,
      resolutionRate,
      totalMessages,
      avgMessagesPerConversation,
      topReasons,
    },
  };
};

export default function AnalyticsPage() {
  const { metrics } = useLoaderData<typeof loader>();

  if (!metrics) {
    return (
      <s-page heading="Analytics">
        <s-section>
          <s-paragraph>Loading...</s-paragraph>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Analytics">
      {/* Key Metrics */}
      <s-section heading="Key Metrics">
        <s-stack direction="inline" gap="large" wrap>
          <s-box padding="large" borderWidth="base" borderRadius="base" style={{ flex: 1, minWidth: '200px' }}>
            <s-stack direction="block" gap="small">
              <s-text variant="headingXl">{metrics.totalConversations}</s-text>
              <s-text tone="subdued">Total Conversations</s-text>
            </s-stack>
          </s-box>

          <s-box padding="large" borderWidth="base" borderRadius="base" style={{ flex: 1, minWidth: '200px' }}>
            <s-stack direction="block" gap="small">
              <s-text variant="headingXl">{metrics.resolutionRate}%</s-text>
              <s-text tone="subdued">AI Resolution Rate</s-text>
            </s-stack>
          </s-box>

          <s-box padding="large" borderWidth="base" borderRadius="base" style={{ flex: 1, minWidth: '200px' }}>
            <s-stack direction="block" gap="small">
              <s-text variant="headingXl">{metrics.avgMessagesPerConversation}</s-text>
              <s-text tone="subdued">Avg Messages/Conversation</s-text>
            </s-stack>
          </s-box>

          <s-box padding="large" borderWidth="base" borderRadius="base" style={{ flex: 1, minWidth: '200px' }}>
            <s-stack direction="block" gap="small">
              <s-text variant="headingXl">{metrics.escalatedConversations}</s-text>
              <s-text tone="subdued">Total Escalations</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Resolution Breakdown */}
      <s-section heading="Resolution Breakdown">
        <s-stack direction="block" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-text variant="headingMd">{metrics.resolvedByAI}</s-text>
              <s-text>Resolved by AI</s-text>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-text variant="headingMd">{metrics.escalatedConversations}</s-text>
              <s-text>Escalated to Human</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Top Escalation Reasons */}
      {metrics.topReasons.length > 0 && (
        <s-section heading="Top Escalation Reasons">
          <s-stack direction="block" gap="base">
            {metrics.topReasons.map((item, i) => (
              <s-box key={i} padding="base" borderWidth="base" borderRadius="base">
                <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
                  <s-text>{item.reason}</s-text>
                  <s-badge>{item.count}</s-badge>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}
