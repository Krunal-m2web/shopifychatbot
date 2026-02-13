import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useLoaderData, useFetcher } from 'react-router';
import { authenticate } from '~/shopify.server';
import prisma from '~/db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get merchant
  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
    select: { id: true, shopName: true },
  });

  if (!merchant) {
    return { stats: null, recentConversations: [] };
  }

  // Get stats
  const [
    totalConversations,
    activeConversations,
    escalatedConversations,
    totalMessages,
  ] = await Promise.all([
    prisma.conversation.count({ where: { merchantId: merchant.id } }),
    prisma.conversation.count({
      where: { merchantId: merchant.id, status: 'active' },
    }),
    prisma.conversation.count({
      where: { merchantId: merchant.id, status: 'escalated' },
    }),
    prisma.message.count({
      where: { conversation: { merchantId: merchant.id } },
    }),
  ]);

  // Calculate AI resolution rate
  const resolvedByAI = totalConversations - escalatedConversations;
  const resolutionRate =
    totalConversations > 0 ? Math.round((resolvedByAI / totalConversations) * 100) : 0;

  // Get recent conversations
  const recentConversations = await prisma.conversation.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  return {
    stats: {
      totalConversations,
      activeConversations,
      escalatedConversations,
      totalMessages,
      resolutionRate,
    },
    recentConversations,
    merchantName: merchant.shopName || session.shop,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Trigger manual sync
  const response = await fetch(`${process.env.APP_URL}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ background: true }),
  });

  return { success: true };
};

export default function DashboardHome() {
  const { stats, recentConversations, merchantName } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleSync = () => {
    fetcher.submit({}, { method: 'POST' });
  };

  if (!stats) {
    return (
      <s-page heading="Dashboard">
        <s-section>
          <s-paragraph>Loading...</s-paragraph>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading={`Welcome, ${merchantName}!`}>
      <s-button slot="primary-action" onClick={handleSync} loading={fetcher.state !== 'idle'}>
        Sync Products
      </s-button>

      {/* Stats Cards */}
      <s-section>
        <s-stack direction="inline" gap="large" wrap>
          <s-box padding="large" borderWidth="base" borderRadius="base" style={{ flex: 1, minWidth: '200px' }}>
            <s-stack direction="block" gap="small">
              <s-text variant="headingLg">{stats.totalConversations}</s-text>
              <s-text tone="subdued">Total Conversations</s-text>
            </s-stack>
          </s-box>

          <s-box padding="large" borderWidth="base" borderRadius="base" style={{ flex: 1, minWidth: '200px' }}>
            <s-stack direction="block" gap="small">
              <s-text variant="headingLg">{stats.resolutionRate}%</s-text>
              <s-text tone="subdued">AI Resolution Rate</s-text>
            </s-stack>
          </s-box>

          <s-box padding="large" borderWidth="base" borderRadius="base" style={{ flex: 1, minWidth: '200px' }}>
            <s-stack direction="block" gap="small">
              <s-text variant="headingLg">{stats.activeConversations}</s-text>
              <s-text tone="subdued">Active Conversations</s-text>
            </s-stack>
          </s-box>

          <s-box padding="large" borderWidth="base" borderRadius="base" style={{ flex: 1, minWidth: '200px' }}>
            <s-stack direction="block" gap="small">
              <s-text variant="headingLg">{stats.escalatedConversations}</s-text>
              <s-text tone="subdued">Escalations</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Recent Conversations */}
      <s-section heading="Recent Conversations">
        {recentConversations.length === 0 ? (
          <s-paragraph>No conversations yet. Your chatbot is ready to help customers!</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {recentConversations.map((conv) => (
              <s-box key={conv.id} padding="base" borderWidth="base" borderRadius="base">
                <s-stack direction="block" gap="tight">
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-text variant="headingSm">
                      {conv.customerName || conv.customerEmail || 'Anonymous'}
                    </s-text>
                    <s-badge tone={conv.status === 'escalated' ? 'attention' : 'info'}>
                      {conv.status}
                    </s-badge>
                  </s-stack>
                  {conv.messages[0] && (
                    <s-text tone="subdued">
                      {conv.messages[0].content.substring(0, 100)}...
                    </s-text>
                  )}
                  <s-text tone="subdued" variant="bodySm">
                    {new Date(conv.createdAt).toLocaleString()}
                  </s-text>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      {/* Getting Started */}
      <s-section slot="aside" heading="Getting Started">
        <s-unordered-list>
          <s-list-item>
            <s-link href="/app/settings">Customize your chat widget</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/conversations">View all conversations</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/analytics">Check your analytics</s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
