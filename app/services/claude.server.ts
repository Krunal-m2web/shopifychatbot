// import Anthropic from "@anthropic-ai/sdk";

// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  confidence: number;
}

export async function generateResponse(
  systemPrompt: string,
  messages: Message[],
  maxTokens: number = 1024
): Promise<AIResponse> {
  try {
    // In a real application, you would pass the entire messages array to Anthropic
    // For the mock, we simulate context-awareness
    const lastMessage = messages[messages.length - 1];
    const previousMessages = messages.slice(0, -1);
    
    return await askClaude({ 
      system: systemPrompt, 
      user: lastMessage.content,
      history: previousMessages
    });
  } catch (error) {
    console.error("Error generating response:", error);
    throw error;
  }
}

export async function refineQuery(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  try {
    // In a real app, this would call Claude with the refinement prompt
    // For now, we use a simple mock or the userPrompt itself if it's already specific
    console.log("🔄 Refining user query...");
    
    // Simulating AI refinement
    const response = await askClaude({ system: systemPrompt, user: userPrompt });
    return response.content.replace("🤖 (Mock AI Response)", "").trim();
  } catch (error) {
    console.error("Error refining query:", error);
    return userPrompt; // Fallback to original
  }
}


// Mock Claude (FREE, local dev only)
// This file simulates Claude responses so you can test your RAG pipeline
// without paying for Anthropic API.

export async function askClaude(params: { 
  system: string; 
  user: string;
  history?: Message[];
}): Promise<AIResponse> {
  const { user, history = [] } = params;

  // Extract product titles from the context if present
  const lines = user.split("\n");

  const productTitles: string[] = [];

  for (const line of lines) {
    // Example: "Product 1: Premium Wireless Headphones"
    if (line.startsWith("Product ") && line.includes(":")) {
      const title = line.split(":")[1]?.trim();
      if (title) productTitles.push(title);
    }
  }

  const questionLine = user.split("Customer question:")[1];
  const question = questionLine?.split("Please provide")[0]?.trim() || user;

  // Simple mock reply refinement detection
  if (params.system.includes("standalone search query")) {
    // Mocking query refinement: if user asks "What's the price?" and history mentions headphones
    if (question.toLowerCase().includes("price") && history.some(m => m.content.toLowerCase().includes("headphone"))) {
      return { 
        content: "What is the price of the Premium Wireless Headphones?", 
        confidence: 0.95 
      };
    }
    return { content: question, confidence: 1.0 };
  }

  // Simple mock reply
  if (!productTitles.length) {
    return {
      content: `🤖 (Mock AI)\nI couldn't find any matching products for: "${question}".`,
      confidence: 0.1
    };
  }

  // Calculate mock confidence based on context presence
  const confidence = productTitles.length > 0 ? 0.9 : 0.5;

  // Handle price-specific follow-ups in mock
  if (question.toLowerCase().includes("price")) {
    const firstProduct = productTitles[0];
    // We don't have the price here but we can mock it based on titles we know
    let price = "variable";
    if (firstProduct.includes("Headphones")) price = "$299.99";
    if (firstProduct.includes("T-Shirt")) price = "$29.99";

    return {
      content: `🤖 (Mock AI Response)\n\nThe ${firstProduct} is currently priced at ${price}. Would you like to add it to your cart?`,
      confidence: 0.98
    };
  }

  return {
    content: `
🤖 (Mock AI Response)

You asked: "${question}"

Here are the top matching products I found:
${productTitles.slice(0, 3).map((t, i) => `${i + 1}. ${t}`).join("\n")}

Tip: When you add real Claude API later, responses will become natural and conversational.
    `.trim(),
    confidence
  };
}
