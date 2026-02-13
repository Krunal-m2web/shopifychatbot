import { query } from "~/utils/db.server";

export interface Document {
  content: string;
  metadata: Record<string, any>;
}

export interface VectorSearchOptions {
  limit?: number;
  fullTextQuery?: string; // For hybrid search
}

export interface SearchResult extends Document {
  similarity: number;
  rank?: number; // Hybrid search rank
}

export interface IVectorStore {
  addDocuments(
    merchantId: number,
    documents: Document[],
    embeddings: number[][]
  ): Promise<void>;
  
  deleteDocuments(merchantId: number): Promise<void>;
  
  search(
    merchantId: number,
    queryEmbedding: number[],
    options?: VectorSearchOptions
  ): Promise<SearchResult[]>;
}

export class SupabaseVectorStore implements IVectorStore {
  async addDocuments(
    merchantId: number,
    documents: Document[],
    embeddings: number[][]
  ): Promise<void> {
    // For insertion, we can still use Supabase client OR direct DB. 
    // Let's stick to direct DB for consistency and to avoid "missing table" cache issues too.
    
    // We need to construct the VALUES clause dynamically
    // But pg library handles arrays of values better if we do it one by one or unnest.
    // Given the scale might be small, loop is okay, or unnest.
    // Let's use unnest approach for bulk insert if possible, or just Promise.all
    
    // Actually, let's just loop for now, it's safer than complex array unnesting without pg-format
    const promises = documents.map((doc, index) => {
      return query(
        `INSERT INTO product_embeddings (merchant_id, product_id, content, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          merchantId,
          doc.metadata.productId,
          doc.content,
          JSON.stringify(embeddings[index]), // vector as string representation of JSON array works for casting
          JSON.stringify(doc.metadata)
        ]
      );
    });

    try {
      await Promise.all(promises);
    } catch (error) {
       console.error("Error inserting embeddings:", error);
       throw error;
    }
  }

  async deleteDocuments(merchantId: number): Promise<void> {
    try {
      await query(
        "DELETE FROM product_embeddings WHERE merchant_id = $1",
        [merchantId]
      );
    } catch (error) {
      console.error("Error deleting embeddings:", error);
      throw error;
    }
  }

  async search(
    merchantId: number,
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<SearchResult[]> {
    const limit = options.limit || 5;
    const fullTextQuery = options.fullTextQuery || "";

    try {
      // Direct SQL call to the RPC function
      // Note: vector string format needs to be valid. JSON.stringify([1,2,3]) produces "[1,2,3]" which PG vector accepts.
      const result = await query(
        "SELECT * FROM match_product_hybrid_v2($1, $2, $3, $4)",
        [
          JSON.stringify(queryEmbedding), 
          merchantId,
          limit,
          fullTextQuery
        ]
      );

      return result.rows.map((row: any) => ({
        content: row.content,
        metadata: row.metadata, // pg automatically parses JSONB columns
        similarity: row.similarity,
        rank: row.rank
      }));
    } catch (error) {
      console.error("Error searching embeddings (Direct DB):", error);
      throw error;
    }
  }
}

// Singleton instance
export const vectorStore = new SupabaseVectorStore();
