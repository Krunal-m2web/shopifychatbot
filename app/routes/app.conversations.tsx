import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { authenticate } from '~/shopify.server';
import prisma from '~/db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
    select: { id: true },
  });

  if (!merchant) {
    return { conversations: [] };
  }

  const conversations = await prisma.conversation.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  return { conversations };
};

export default function ConversationsPage() {
  const { conversations } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Conversations">
      <s-section>
        {conversations.length === 0 ? (
          <s-paragraph>No conversations yet. Install the chat widget on your store to get started!</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {conversations.map((conv) => (
              <s-box key={conv.id} padding="base" borderWidth="base" borderRadius="base">
                <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
                  <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                    <s-stack direction="inline" gap="base" alignItems="center">
                      <s-text variant="headingSm">
                        {conv.customerName || conv.customerEmail || 'Anonymous'}
                      </s-text>
                      <s-badge
                        tone={
                          conv.status === 'escalated'
                            ? 'attention'
                            : conv.status === 'resolved'
                            ? 'success'
                            : 'info'
                        }
                      >
                        {conv.status}
                      </s-badge>
                      <s-text tone="subdued" variant="bodySm">
                        {conv._count.messages} messages
                      </s-text>
                    </s-stack>

                    {conv.messages[0] && (
                      <s-text tone="subdued">
                        Last message: {conv.messages[0].content.substring(0, 80)}...
                      </s-text>
                    )}

                    <s-text tone="subdued" variant="bodySm">
                      {new Date(conv.createdAt).toLocaleString()}
                    </s-text>
                  </s-stack>

                  <Link to={`/app/conversations/${conv.id}`} style={{ textDecoration: 'none' }}>
                    <s-button variant="primary">View</s-button>
                  </Link>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
