# pgvector RAG Storage

The AI server stores RAG embeddings in PostgreSQL with pgvector instead of ChromaDB.

## What Changed

- ChromaDB is no longer required.
- FastAPI reads source posts from PostgreSQL.
- FastAPI stores embeddings in the `post_embeddings` table.
- RAG search, related posts, tag suggestions, and Agent `search_posts` use pgvector similarity search.

## Schema

Apply this before production deployment:

```bash
psql -d bulletin_board -f ai-server/sql/pgvector_schema.sql
```

The FastAPI server also attempts to create the extension, table, and index when embedding/search endpoints run.

## Runtime Flow

1. Spring Boot creates, updates, or deletes a post.
2. Spring Boot calls FastAPI `/rag/embed/{post_id}` or `DELETE /rag/embed/{post_id}`.
3. FastAPI reads the post from PostgreSQL.
4. FastAPI creates an OpenAI embedding.
5. FastAPI upserts or deletes the row in `post_embeddings`.
6. AI search and Agent queries use pgvector cosine distance.

## Requirements

- PostgreSQL must have the pgvector extension available.
- The default embedding dimension is `1536` for `text-embedding-3-small`.
- If `EMBEDDING_MODEL` changes, `EMBEDDING_DIMENSION` and the table schema must match.
