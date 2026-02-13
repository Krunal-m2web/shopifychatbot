import { sql } from '../../lib/neon';
import { generateEmbedding } from '../rag/embeddings';
import { VectorStore, VectorDocument, SearchOptions, SearchResult } from './types';

export class NeonVectorStore implements VectorStore {
  async upsert(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      await sql`
        INSERT INTO documents (id, content, embedding, merchant_id, doc_type, shopify_id, metadata)
        VALUES (
          ${doc.id},
          ${doc.content},
          ${JSON.stringify(doc.embedding)}::vector,
          ${doc.metadata.merchantId}::uuid,
          ${doc.metadata.docType},
          ${doc.metadata.shopifyId || null},
          ${JSON.stringify(doc.metadata)}::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `;
    }
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const queryEmbedding = await generateEmbedding(query);
    const threshold = options.minSimilarity ?? 0.7;
    const limit = options.limit ?? 5;

    // Build the filter conditions
    let filterConditions = sql`merchant_id = ${options.merchantId}::uuid`;

    if (options.filters?.docTypes && options.filters.docTypes.length > 0) {
      filterConditions = sql`${filterConditions} AND doc_type = ANY(${options.filters.docTypes})`;
    }

    if (options.filters?.inStock !== undefined) {
      filterConditions = sql`${filterConditions} AND (metadata->>'inStock')::boolean = ${options.filters.inStock}`;
    }

    const results = await sql`
      SELECT
        id,
        content,
        metadata,
        doc_type,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
      FROM documents
      WHERE ${filterConditions}
        AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${threshold}
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit}
    `;

    return results.map((row: any) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: row.similarity,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await sql`DELETE FROM documents WHERE id = ANY(${ids})`;
  }

  async deleteByMerchant(merchantId: string): Promise<void> {
    await sql`DELETE FROM documents WHERE merchant_id = ${merchantId}::uuid`;
  }
}
