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
    """PostgreSQL에서 게시글 전체 목록 + 태그 조회"""
    conn = _connect()
    cur = conn.cursor()
    # STRING_AGG로 태그 이름들을 쉼표로 합쳐서 한 행에 반환
    cur.execute("""
        SELECT p.id, p.title, p.content, u.nickname, p.github_url,
               STRING_AGG(t.name, ',') AS tags
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        GROUP BY p.id, p.title, p.content, u.nickname, p.github_url
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
            # None이면 빈 리스트, 있으면 쉼표 분리해서 리스트로 변환
            "tags": row[5].split(",") if row[5] else [],
        }
        for row in rows
    ]

def get_post_by_id(post_id: int):
    """특정 게시글 단건 조회 + 태그 포함"""
    conn = _connect()
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.title, p.content, u.nickname, p.github_url,
               STRING_AGG(t.name, ',') AS tags
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.id = %s
        GROUP BY p.id, p.title, p.content, u.nickname, p.github_url
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
        "tags": row[5].split(",") if row[5] else [],
    }
