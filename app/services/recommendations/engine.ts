import { vectorStore, SearchResult } from '../vectorStore';

export interface ProductRecommendation {
  id: string;
  title: string;
  description: string;
  price: string;
  shopifyId: string;
  similarity: number;
}

/**
 * Get product recommendations based on a user query or context
 * @param merchantId Merchant UUID
 * @param query User's query or context (e.g., "blue jeans", "gifts for mom")
 * @param options Additional filtering options
 */
export async function getRecommendations(
  merchantId: string,
  query: string,
  options?: {
    limit?: number;
    inStockOnly?: boolean;
    priceRange?: string;
  }
): Promise<ProductRecommendation[]> {
  const limit = options?.limit || 5;
  const inStockOnly = options?.inStockOnly ?? true;

  // Search vector store for similar products
  const results = await vectorStore.search(query, {
    merchantId,
    limit,
    minSimilarity: 0.6,
    filters: {
      docTypes: ['product'],
      inStock: inStockOnly,
      priceRange: options?.priceRange,
    },
  });

  // Format results as product recommendations
  return results.map(result => ({
    id: result.id,
    title: extractTitle(result.content),
    description: extractDescription(result.content),
    price: result.metadata.priceRange || 'N/A',
    shopifyId: result.metadata.shopifyId || '',
    similarity: result.similarity,
  }));
}

/**
 * Extract product title from content string
 */
function extractTitle(content: string): string {
  const lines = content.split('\n');
  const titleLine = lines.find(line => line.startsWith('Product:'));
  return titleLine ? titleLine.replace('Product:', '').trim() : 'Unknown Product';
}

/**
 * Extract product description from content string
 */
function extractDescription(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  // Get lines between title and other metadata
  const description = lines
    .slice(1, 3)
    .filter(line => !line.includes(':'))
    .join(' ')
    .trim();

  return description.length > 150
    ? description.substring(0, 150) + '...'
    : description;
}

/**
 * Format recommendations into a readable message for the chat
 */
export function formatRecommendationsMessage(
  recommendations: ProductRecommendation[]
): string {
  if (recommendations.length === 0) {
    return "I don't have any specific product recommendations at the moment, but I'd be happy to help you find what you're looking for!";
  }

  let message = "Here are some products I think you'll love:\n\n";

  recommendations.forEach((rec, i) => {
    message += `${i + 1}. ${rec.title}\n`;
    if (rec.description) {
      message += `   ${rec.description}\n`;
    }
    message += `   Price range: ${rec.price}\n\n`;
  });

  return message;
}
