import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends
from openai import OpenAI
from pydantic import BaseModel, Field

from auth import CurrentUser, require_user
from database import (
    delete_post_embedding,
    get_post_by_id,
    get_posts,
    search_post_embeddings,
    upsert_post_embedding,
)
from rate_limit import check_rate_limit
from usage_log import log_openai_usage

load_dotenv(encoding="utf-8")

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class SearchRequest(BaseModel):
    query: str


class SimilarRequest(BaseModel):
    content: str
    exclude_id: int
    tags: list[str] = Field(default_factory=list)


class SuggestTagsRequest(BaseModel):
    title: str
    content: str


def get_embedding(text: str, endpoint: str | None = None, user: str | None = None) -> list[float]:
    response = client.embeddings.create(
        model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
        input=text,
    )
    if endpoint and user:
        log_openai_usage(endpoint, user, response, {"operation": "embedding"})
    return response.data[0].embedding


def distance_to_similarity(distance) -> Optional[int]:
    if distance is None:
        return None
    score = max(0.0, 1.0 - float(distance))
    return round(score * 100)


@router.post("/embed")
def embed_posts():
    posts = get_posts()
    if not posts:
        return {"message": "저장할 게시글이 없습니다."}

    for post in posts:
        text = f"{post['title']} {post['content']}"
        embedding = get_embedding(text)
        upsert_post_embedding(post, embedding)

    return {"message": f"{len(posts)}개 게시글 임베딩 완료"}


@router.post("/search")
def search_posts(request: SearchRequest, current_user: CurrentUser = Depends(require_user)):
    check_rate_limit(current_user, "rag_search")
    query_embedding = get_embedding(request.query, "rag_search", current_user.email)
    posts = search_post_embeddings(query_embedding, limit=3)

    context = ""
    for post in posts:
        context += (
            f"제목: {post['title']}\n"
            f"작성자: {post['author']}\n"
            f"내용: {post['content']}\n\n"
        )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "당신은 사이트 프로젝트 게시판 도우미입니다. "
                    "주어진 게시글 정보를 바탕으로 사용자의 질문에 답변하세요."
                ),
            },
            {
                "role": "user",
                "content": f"다음 게시글들을 참고해서 질문에 답해주세요.\n\n{context}\n질문: {request.query}",
            },
        ],
    )
    log_openai_usage("rag_search", current_user.email, response, {"sources": len(posts)})

    return {
        "answer": response.choices[0].message.content,
        "sources": [
            {"id": int(post["id"]), "title": post["title"], "author": post["author"]}
            for post in posts
        ],
    }


@router.post("/similar")
def similar_posts(request: SimilarRequest, current_user: CurrentUser = Depends(require_user)):
    check_rate_limit(current_user, "rag_similar")
    query_text = request.content[:500]
    query_embedding = get_embedding(query_text, "rag_similar", current_user.email)
    results = search_post_embeddings(query_embedding, limit=5)

    posts = []
    current_tags = set(request.tags or [])

    for result in results:
        if int(result["id"]) == request.exclude_id:
            continue

        candidate_tags = result.get("tags", [])
        matched_tags = [tag for tag in candidate_tags if tag in current_tags]
        posts.append(
            {
                "id": int(result["id"]),
                "title": result["title"],
                "author": result["author"],
                "tags": candidate_tags,
                "matched_tags": matched_tags,
                "similarity": distance_to_similarity(result.get("distance")),
                "reason": "본문 임베딩 벡터가 유사한 게시글입니다.",
            }
        )
        if len(posts) == 3:
            break

    return {"posts": posts}


@router.post("/suggest-tags")
def suggest_tags(request: SuggestTagsRequest, current_user: CurrentUser = Depends(require_user)):
    check_rate_limit(current_user, "rag_suggest_tags")
    query_text = f"{request.title} {request.content[:300]}"
    query_embedding = get_embedding(query_text, "rag_suggest_tags", current_user.email)
    posts = search_post_embeddings(query_embedding, limit=5)

    tag_counts: dict[str, int] = {}
    for post in posts:
        for tag in post.get("tags", []):
            tag = tag.strip()
            if tag:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    sorted_tags = sorted(tag_counts.items(), key=lambda item: item[1], reverse=True)
    return {"tags": [{"name": name, "count": count} for name, count in sorted_tags[:8]]}


@router.post("/embed/{post_id}")
def embed_post(post_id: int):
    post = get_post_by_id(post_id)
    if not post:
        return {"message": f"게시글 {post_id}을 찾을 수 없습니다."}

    text = f"{post['title']} {post['content']}"
    embedding = get_embedding(text)
    upsert_post_embedding(post, embedding)
    return {"message": f"게시글 {post_id} 임베딩 완료"}


@router.delete("/embed/{post_id}")
def delete_embed(post_id: int):
    delete_post_embedding(post_id)
    return {"message": f"게시글 {post_id} 임베딩 삭제 완료"}
