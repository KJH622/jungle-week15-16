from fastapi import APIRouter
from pydantic import BaseModel
from openai import OpenAI
import chromadb
import os
from dotenv import load_dotenv
from database import get_posts, get_post_by_id

load_dotenv(encoding='utf-8')

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ChromaDB 클라이언트 — 벡터 저장소 (로컬 파일로 저장)
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="posts")

class SearchRequest(BaseModel):
    query: str  # 사용자가 입력한 자연어 질문

def get_embedding(text: str) -> list:
    """텍스트를 벡터(숫자 배열)로 변환"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

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

        # ChromaDB에 저장 (이미 있으면 덮어쓰기)
        collection.upsert(
            ids=[str(post["id"])],
            embeddings=[embedding],
            documents=[text],
            metadatas=[{
                "title": post["title"],
                "author": post["author"],
                "github_url": post["github_url"] or "",
            }]
        )

    return {"message": f"{len(posts)}개 게시글 임베딩 완료"}

@router.post("/search")
def search_posts(request: SearchRequest):
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

@router.post("/embed/{post_id}")
def embed_post(post_id: int):
    """특정 게시글 단건 벡터화 — Spring Boot가 게시글 저장 후 자동 호출"""
    post = get_post_by_id(post_id)
    if not post:
        return {"message": f"게시글 {post_id}을 찾을 수 없습니다."}

    text = f"{post['title']} {post['content']}"
    embedding = get_embedding(text)

    # ChromaDB에 저장 (이미 있으면 덮어쓰기 → 수정 시도 동일하게 처리)
    collection.upsert(
        ids=[str(post["id"])],
        embeddings=[embedding],
        documents=[text],
        metadatas=[{
            "title": post["title"],
            "author": post["author"],
            "github_url": post["github_url"] or "",
        }]
    )
    return {"message": f"게시글 {post_id} 임베딩 완료"}

@router.delete("/embed/{post_id}")
def delete_embed(post_id: int):
    """ChromaDB에서 특정 게시글 벡터 삭제 — Spring Boot가 게시글 삭제 후 자동 호출"""
    collection.delete(ids=[str(post_id)])
    return {"message": f"게시글 {post_id} 벡터 삭제 완료"}