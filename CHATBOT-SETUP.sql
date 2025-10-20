-- RAG Chatbot Setup for Supabase
-- Run this SQL in your Supabase SQL Editor

-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the policy_embeddings table
CREATE TABLE IF NOT EXISTS policy_embeddings (
  id BIGSERIAL PRIMARY KEY,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  policy_slug TEXT NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embedding size
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(policy_slug, chunk_index)
);

-- 3. Create an index for fast vector similarity search
CREATE INDEX IF NOT EXISTS policy_embeddings_embedding_idx 
  ON policy_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Create index for policy lookups
CREATE INDEX IF NOT EXISTS policy_embeddings_policy_slug_idx 
  ON policy_embeddings(policy_slug);

-- 5. Enable Row Level Security
ALTER TABLE policy_embeddings ENABLE ROW LEVEL SECURITY;

-- 6. Allow public read access
CREATE POLICY "Allow public read access to embeddings"
  ON policy_embeddings
  FOR SELECT
  TO public
  USING (true);

-- 7. Allow service role full access
CREATE POLICY "Allow service role full access to embeddings"
  ON policy_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. Create a function to search similar content
CREATE OR REPLACE FUNCTION match_policy_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  policy_slug text,
  chunk_index int,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    policy_embeddings.id,
    policy_embeddings.policy_slug,
    policy_embeddings.chunk_index,
    policy_embeddings.content,
    1 - (policy_embeddings.embedding <=> query_embedding) as similarity
  FROM policy_embeddings
  WHERE 1 - (policy_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY policy_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Done! Your database is ready for RAG chatbot
