import { query } from '~/utils/db.server';

export interface CartItem {
  productId: string;
  title?: string;
  collections?: string[];
  tags?: string[];
  price?: number;
}

export interface CrossSellOptions {
  limit?: number;
  includeHigherTier?: boolean;
}

/**
 * Generate cross-sell product suggestions based on cart contents
 * Strategies:
 * 1. Products from same collections (frequently bought together)
 * 2. Products with matching tags (complementary items)
 * 3. Higher-priced items from same collection (upsell)
 */
export async function generateCrossSellSuggestions(
  merchantId: number,
  cartItems: CartItem[],
  sessionId?: string,
  options: CrossSellOptions = {}
) {
  const { limit = 5, includeHigherTier = true } = options;

  if (cartItems.length === 0) {
    return [];
  }

  try {
    // Extract collections and tags from cart items
    const collections = [...new Set(cartItems.flatMap(item => item.collections || []))];
    const tags = [...new Set(cartItems.flatMap(item => item.tags || []))];
    const cartProductIds = cartItems.map(item => item.productId);
    const avgPrice = cartItems.reduce((sum, item) => sum + (item.price || 0), 0) / cartItems.length;

    // Build query to find complementary products
    const result = await query(
      `SELECT 
        shopify_id,
        title,
        price,
        image,
        collections,
        tags,
        available
       FROM products 
       WHERE merchant_id = $1 
         AND available = true
         AND shopify_id != ALL($2)
       LIMIT 50`,
      [merchantId, cartProductIds]
    );

    // Score and rank products
    const scored = result.rows.map((product: any) => {
      let score = 0;

      // Boost for shared collections
      const sharedCollections = collections.filter(col => 
        (product.collections || []).includes(col)
      );
      score += sharedCollections.length * 2.0; // Strong signal

      // Boost for shared tags
      const sharedTags = tags.filter(tag => 
        (product.tags || []).includes(tag)
      );
      score += sharedTags.length * 0.5;

      // Boost for higher-tier products (upsell)
      if (includeHigherTier && product.price > avgPrice && product.price < avgPrice * 1.5) {
        score += 1.5; // Premium but not too expensive
      }

      // Boost for similar price point
      if (product.price >= avgPrice * 0.8 && product.price <= avgPrice * 1.2) {
        score += 0.5;
      }

      return {
        id: product.shopify_id,
        title: product.title,
        price: product.price,
        image: product.image,
        collections: product.collections || [],
        tags: product.tags || [],
        available: product.available,
        score
      };
    });

    // Return top N scored products
    return scored
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (error) {
    console.error('Cross-sell generation error:', error);
    throw error;
  }
}
