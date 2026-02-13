import { searchProducts } from './embeddings.server';

export interface SearchFilters {
  priceRange?: { min?: number; max?: number };
  collections?: string[];
  tags?: string[];
  availability?: boolean;
  productTypes?: string[]; // Keywords like "headphones", "shirt", etc.
}

export async function searchProductsWithFilters(
  merchantId: number,
  searchQuery: string,
  filters: SearchFilters = {},
  limit: number = 10
) {
  // Step 1: Get vector search results (larger set to allow for filtering)
  const vectorResults = await searchProducts(merchantId, searchQuery, limit * 3);
  
  // Step 2: Apply filters
  let filtered = vectorResults;
  
  if (filters.priceRange) {
    filtered = filtered.filter((product: any) => {
      const price = product.metadata.price;
      const { min, max } = filters.priceRange!;
      return (!min || price >= min) && (!max || price <= max);
    });
  }
  
  if (filters.collections && filters.collections.length > 0) {
    filtered = filtered.filter((product: any) => 
      filters.collections!.some(col => 
        product.metadata.collections.includes(col)
      )
    );
  }
  
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((product: any) =>
      filters.tags!.some(tag => 
        product.metadata.tags.includes(tag)
      )
    );
  }
  
  if (filters.productTypes && filters.productTypes.length > 0) {
    filtered = filtered.filter((product: any) => {
      const searchableText = [
        product.metadata.title,
        product.metadata.product_type,
        ...(product.metadata.tags || [])
      ].join(' ').toLowerCase();
      
      // Check if ANY of the product type keywords appear in the searchable text
      return filters.productTypes!.some(type => 
        searchableText.includes(type.toLowerCase())
      );
    });
  }
  
  if (filters.availability !== undefined) {
    filtered = filtered.filter((product: any) => 
      product.metadata.available === filters.availability
    );
  }
  
  // Step 3: Re-rank by similarity and return top N
  return filtered
    .sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, limit);
}
