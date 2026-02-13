import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useLoaderData, useFetcher } from 'react-router';
import { authenticate } from '~/shopify.server';
import prisma from '~/db.server';
import { checkWidgetActivationStatus } from '~/lib/theme-status.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  // Get merchant
  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
    select: { id: true, shopName: true },
  });

  if (!merchant) {
    return {
      stats: null,
      recentConversations: [],
      widgetStatus: { isActive: false, activationUrl: '' },
    };
  }

  // Get stats and widget status in parallel
  const [
    totalConversations,
    activeConversations,
    escalatedConversations,
    totalMessages,
    widgetStatus,
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
    checkWidgetActivationStatus(admin).catch(() => ({
      isActive: false,
      activationUrl: '',
    })),
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
    widgetStatus,
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
  const { stats, recentConversations, merchantName, widgetStatus } = useLoaderData<typeof loader>();
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

      {/* Widget Activation Status */}
      {!widgetStatus.isActive && (
        <s-section>
          <s-banner tone="warning" title="Activate your chat widget">
            <s-paragraph>
              Your chatbot is ready but not yet visible on your store. Click the button below to activate it in your theme editor — just toggle it on and click Save.
            </s-paragraph>
            <s-button
              variant="primary"
              onClick={() => open(widgetStatus.activationUrl, '_top')}
            >
              Activate Chat Widget
            </s-button>
          </s-banner>
        </s-section>
      )}

      {widgetStatus.isActive && (
        <s-section>
          <s-banner tone="success" title="Chat widget is active">
            <s-paragraph>
              Your chatbot is live on your storefront and ready to help customers.
            </s-paragraph>
          </s-banner>
        </s-section>
      )}

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

      {/* Setup Status */}
      <s-section slot="aside" heading="Setup Status">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-badge tone={widgetStatus.isActive ? 'success' : 'attention'}>
              {widgetStatus.isActive ? 'Active' : 'Inactive'}
            </s-badge>
            <s-text>Chat Widget</s-text>
          </s-stack>

          {!widgetStatus.isActive && widgetStatus.activationUrl && (
            <s-link href={widgetStatus.activationUrl} target="_top">
              Activate in theme editor
            </s-link>
          )}

          <s-link href="/app/settings">Widget settings</s-link>
          <s-link href="/app/conversations">View conversations</s-link>
          <s-link href="/app/analytics">Analytics</s-link>
        </s-stack>
      </s-section>
    </s-page>
  );
}
