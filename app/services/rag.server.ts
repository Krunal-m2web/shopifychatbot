import { searchProducts } from "./embeddings.server";
import { generateResponse, refineQuery } from "./claude.server";
import {
  buildSystemPrompt,
  buildProductContext,
  buildUserPrompt,
  buildQueryRefinementPrompt,
} from "./prompts.server";

export interface RAGResponse {
  answer: string;
  sources: any[];
  conversationId?: string;
  confidenceScore?: number; // [NEW] Response scoring
}

export async function answerProductQuery(
  merchantId: number,
  query: string,
  conversationHistory: any[] = [],
  storeName?: string
): Promise<RAGResponse> {
  try {
    // Step 1: Refine query if there's history
    let searchParameters = query;
    if (conversationHistory.length > 0) {
      console.log("🔄 History detected, refining query...");
      const refinementPrompt = buildQueryRefinementPrompt(query, conversationHistory);
      searchParameters = await refineQuery("", refinementPrompt);
      console.log("✅ Refined query:", searchParameters);
    }

    // Step 2: Retrieve relevant products using vector search (Hybrid enabled)
    console.log("🔍 Searching for relevant products for query:", searchParameters);
    const searchResults = await searchProducts(merchantId, searchParameters, 5);
    console.log(`✅ Found ${searchResults.length} relevant products`);

    // Step 3: Build context from search results
    console.log("📝 Building product context...");
    const productContext = buildProductContext(searchResults);

    // Step 4: Build system prompt
    const systemPrompt = buildSystemPrompt(storeName);

    // Step 5: Build user prompt with context
    const userPrompt = buildUserPrompt(query, productContext);

    // Step 6: Prepare conversation messages
    const messages = [
      ...conversationHistory,
      {
        role: "user" as const,
        content: userPrompt,
      },
    ];

    // Step 7: Generate response with Claude (Structured Output)
    console.log("🤖 Requesting response from (Mock) AI...");
    const aiResponse = await generateResponse(systemPrompt, messages, 1024);
    console.log("✅ AI response generated. Confidence:", aiResponse.confidence);

    // Step 8: Fallback handling for low confidence
    let finalAnswer = aiResponse.content;
    if (aiResponse.confidence < 0.5) {
      console.warn("⚠️ Low confidence response detected");
      // Optionally modify answer or add disclaimer
      // finalAnswer += "\n\n(Note: I'm not 100% sure about this, please contact support to verify.)";
    }

    return {
      answer: finalAnswer,
      confidenceScore: aiResponse.confidence,
      sources: searchResults.map((r: any) => ({
        title: r.metadata.title,
        price: r.metadata.price,
        similarity: r.similarity,
        rank: r.rank, // Included from hybrid search
        productId: r.product_id,
        chunkIndex: r.metadata.chunkIndex // Included from chunking
      })),
    };
  } catch (error) {
    console.error("RAG error:", error);
    throw error;
  }
}

// For multi-turn conversations
export async function continueConversation(
  merchantId: number,
  query: string,
  conversationHistory: any[],
  storeName?: string
): Promise<RAGResponse> {
  // Same as answerProductQuery but uses existing conversation history
  return answerProductQuery(merchantId, query, conversationHistory, storeName);
}
