import { searchProducts } from './embeddings.server';
import { query } from '~/utils/db.server';

export interface SimilarProductOptions {
  limit?: number;
  priceRangePercent?: number; // ±% price range
  minSimilarity?: number;
}

/**
 * Find products similar to a given product
 * Based on:
 * - Vector similarity (embeddings)
 * - Shared collections
 * - Similar price range
 * - Common tags
 */
export async function findSimilarProducts(
  merchantId: number,
  productId: string,
  sessionId?: string,
  options: SimilarProductOptions = {}
) {
  const {
    limit = 5,
    priceRangePercent = 20,
    minSimilarity = 0.5
  } = options;

  try {
    // Step 1: Get the reference product
    const productResult = await query(
      `SELECT * FROM products WHERE merchant_id = $1 AND shopify_id = $2`,
      [merchantId, productId]
    );

    if (productResult.rows.length === 0) {
      throw new Error(`Product ${productId} not found`);
    }

    const product = productResult.rows[0];
    
    // Step 2: Build search query from product attributes
    const searchQuery = [
      product.title,
      ...(product.tags || []),
      ...(product.collections || [])
    ].join(' ');

    // Step 3: Perform vector search
    const vectorResults = await searchProducts(merchantId, searchQuery, limit * 3);

    // Step 4: Filter and score results
    const priceMin = product.price * (1 - priceRangePercent / 100);
    const priceMax = product.price * (1 + priceRangePercent / 100);

    const scoredResults = vectorResults
      .filter((result: any) => {
        // Exclude the same product
        if (result.metadata.productId === productId) return false;
        
        // Filter by minimum similarity
        if ((result.similarity || 0) < minSimilarity) return false;
        
        return true;
      })
      .map((result: any) => {
        let similarityScore = result.similarity || 0;
        
        // Boost for shared collections
        const sharedCollections = (product.collections || []).filter(
          (col: string) => (result.metadata.collections || []).includes(col)
        );
        similarityScore += sharedCollections.length * 0.1;
        
        // Boost for shared tags
        const sharedTags = (product.tags || []).filter(
          (tag: string) => (result.metadata.tags || []).includes(tag)
        );
        similarityScore += sharedTags.length * 0.05;
        
        // Boost for similar price
        const resultPrice = result.metadata.price || 0;
        if (resultPrice >= priceMin && resultPrice <= priceMax) {
          similarityScore += 0.15;
        }
        
        return {
          ...result,
          similarityScore
        };
      })
      .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))
      .slice(0, limit);

    // Step 5: Format results
    return scoredResults.map((result: any) => ({
      id: result.metadata.productId,
      title: result.metadata.title,
      price: result.metadata.price,
      image: result.metadata.image, // Include image
      tags: result.metadata.tags || [],
      collections: result.metadata.collections || [],
      available: result.metadata.available ?? true,
      similarity: result.similarityScore,
      description: result.content?.substring(0, 150)
    }));

  } catch (error) {
    console.error('Error finding similar products:', error);
    throw error;
  }
}
