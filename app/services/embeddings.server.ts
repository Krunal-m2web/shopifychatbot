import { generateEmbedding, generateEmbeddings, STOP_WORDS } from "./openai.server";
import { vectorStore } from "./vector-store.server";
import { transformProductsToDocuments } from "./product-transformer.server";

// ... (keep generateProductEmbeddings as is) ...
export async function generateProductEmbeddings(
  merchantId: number,
  products: any[]
) {
  // 1. Transform products into documents (chunks)
  const documents = transformProductsToDocuments(products);

  if (documents.length === 0) {
    console.log("⚠️ No documents to embed");
    return 0;
  }

  console.log(`📄 Generated ${documents.length} documents from ${products.length} products`);

  // 2. Generate embeddings for all documents
  const textsToEmbed = documents.map(doc => doc.content);
  const embeddings = await generateEmbeddings(textsToEmbed);

  // 3. Store in vector database
  await vectorStore.addDocuments(merchantId, documents, embeddings);

  return documents.length;
}

export async function searchProducts(
  merchantId: number,
  query: string,
  limit: number = 5
) {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Filter stop words for better Full Text Search precision
  // Postgres websearch_to_tsquery is strict about "I", "need" etc. if they are not in its own stoplist.
  const keywords = query.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .join(" ");

  // Use the keywords if available, otherwise fallback to original query
  const fullTextQuery = keywords.length > 0 ? keywords : query;

  console.log(`🔎 Searching: "${query}" -> Keywords: "${fullTextQuery}"`);

  // Search using VectorStore (with Hybrid Search support)
  const results = await vectorStore.search(merchantId, queryEmbedding, {
    limit,
    fullTextQuery: fullTextQuery 
  });

  return results;
}
