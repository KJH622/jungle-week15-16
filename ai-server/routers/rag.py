from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from openai import OpenAI
import chromadb
import os
from typing import List, Optional
from dotenv import load_dotenv
from auth import CurrentUser, require_user
from database import get_posts, get_post_by_id

load_dotenv(encoding='utf-8')

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ChromaDB 클라이언트 — 벡터 저장소 (로컬 파일로 저장)
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="posts")

class SearchRequest(BaseModel):
    query: str  # 사용자가 입력한 자연어 질문

class SimilarRequest(BaseModel):
    content: str     # 현재 게시글 본문
    exclude_id: int  # 현재 게시글 ID (결과에서 제외)
    tags: List[str] = Field(default_factory=list)  # 현재 게시글 태그 (추천 근거 표시용)

class SuggestTagsRequest(BaseModel):
    title: str    # 작성 중인 게시글 제목
    content: str  # 작성 중인 게시글 본문

def get_embedding(text: str) -> list:
    """텍스트를 벡터(숫자 배열)로 변환"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def parse_tags(tags_str: str) -> list[str]:
    """ChromaDB 메타데이터에 저장된 쉼표 구분 태그 문자열을 리스트로 변환"""
    if not tags_str:
        return []
    return [tag.strip() for tag in tags_str.split(",") if tag.strip()]

def distance_to_similarity(distance) -> Optional[int]:
    """ChromaDB distance 값을 사용자에게 보여줄 0~100 유사도 점수로 변환"""
    if distance is None:
        return None
    safe_distance = max(0, float(distance))
    score = 1 / (1 + safe_distance)
    return round(score * 100)

@router.post("/embed")
def embed_posts():
    """DB의 게시글을 벡터화해서 ChromaDB에 저장"""
    posts = get_posts()
    if not posts:
        return {"message": "저장할 게시글이 없습니다."}

    for post in posts:
        # 제목 + 내용을 합쳐서 벡터화 (검색 정확도 향상)
        text = f"{post['title']} {post['content']}"
        embedding = get_embedding(text)

        # 태그 리스트 → 쉼표 구분 문자열 (ChromaDB 메타데이터는 str/int/float만 지원)
        tags_str = ",".join(post.get("tags", []))

        # ChromaDB에 저장 (이미 있으면 덮어쓰기)
        collection.upsert(
            ids=[str(post["id"])],
            embeddings=[embedding],
            documents=[text],
            metadatas=[{
                "title": post["title"],
                "author": post["author"],
                "github_url": post["github_url"] or "",
                "tags": tags_str,
            }]
        )

    return {"message": f"{len(posts)}개 게시글 임베딩 완료"}

@router.post("/search")
def search_posts(request: SearchRequest, current_user: CurrentUser = Depends(require_user)):
    """자연어 질문으로 관련 게시글 검색 후 GPT 답변 생성"""
    # 1. 질문을 벡터로 변환
    query_embedding = get_embedding(request.query)

    # 2. ChromaDB에서 유사한 게시글 상위 3개 검색
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=3
    )

    # 3. 검색된 게시글을 GPT 컨텍스트로 구성
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    ids = results["ids"][0]  # ChromaDB에 저장할 때 str(post.id)로 저장했으므로 다시 int로 변환

    context = ""
    for doc, meta in zip(docs, metas):
        context += f"제목: {meta['title']}\n작성자: {meta['author']}\n내용: {doc}\n\n"

    # 4. GPT에게 컨텍스트 + 질문 전달 → 답변 생성
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "당신은 사이드 프로젝트 게시판 도우미입니다. 주어진 게시글 정보를 바탕으로 사용자 질문에 답변하세요."
            },
            {
                "role": "user",
                "content": f"다음 게시글들을 참고해서 질문에 답해줘.\n\n{context}\n질문: {request.query}"
            }
        ]
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": [
            {"id": int(post_id), "title": m["title"], "author": m["author"]}
            for post_id, m in zip(ids, metas)
        ]
    }

@router.post("/similar")
def similar_posts(request: SimilarRequest, current_user: CurrentUser = Depends(require_user)):
    """
    현재 게시글 본문을 기준으로 유사한 게시글 반환 (GPT 호출 없음)
    PostDetailPage 하단 '관련 게시글' 섹션에서 사용
    """
    # 본문이 너무 길면 앞 500자만 사용 (임베딩 비용 절감)
    query_text = request.content[:500]
    query_embedding = get_embedding(query_text)

    # 현재 게시글 제외를 위해 여유있게 5개 조회
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=5
    )

    posts = []
    current_tags = set(request.tags or [])
    distances = results.get("distances", [[]])[0]

    for index, (post_id, meta) in enumerate(zip(results["ids"][0], results["metadatas"][0])):
        # 현재 게시글은 결과에서 제외
        if int(post_id) == request.exclude_id:
            continue
        candidate_tags = parse_tags(meta.get("tags", ""))
        matched_tags = [tag for tag in candidate_tags if tag in current_tags]
        similarity = distance_to_similarity(distances[index] if index < len(distances) else None)
        posts.append({
            "id": int(post_id),
            "title": meta["title"],
            "author": meta["author"],
            "tags": candidate_tags,
            "matched_tags": matched_tags,
            "similarity": similarity,
            "reason": "본문 임베딩 벡터가 유사한 게시글입니다.",
        })
        if len(posts) == 3:  # 최대 3개만 반환
            break

    return {"posts": posts}


@router.post("/suggest-tags")
def suggest_tags(request: SuggestTagsRequest, current_user: CurrentUser = Depends(require_user)):
    """
    작성 중인 게시글 제목+내용 기반으로 유사 게시글의 태그 추천
    유사 게시글들의 태그 빈도를 계산해 많이 쓰인 순으로 반환
    """
    query_text = f"{request.title} {request.content[:300]}"
    query_embedding = get_embedding(query_text)

    # 유사 게시글 5개 조회 (태그 수집용)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=5
    )

    # 유사 게시글들의 태그 빈도 계산
    tag_counts: dict[str, int] = {}
    for meta in results["metadatas"][0]:
        tags_str = meta.get("tags", "")
        if not tags_str:
            continue
        for tag in tags_str.split(","):
            tag = tag.strip()
            if tag:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    # 빈도 높은 순으로 정렬, 최대 8개 반환
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    return {
        "tags": [{"name": name, "count": count} for name, count in sorted_tags[:8]]
    }


@router.post("/embed/{post_id}")
def embed_post(post_id: int):
    """특정 게시글 단건 벡터화 — Spring Boot가 게시글 저장 후 자동 호출"""
    post = get_post_by_id(post_id)
    if not post:
        return {"message": f"게시글 {post_id}을 찾을 수 없습니다."}

    text = f"{post['title']} {post['content']}"
    embedding = get_embedding(text)

    tags_str = ",".join(post.get("tags", []))

    # ChromaDB에 저장 (이미 있으면 덮어쓰기 → 수정 시도 동일하게 처리)
    collection.upsert(
        ids=[str(post["id"])],
        embeddings=[embedding],
        documents=[text],
        metadatas=[{
            "title": post["title"],
            "author": post["author"],
            "github_url": post["github_url"] or "",
            "tags": tags_str,
        }]
    )
    return {"message": f"게시글 {post_id} 임베딩 완료"}

@router.delete("/embed/{post_id}")
def delete_embed(post_id: int):
    """ChromaDB에서 특정 게시글 벡터 삭제 — Spring Boot가 게시글 삭제 후 자동 호출"""
    collection.delete(ids=[str(post_id)])
    return {"message": f"게시글 {post_id} 벡터 삭제 완료"}
