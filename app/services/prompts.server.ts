export function buildSystemPrompt(storeName: string = "our store"): string {
  return `You are a helpful AI customer support assistant for ${storeName}.

Your role is to:
- Answer customer questions about products accurately
- Recommend relevant products based on customer needs
- Provide helpful information about availability and pricing
- Be friendly, professional, and concise

Guidelines:
- Only recommend products that are mentioned in the context provided
- If you don't have information about something, say so clearly
- Don't make up product details or prices
- Keep responses conversational and natural
- If asked about orders or account-specific info, politely explain you need to escalate to human support`;
}

export function buildProductContext(searchResults: any[]): string {
  if (searchResults.length === 0) {
    return "No relevant products found in the catalog.";
  }

  let context = "Here are the relevant products from our catalog:\n\n";

  searchResults.forEach((result, index) => {
    const meta = result.metadata;

    context += `Product ${index + 1}: ${meta.title}
Price: $${meta.price}
Available: ${meta.available ? "Yes" : "No"}
Collections: ${meta.collections.join(", ")}
Tags: ${meta.tags.join(", ")}
${result.content}
---\n`;
  });

  return context;
}

export function buildUserPrompt(query: string, productContext: string): string {
  return `Context about our products:
${productContext}

Customer question: ${query}

Please provide a helpful response based on the product information above.`;
}

export function buildQueryRefinementPrompt(
  query: string,
  history: any[]
): string {
  const historyText = history
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n");

  return `Given the following conversation history and a new user question, rewrite the user question to be a standalone search query that can be used to find relevant products in a catalog.

Conversation History:
${historyText}

New User Question: ${query}

Your task is to:
1. Identify if the new question depends on previous context (e.g., "how much is it?", "do you have more like that?")
2. If it does, rewrite it as a complete, specific search query (e.g., "What is the price of the Premium Wireless Headphones?")
3. If the question is already standalone, return it as is.
4. ONLY return the rewritten query text. No explanations.`;
}
