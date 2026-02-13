export type UserIntent = 
  | 'product_search'
  | 'product_comparison'
  | 'order_tracking'
  | 'general_question'
  | 'price_inquiry'
  | 'availability_check';

export interface IntentResult {
  intent: UserIntent;
  confidence: number;
  entities: {
    productType?: string[];
    priceRange?: { min?: number; max?: number };
    features?: string[];
    brands?: string[];
  };
}

export async function detectIntent(message: string): Promise<IntentResult> {
  const lowerMsg = message.toLowerCase();
  
  // Price inquiry patterns
  if (/price|cost|expensive|cheap|budget|how much/.test(lowerMsg)) {
    const priceRange = extractPriceRange(lowerMsg);
    const productType = extractProductTypes(lowerMsg); // Extract product type here too!
    return {
      intent: 'price_inquiry',
      confidence: 0.9,
      entities: { priceRange, productType }
    };
  }
  
  // Product search patterns
  if (/looking for|need|want|show me|recommend/.test(lowerMsg)) {
    const productType = extractProductTypes(lowerMsg);
    const features = extractFeatures(lowerMsg);
    
    return {
      intent: 'product_search',
      confidence: 0.85,
      entities: { productType, features }
    };
  }
  
  // Comparison patterns
  if (/compare|difference|versus|vs|better/.test(lowerMsg)) {
    return {
      intent: 'product_comparison',
      confidence: 0.8,
      entities: {}
    };
  }
  
  // Default to general question
  return {
    intent: 'general_question',
    confidence: 0.5,
    entities: {}
  };
}

function extractPriceRange(text: string): { min?: number; max?: number } {
  const range: { min?: number; max?: number } = {};
  
  // Pattern: "under $50"
  const underMatch = text.match(/under\s+\$?(\d+)/i);
  if (underMatch) {
    range.max = parseInt(underMatch[1]);
  }
  
  // Pattern: "over $100"
  const overMatch = text.match(/over|above\s+\$?(\d+)/i);
  if (overMatch) {
    range.min = parseInt(overMatch[1]);
  }
  
  // Pattern: "$50 to $100" or "$50-$100"
  const rangeMatch = text.match(/\$?(\d+)\s*(?:to|-)\s*\$?(\d+)/i);
  if (rangeMatch) {
    range.min = parseInt(rangeMatch[1]);
    range.max = parseInt(rangeMatch[2]);
  }
  
  return range;
}

function extractProductTypes(text: string): string[] {
  const types: string[] = [];
  const keywords = ['headphones', 'shirt', 't-shirt', 'tshirt', 'laptop', 'phone', 'watch'];
  
  keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      types.push(keyword);
    }
  });
  
  return types;
}

function extractFeatures(text: string): string[] {
  const features: string[] = [];
  const featureKeywords = ['wireless', 'bluetooth', 'waterproof', 'organic', 'premium', 'lightweight'];
  
  featureKeywords.forEach(feature => {
    if (text.includes(feature)) {
      features.push(feature);
    }
  });
  
  return features;
}
