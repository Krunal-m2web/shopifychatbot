import { SearchResult } from '../vectorStore/types';

/**
 * System prompt for Claude - defines the bot's role and behavior
 */
export const SYSTEM_PROMPT = `You are a helpful customer support assistant for an online store. Your role is to:

1. Answer questions about products, policies, and orders professionally and accurately
2. Be friendly, concise, and solution-oriented
3. Only provide information based on the context given to you
4. If you don't have enough information to answer, politely say so and offer to escalate to a human agent
5. Never make up product details, prices, or policies
6. When discussing products, mention relevant details like features, pricing, and availability
7. Keep responses under 150 words unless more detail is specifically requested

Remember: You represent the merchant's brand. Be helpful, honest, and professional at all times.`;

/**
 * Build context block from retrieved documents
 */
export function buildContext(documents: SearchResult[]): string {
  if (documents.length === 0) {
    return 'No relevant information found in the knowledge base.';
  }

  const contextItems = documents.map((doc, i) => {
    const docType = doc.metadata.docType || 'unknown';
    return `[Source ${i + 1} - ${docType}]:\n${doc.content}\n`;
  });

  return `Here is the relevant information from the store's knowledge base:\n\n${contextItems.join('\n---\n')}`;
}

/**
 * Build order context when user is asking about an order
 */
export function buildOrderContext(order: any): string {
  const items = order.lineItems?.edges?.map((edge: any) => {
    const item = edge.node;
    return `- ${item.title} (Quantity: ${item.quantity}, Price: $${item.price})`;
  }).join('\n') || 'No items';

  const fulfillmentStatus = order.fulfillmentStatus || 'UNFULFILLED';
  const financialStatus = order.financialStatus || 'PENDING';

  return `Order Information:
Order Number: ${order.name || order.id}
Status: ${fulfillmentStatus}
Payment: ${financialStatus}
Total: $${order.totalPrice || '0.00'}

Items:
${items}

Shipping Address: ${order.shippingAddress?.address1 || 'N/A'}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.province || ''} ${order.shippingAddress?.zip || ''}

${order.trackingNumber ? `Tracking Number: ${order.trackingNumber}` : 'No tracking information available yet.'}`;
}

/**
 * Prompt for checking if a conversation should be escalated
 */
export const ESCALATION_CHECK_PROMPT = `Analyze this customer message and determine if it requires human intervention.

Escalate if:
- Customer explicitly requests to speak with a human
- Customer expresses frustration or anger
- Request involves refunds, disputes, or legal matters
- Technical issue beyond basic troubleshooting
- Complex customization or special order requests

Do NOT escalate for:
- Simple product questions
- Order status inquiries
- General policy questions
- Navigation help

Respond with JSON: { "shouldEscalate": boolean, "reason": string }`;
