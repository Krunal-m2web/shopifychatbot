-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table (managed outside Prisma because of vector column type)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('product', 'policy', 'collection', 'faq')),
  shopify_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW vector index for fast similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents
USING hnsw (embedding vector_cosine_ops);

-- Filtering indexes
CREATE INDEX IF NOT EXISTS documents_merchant_type_idx ON documents (merchant_id, doc_type);
CREATE INDEX IF NOT EXISTS documents_merchant_idx ON documents (merchant_id);
CREATE INDEX IF NOT EXISTS documents_shopify_id_idx ON documents (shopify_id) WHERE shopify_id IS NOT NULL;

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding VECTOR(1536),
  match_merchant UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_doc_types TEXT[] DEFAULT NULL,
  filter_in_stock BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  doc_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    d.doc_type,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE d.merchant_id = match_merchant
    AND (filter_doc_types IS NULL OR d.doc_type = ANY(filter_doc_types))
    AND (filter_in_stock IS NULL OR (d.metadata->>'inStock')::boolean = filter_in_stock)
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search function (combines semantic + keyword search)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_merchant UUID,
  match_count INT DEFAULT 5,
  keyword_weight FLOAT DEFAULT 0.3,
  semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic AS (
    SELECT
      d.id,
      d.content,
      d.metadata,
      1 - (d.embedding <=> query_embedding) AS score
    FROM documents d
    WHERE d.merchant_id = match_merchant
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword AS (
    SELECT
      d.id,
      ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', query_text)) AS score
    FROM documents d
    WHERE d.merchant_id = match_merchant
      AND to_tsvector('english', d.content) @@ plainto_tsquery('english', query_text)
    LIMIT match_count * 2
  )
  SELECT
    s.id,
    s.content,
    s.metadata,
    (COALESCE(s.score, 0) * semantic_weight + COALESCE(k.score, 0) * keyword_weight) AS combined_score
  FROM semantic s
  LEFT JOIN keyword k ON s.id = k.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;
