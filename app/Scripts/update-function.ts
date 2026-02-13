
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

async function updateFunction() {
  const client = await pool.connect();
  try {
    console.log("Updating match_product_hybrid_v2 function with lower threshold...");
    
    await client.query(`
      CREATE OR REPLACE FUNCTION match_product_hybrid_v2 (
        query_embedding vector(1536),
        merchant_id int,
        match_count int,
        full_text_query text DEFAULT ''
      ) RETURNS TABLE (
        id bigint,
        content text,
        metadata jsonb,
        similarity float,
        rank float
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- If no text query, fallback to vector search
        IF full_text_query IS NULL OR full_text_query = '' THEN
          RETURN QUERY
          SELECT
            pe.id,
            pe.content,
            pe.metadata,
            (1 - (pe.embedding <=> query_embedding))::float AS similarity,
            0.0::float as rank
          FROM product_embeddings pe
          WHERE pe.merchant_id = match_product_hybrid_v2.merchant_id
          ORDER BY pe.embedding <=> query_embedding
          LIMIT match_count;
        ELSE
          -- Hybrid Search: Combine Vector Similarity + Full Text Rank
          RETURN QUERY
          SELECT
            pe.id,
            pe.content,
            pe.metadata,
            (1 - (pe.embedding <=> query_embedding))::float AS similarity,
            ts_rank(pe.fts, websearch_to_tsquery('english', full_text_query))::float as rank
          FROM product_embeddings pe
          WHERE pe.merchant_id = match_product_hybrid_v2.merchant_id
            AND (
              -- Match either vector similarity OR keyword match
              -- LOWERED THRESHOLD TO 0.1 for Mock Embeddings compatibility
              (1 - (pe.embedding <=> query_embedding)) > 0.1
              OR
              pe.fts @@ websearch_to_tsquery('english', full_text_query)
            )
          ORDER BY 
            -- Simple weighted score: 70% vector, 30% keyword
            ((1 - (pe.embedding <=> query_embedding)) * 0.7 + 
             COALESCE(ts_rank(pe.fts, websearch_to_tsquery('english', full_text_query)), 0) * 0.3) DESC
          LIMIT match_count;
        END IF;
      END;
      $$;
    `);

    console.log("✅ Function updated successfully!");

  } catch (err) {
    console.error("Error updating function:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

updateFunction();
