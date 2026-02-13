import { getUserPreferences } from './user-preferences.server';

export interface Product {
  id: string;
  title: string;
  price: number;
  image?: string;
  url?: string;
  description?: string;
  tags: string[];
  similarity?: number;
  personalizedScore?: number;
}

export function formatProductRecommendations(
  products: Product[],
  context?: string
): string {
  if (products.length === 0) {
    return "I couldn't find any products matching your criteria. Could you provide more details?";
  }
  
  let response = context 
    ? `${context}\n\nHere are my recommendations:\n\n` 
    : "Here are the products I found:\n\n";
  
  products.forEach((product, index) => {
    response += `${index + 1}. **${product.title}**\n`;
    response += `   💰 Price: $${product.price.toFixed(2)}\n`;
    
    if (product.tags && product.tags.length > 0) {
      response += `   🏷️ Tags: ${product.tags.slice(0, 3).join(', ')}\n`;
    }
    
    if (product.description) {
      const shortDesc = product.description.substring(0, 80);
      response += `   📝 ${shortDesc}${product.description.length > 80 ? '...' : ''}\n`;
    }
    
    response += '\n';
  });
  
  response += "Would you like more details about any of these products?";
  
  return response;
}

export function formatPriceRecommendations(products: Product[]): string {
  if (products.length === 0) {
    return "I couldn't find products in that price range.";
  }
  
  const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
  const minPrice = Math.min(...products.map(p => p.price));
  const maxPrice = Math.max(...products.map(p => p.price));
  
  let response = `I found ${products.length} products in your price range:\n`;
  response += `💵 Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}\n`;
  response += `📊 Average: $${avgPrice.toFixed(2)}\n\n`;
  
  response += formatProductRecommendations(products);
  
  return response;
}

export async function personalizeRecommendations(
  sessionId: string,
  products: any[]
): Promise<Product[]> {
  const prefs = await getUserPreferences(sessionId);

  const getDescription = (product: any) => {
    if (product.metadata?.description) {
      return product.metadata.description;
    }
    const raw = String(product.content || "");
    const marker = raw.indexOf("Description");
    if (marker >= 0) {
      const body = raw.slice(marker);
      const newLine = body.indexOf("\n");
      return (newLine >= 0 ? body.slice(newLine + 1) : body).trim();
    }
    return raw.trim();
  };
  
  return products.map(product => {
    let score = product.similarity || 0;
    
    // Boost based on category preferences (tags)
    product.metadata?.tags?.forEach((tag: string) => {
      const weight = prefs.categoryPreferences[tag] || 0;
      score += weight * 0.1; // 10% boost per previous search
    });
    
    // Boost based on collection preferences (NEW)
    product.metadata?.collections?.forEach((collection: string) => {
      const weight = prefs.categoryPreferences[collection] || 0;
      score += weight * 0.15; // 15% boost for collection matches (higher than tags)
    });
    
    // Penalize already viewed products
    if (prefs.viewedProducts.includes(product.metadata?.productId)) {
      score *= 0.7; // 30% penalty
    }
    
    // Boost if in preferred price range
    if (prefs.pricePreference) {
      const { min, max } = prefs.pricePreference;
      if (product.metadata?.price >= min && product.metadata?.price <= max) {
        score *= 1.2; // 20% boost
      }
    }
    
    return { 
      id: product.metadata?.productId || 'Unknown',
      title: product.metadata?.title || 'Unknown',
      price: product.metadata?.price || 0,
      image: product.metadata?.image || product.metadata?.imageUrl || product.metadata?.image_url, // Include image
      available: product.metadata?.available ?? true, // Include availability
      tags: product.metadata?.tags || [],
      collections: product.metadata?.collections || [], // Include collections
      description: getDescription(product),
      similarity: product.similarity,
      personalizedScore: score 
    };
  })
  .sort((a, b) => (b.personalizedScore || 0) - (a.personalizedScore || 0));
}
