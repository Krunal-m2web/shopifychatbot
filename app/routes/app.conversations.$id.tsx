import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { authenticate } from '~/shopify.server';
import prisma from '~/db.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const conversationId = params.id!;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      escalations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!conversation) {
    throw new Response('Conversation not found', { status: 404 });
  }

  return { conversation };
};

export default function ConversationDetail() {
  const { conversation } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Conversation Details" backAction={{ url: '/app/conversations' }}>
      {/* Conversation Info */}
      <s-section>
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-text variant="headingSm">Customer:</s-text>
            <s-text>{conversation.customerName || conversation.customerEmail || 'Anonymous'}</s-text>
            <s-badge
              tone={
                conversation.status === 'escalated'
                  ? 'attention'
                  : conversation.status === 'resolved'
                  ? 'success'
                  : 'info'
              }
            >
              {conversation.status}
            </s-badge>
          </s-stack>

          {conversation.customerEmail && (
            <s-text tone="subdued">Email: {conversation.customerEmail}</s-text>
          )}

          <s-text tone="subdued">
            Started: {new Date(conversation.createdAt).toLocaleString()}
          </s-text>

          {conversation.escalations[0] && (
            <s-box padding="base" borderWidth="base" borderRadius="base" background="critical-subdued">
              <s-stack direction="block" gap="tight">
                <s-text variant="headingSm">⚠️ Escalation</s-text>
                <s-text>Reason: {conversation.escalations[0].reason}</s-text>
                {conversation.escalations[0].summary && (
                  <s-text tone="subdued">{conversation.escalations[0].summary}</s-text>
                )}
              </s-stack>
            </s-box>
          )}
        </s-stack>
      </s-section>

      {/* Message Thread */}
      <s-section heading="Messages">
        <s-stack direction="block" gap="base">
          {conversation.messages.map((message) => (
            <s-box
              key={message.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background={message.role === 'user' ? 'surface' : 'info-subdued'}
            >
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="base" alignItems="center">
                  <s-badge tone={message.role === 'user' ? 'info' : 'success'}>
                    {message.role === 'user' ? '👤 Customer' : '🤖 Assistant'}
                  </s-badge>
                  <s-text tone="subdued" variant="bodySm">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </s-text>
                </s-stack>
                <s-text style={{ whiteSpace: 'pre-wrap' }}>{message.content}</s-text>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>
    </s-page>
  );
}
