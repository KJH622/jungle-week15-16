import os
from typing import Any

import pg8000
from dotenv import load_dotenv

load_dotenv(encoding="utf-8")

EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "1536"))


def _connect():
    return pg8000.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "bulletin_board"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
    )


def _vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(str(value) for value in embedding) + "]"


def _row_to_post(row: tuple[Any, ...]) -> dict[str, Any]:
    return {
        "id": row[0],
        "title": row[1],
        "content": row[2],
        "author": row[3],
        "github_url": row[4],
        "tags": row[5].split(",") if row[5] else [],
    }


def get_posts():
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.id, p.title, p.content, u.nickname, p.github_url,
               STRING_AGG(t.name, ',') AS tags
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        GROUP BY p.id, p.title, p.content, u.nickname, p.github_url
        """
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [_row_to_post(row) for row in rows]


def get_post_by_id(post_id: int):
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.id, p.title, p.content, u.nickname, p.github_url,
               STRING_AGG(t.name, ',') AS tags
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.id = %s
        GROUP BY p.id, p.title, p.content, u.nickname, p.github_url
        """,
        (post_id,),
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    return _row_to_post(row) if row else None


def ensure_vector_store():
    conn = _connect()
    cur = conn.cursor()
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
    cur.execute(
        f"""
        CREATE TABLE IF NOT EXISTS post_embeddings (
            post_id BIGINT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            github_url TEXT,
            tags TEXT NOT NULL DEFAULT '',
            embedding vector({EMBEDDING_DIMENSION}) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_post_embeddings_embedding
        ON post_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )
    conn.commit()
    cur.close()
    conn.close()


def upsert_post_embedding(post: dict[str, Any], embedding: list[float]):
    ensure_vector_store()
    text = f"{post['title']} {post['content']}"
    tags = ",".join(post.get("tags", []))
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO post_embeddings (
            post_id, title, author, content, github_url, tags, embedding, updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s::vector, CURRENT_TIMESTAMP)
        ON CONFLICT (post_id) DO UPDATE SET
            title = EXCLUDED.title,
            author = EXCLUDED.author,
            content = EXCLUDED.content,
            github_url = EXCLUDED.github_url,
            tags = EXCLUDED.tags,
            embedding = EXCLUDED.embedding,
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            post["id"],
            post["title"],
            post["author"],
            text,
            post.get("github_url") or "",
            tags,
            _vector_literal(embedding),
        ),
    )
    conn.commit()
    cur.close()
    conn.close()


def delete_post_embedding(post_id: int):
    ensure_vector_store()
    conn = _connect()
    cur = conn.cursor()
    cur.execute("DELETE FROM post_embeddings WHERE post_id = %s", (post_id,))
    conn.commit()
    cur.close()
    conn.close()


def search_post_embeddings(embedding: list[float], limit: int = 3):
    ensure_vector_store()
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT post_id, title, author, content, github_url, tags,
               embedding <=> %s::vector AS distance
        FROM post_embeddings
        ORDER BY embedding <=> %s::vector
        LIMIT %s
        """,
        (_vector_literal(embedding), _vector_literal(embedding), limit),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": row[0],
            "title": row[1],
            "author": row[2],
            "content": row[3],
            "github_url": row[4],
            "tags": row[5].split(",") if row[5] else [],
            "distance": row[6],
        }
        for row in rows
    ]
