import pg8000
import os
from dotenv import load_dotenv

load_dotenv(encoding='utf-8')

def _connect():
    """DB 연결 공통 함수"""
    return pg8000.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "bulletin_board"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "")
    )

def get_posts():
    """PostgreSQL에서 게시글 전체 목록 조회"""
    conn = _connect()
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.title, p.content, u.nickname, p.github_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "id": row[0],
            "title": row[1],
            "content": row[2],
            "author": row[3],
            "github_url": row[4],
        }
        for row in rows
    ]

def get_post_by_id(post_id: int):
    """특정 게시글 단건 조회 — Spring Boot 연동 시 사용"""
    conn = _connect()
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.title, p.content, u.nickname, p.github_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = %s
    """, (post_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return None
    return {
        "id": row[0],
        "title": row[1],
        "content": row[2],
        "author": row[3],
        "github_url": row[4],
    }
