-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create product embeddings table (if not exists)
CREATE TABLE IF NOT EXISTS product_embeddings (
  id BIGSERIAL PRIMARY KEY,
  merchant_id INTEGER NOT NULL,
  product_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  -- Add tsvector column for hybrid search (keyword matching)
  fts tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_product_embeddings_merchant ON product_embeddings(merchant_id);
CREATE INDEX IF NOT EXISTS idx_product_embeddings_fts ON product_embeddings USING GIN (fts);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE product_embeddings ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Policy for inserting data: Merchants can only insert rows with their own merchant_id
-- Note: In a real Supabase app, we'd check auth.uid(). 
-- For this custom implementation, we assume the application enforces the merchant_id check in the WHERE clause,
-- but we enable RLS to enforce future auth integration.
-- For now, we created a policy that allows all operations if true (since we handle auth in app code),
-- BUT in a real scenario, this would be: "merchant_id = (select merchant_id from auth.users where id = auth.uid())"
DROP POLICY IF EXISTS "Enable all access for now" ON product_embeddings;
CREATE POLICY "Enable all access for now" ON product_embeddings FOR ALL USING (true);


-- 6. Create Hybrid Search Function
DROP FUNCTION IF EXISTS match_product_hybrid(vector, int, int, text);
DROP FUNCTION IF EXISTS match_product_hybrid_v2(vector, int, int, text);

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
        (1 - (pe.embedding <=> query_embedding)) > 0.5
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
