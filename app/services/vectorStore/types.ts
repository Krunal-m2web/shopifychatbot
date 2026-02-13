/**
 * Vector Store Abstraction Types
 *
 * Defines the interface for vector operations using Neon pgvector.
 */

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    merchantId: string;
    docType: 'product' | 'policy' | 'collection' | 'faq';
    shopifyId?: string;
    collectionIds?: string[];
    priceRange?: string;
    inStock?: boolean;
    tags?: string[];
    [key: string]: any;
  };
}

export interface SearchOptions {
  merchantId: string;
  limit?: number;
  minSimilarity?: number;
  filters?: {
    docTypes?: string[];
    inStock?: boolean;
    collectionIds?: string[];
    priceRange?: string;
  };
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export interface VectorStore {
  /**
   * Insert or update documents in the vector store
   */
  upsert(documents: VectorDocument[]): Promise<void>;

  /**
   * Search for similar documents using vector similarity
   */
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;

  /**
   * Delete documents by their IDs
   */
  delete(ids: string[]): Promise<void>;

  /**
   * Delete all documents for a specific merchant
   */
  deleteByMerchant(merchantId: string): Promise<void>;
}
