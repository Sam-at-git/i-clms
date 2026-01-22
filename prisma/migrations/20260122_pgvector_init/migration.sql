-- Migration: pgvector Foundation
-- Created: 2026-01-22
-- Description: Enable pgvector extension and create vector storage tables

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Vector embedding cache table
CREATE TABLE IF NOT EXISTS embedding_cache (
  id SERIAL PRIMARY KEY,
  text_hash VARCHAR(64) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  embedding vector(1024),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(text_hash, model_name)
);

-- Indexes for embedding_cache
CREATE INDEX IF NOT EXISTS idx_embedding_cache_text ON embedding_cache(text_hash, model_name);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_vector ON embedding_cache USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- LLM result cache table
CREATE TABLE IF NOT EXISTS llm_cache (
  id SERIAL PRIMARY KEY,
  prompt_hash VARCHAR(64) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  request TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(prompt_hash, model_name)
);

-- Indexes for llm_cache
CREATE INDEX IF NOT EXISTS idx_llm_cache_prompt ON llm_cache(prompt_hash, model_name);
CREATE INDEX IF NOT EXISTS idx_llm_cache_expires ON llm_cache(expires_at);

-- Contract chunks vector table (for RAG retrieval)
CREATE TABLE IF NOT EXISTS contract_chunks (
  id SERIAL PRIMARY KEY,
  contract_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  chunk_type VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(contract_id, chunk_index)
);

-- Foreign key constraint for contract_chunks (deferred to avoid circular dependency)
ALTER TABLE contract_chunks
  ADD CONSTRAINT IF NOT EXISTS fk_contract_chunks_contract
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Indexes for contract_chunks
CREATE INDEX IF NOT EXISTS idx_contract_chunks_contract ON contract_chunks(contract_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_contract_chunks_vector ON contract_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Document fingerprint cache table
CREATE TABLE IF NOT EXISTS document_fingerprint (
  id SERIAL PRIMARY KEY,
  file_hash VARCHAR(64) UNIQUE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  parse_result JSONB NOT NULL,
  strategy VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Indexes for document_fingerprint
CREATE INDEX IF NOT EXISTS idx_document_fingerprint_hash ON document_fingerprint(file_hash);
CREATE INDEX IF NOT EXISTS idx_document_fingerprint_expires ON document_fingerprint(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_embedding_cache_updated_at ON embedding_cache;
CREATE TRIGGER update_embedding_cache_updated_at BEFORE UPDATE ON embedding_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_chunks_updated_at ON contract_chunks;
CREATE TRIGGER update_contract_chunks_updated_at BEFORE UPDATE ON contract_chunks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
