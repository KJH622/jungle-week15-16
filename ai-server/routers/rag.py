import json
import os
import re
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
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    timeout=float(os.getenv("OPENAI_TIMEOUT_SECONDS", "30")),
)


class SearchRequest(BaseModel):
    query: str


class SimilarRequest(BaseModel):
    title: str | None = ""
    content: str | None = ""
    exclude_id: int
    tags: list[str] = Field(default_factory=list)


class SuggestTagsRequest(BaseModel):
    title: str | None = ""
    content: str | None = ""
    existing_tags: list[str] = Field(default_factory=list)


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


def normalize_tag_name(value) -> str:
    return str(value or "").strip().lstrip("#")[:30]


def tag_key(value) -> str:
    return normalize_tag_name(value).lower()


def unique_tag_items(values, existing_tags: list[str] | None = None, source: str = "ai") -> list[dict]:
    existing_keys = {tag_key(tag) for tag in existing_tags or [] if tag_key(tag)}
    seen = set(existing_keys)
    tags = []

    for item in values:
        name = normalize_tag_name(item.get("name") if isinstance(item, dict) else item)
        key = name.lower()
        if not name or key in seen:
            continue
        seen.add(key)
        tags.append({"name": name, "count": 1, "source": source})
        if len(tags) == 8:
            break
    return tags


TAG_KEYWORDS = [
    ("React", ("react", "리액트")),
    ("SpringBoot", ("spring", "springboot", "spring boot", "스프링")),
    ("FastAPI", ("fastapi", "fast api")),
    ("PostgreSQL", ("postgresql", "postgres", "pgvector")),
    ("MySQL", ("mysql",)),
    ("Docker", ("docker", "도커")),
    ("AWS", ("aws",)),
    ("JWT", ("jwt",)),
    ("OAuth", ("oauth", "oauth2")),
    ("Redis", ("redis",)),
    ("WebSocket", ("websocket", "웹소켓")),
    ("TypeScript", ("typescript", "ts")),
    ("JavaScript", ("javascript", "js")),
    ("Python", ("python", "파이썬")),
    ("Java", ("java", "자바")),
    ("Next.js", ("next.js", "nextjs")),
    ("Vue", ("vue",)),
    ("Node.js", ("node.js", "nodejs")),
    ("AI", ("ai", "openai", "인공지능")),
    ("RAG", ("rag", "임베딩", "벡터")),
    ("GitHub", ("github", "깃허브")),
    ("게시판", ("게시판", "board", "커뮤니티")),
    ("질문게시판", ("질문", "qna", "qa", "q&a")),
    ("검색", ("검색", "search")),
    ("알림", ("알림", "notification", "push")),
    ("데이터시각화", ("데이터시각화", "시각화", "chart", "dashboard")),
    ("가계부", ("가계부", "budget", "expense")),
    ("날씨API", ("날씨", "weather")),
]

TAG_STOPWORDS = {
    "프로젝트",
    "사이드",
    "토이",
    "서비스",
    "기능",
    "소개",
    "사용",
    "개발",
    "만든",
    "있는",
    "하는",
    "위한",
    "관련",
    "태그",
    "추천",
    "http",
    "https",
    "www",
    "com",
    "github.com",
}


def generate_local_tags(title: str, content: str, existing_tags: list[str] | None = None) -> list[dict]:
    text = f"{title} {content}".lower()
    candidates = []

    for tag, keywords in TAG_KEYWORDS:
        if any(keyword in text for keyword in keywords):
            candidates.append(tag)

    for token in RELATED_TOKEN_PATTERN.findall(text):
        name = normalize_tag_name(token)
        key = name.lower()
        if key in TAG_STOPWORDS or len(name) > 20:
            continue
        candidates.append(name)

    if title or content:
        candidates.extend(["웹서비스", "사이드프로젝트", "포트폴리오"])

    return unique_tag_items(candidates, existing_tags, source="local")


RELATED_TOKEN_PATTERN = re.compile(r"[0-9A-Za-z가-힣+#.]{2,}")


def tokenize_related_text(*values: str) -> set[str]:
    tokens: set[str] = set()
    for value in values:
        for token in RELATED_TOKEN_PATTERN.findall(str(value or "").lower()):
            normalized = token.strip().lstrip("#")
            if normalized:
                tokens.add(normalized)
    return tokens


def matched_tags_for(candidate_tags: list[str], current_tags: list[str]) -> list[str]:
    current_keys = {
        normalize_tag_name(tag).lower()
        for tag in current_tags
        if normalize_tag_name(tag)
    }

    matched: list[str] = []
    seen: set[str] = set()
    for tag in candidate_tags:
        name = normalize_tag_name(tag)
        key = name.lower()
        if name and key in current_keys and key not in seen:
            matched.append(name)
            seen.add(key)
    return matched


def format_related_post(post: dict, current_tags: list[str], similarity=None, reason: str = "") -> dict:
    candidate_tags = [
        normalize_tag_name(tag)
        for tag in post.get("tags", [])
        if normalize_tag_name(tag)
    ]
    return {
        "id": int(post["id"]),
        "title": post["title"],
        "author": post["author"],
        "tags": candidate_tags,
        "matched_tags": matched_tags_for(candidate_tags, current_tags),
        "similarity": similarity,
        "reason": reason,
    }


