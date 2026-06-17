CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS post_embeddings (
    post_id BIGINT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    github_url TEXT,
    tags TEXT NOT NULL DEFAULT '',
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_embeddings_embedding
ON post_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