def fallback_related_posts(request: SimilarRequest, limit: int = 3) -> list[dict]:
    current_tags = request.tags or []
    query_tokens = tokenize_related_text(
        request.title or "",
        request.content or "",
        " ".join(current_tags),
    )

    scored_posts: list[tuple[int, dict]] = []
    backup_posts: list[dict] = []

    for post in get_posts():
        if int(post["id"]) == request.exclude_id:
            continue

        candidate_tags = [
            normalize_tag_name(tag)
            for tag in post.get("tags", [])
            if normalize_tag_name(tag)
        ]
        matched_tags = matched_tags_for(candidate_tags, current_tags)
        candidate_tokens = tokenize_related_text(
            post.get("title", ""),
            post.get("content", ""),
            " ".join(candidate_tags),
        )
        title_tokens = tokenize_related_text(post.get("title", ""))
        token_overlap = query_tokens & candidate_tokens
        title_overlap = query_tokens & title_tokens

        score = len(matched_tags) * 10 + len(title_overlap) * 3 + len(token_overlap)
        backup_posts.append(post)
        if score > 0:
            scored_posts.append((score, post))

    if scored_posts:
        scored_posts.sort(key=lambda item: (item[0], int(item[1]["id"])), reverse=True)
        return [
            format_related_post(
                post,
                current_tags,
                reason="태그와 제목, 본문 키워드가 비슷한 게시글입니다.",
            )
            for _, post in scored_posts[:limit]
        ]

    backup_posts.sort(key=lambda post: int(post["id"]), reverse=True)
    return [
        format_related_post(
            post,
            current_tags,
            reason="임베딩 추천 데이터가 부족해 다른 게시글을 먼저 보여드립니다.",
        )
        for post in backup_posts[:limit]
    ]


def generate_tags_from_content(
    title: str,
    content: str,
    current_user: CurrentUser,
    existing_tags: list[str] | None = None,
) -> list[dict]:
    source_text = f"제목: {title}\n내용: {content[:1000]}".strip()
    if not source_text:
        return []

    existing_text = ", ".join(existing_tags or [])
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "당신은 사이드 프로젝트 게시글의 태그 추천 도우미입니다. "
                        "게시글 제목과 내용을 보고 검색과 분류에 도움이 되는 태그를 3개에서 8개까지 추천하세요. "
                        "이미 추가된 태그와 같은 태그는 절대 다시 추천하지 마세요. "
                        "반드시 JSON만 반환하고, 형태는 {\"tags\":[\"태그1\",\"태그2\"]} 입니다. "
                        "태그는 짧게 쓰고, 기술명이나 라이브러리명은 원래 표기를 유지하세요."
                    ),
                },
                {
                    "role": "user",
                    "content": f"{source_text}\n이미 추가된 태그: {existing_text or '없음'}",
                },
            ],
        )
        log_openai_usage(
            "rag_suggest_tags_fallback",
            current_user.email,
            response,
            {"operation": "tag_generation"},
        )
    except Exception as e:
        print(f"[AI TAG SUGGESTION FALLBACK] {type(e).__name__}: {e}", flush=True)
        return generate_local_tags(title, content, existing_tags)

    try:
        parsed = json.loads(response.choices[0].message.content)
    except (TypeError, json.JSONDecodeError):
        return generate_local_tags(title, content, existing_tags)

    raw_tags = parsed.get("tags", [])
    if not isinstance(raw_tags, list):
        return generate_local_tags(title, content, existing_tags)

    tags = unique_tag_items(raw_tags, existing_tags, source="ai")
    return tags or generate_local_tags(title, content, existing_tags)


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
    posts = []
    query_text = f"{request.title or ''} {(request.content or '')[:500]} {' '.join(request.tags or [])}".strip()
    if query_text:
        try:
            query_embedding = get_embedding(query_text, "rag_similar", current_user.email)
            results = search_post_embeddings(query_embedding, limit=12)
            for result in results:
                if int(result["id"]) == request.exclude_id:
                    continue

                posts.append(
                    format_related_post(
                        result,
                        request.tags or [],
                        similarity=distance_to_similarity(result.get("distance")),
                        reason="본문 임베딩 벡터가 유사한 게시글입니다.",
                    )
                )
                if len(posts) == 3:
                    break
        except Exception as e:
            print(f"[RAG SIMILAR FALLBACK] {type(e).__name__}: {e}", flush=True)

    if not posts:
        posts = fallback_related_posts(request)

    return {"posts": posts}


@router.post("/suggest-tags")
def suggest_tags(request: SuggestTagsRequest, current_user: CurrentUser = Depends(require_user)):
    check_rate_limit(current_user, "rag_suggest_tags")
    title = (request.title or "").strip()
    content = (request.content or "").strip()
    existing_tags = request.existing_tags or []
    query_text = f"{title} {content[:300]}".strip()
    if not query_text:
        return {"tags": []}

    posts = []
    try:
        query_embedding = get_embedding(query_text, "rag_suggest_tags", current_user.email)
        posts = search_post_embeddings(query_embedding, limit=5)
    except Exception as e:
        print(f"[RAG TAG SUGGESTION FALLBACK] {type(e).__name__}: {e}", flush=True)

    tag_counts: dict[str, int] = {}
    existing_keys = {tag_key(tag) for tag in existing_tags if tag_key(tag)}
    for post in posts:
        for tag in post.get("tags", []):
            tag = normalize_tag_name(tag)
            if tag and tag.lower() not in existing_keys:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    sorted_tags = sorted(tag_counts.items(), key=lambda item: item[1], reverse=True)
    if sorted_tags:
        return {"tags": [{"name": name, "count": count, "source": "rag"} for name, count in sorted_tags[:8]]}

    return {"tags": generate_tags_from_content(title, content, current_user, existing_tags)}


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
