from fastapi import APIRouter
from pydantic import BaseModel
from openai import OpenAI
import chromadb
import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv(encoding='utf-8')

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# rag.py와 동일한 ChromaDB 컬렉션 참조 (같은 벡터 저장소 공유)
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="posts")


class AgentRequest(BaseModel):
    query: str  # 사용자 자연어 질문


# GPT에게 알려줄 도구 목록 — function calling 명세
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_posts",
            "description": (
                "게시판에서 관련 게시글을 검색합니다. "
                "프로젝트 추천, 기술 스택 관련 질문, 게시글 내용 탐색에 사용하세요."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "검색할 키워드 또는 질문"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_github_info",
            "description": (
                "GitHub 레포지토리 정보(스타, 포크, 언어, 최근 커밋)를 조회합니다. "
                "GitHub URL이 포함된 질문이나 레포 상태를 확인할 때 사용하세요."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "GitHub 레포지토리 URL (예: https://github.com/user/repo)"
                    }
                },
                "required": ["url"]
            }
        }
    }
]


def execute_search_posts(query: str) -> dict:
    """RAG 검색 — 질문 벡터화 후 ChromaDB에서 유사 게시글 TOP 3 반환"""
    # 질문을 벡터로 변환
    embedding_res = client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    query_embedding = embedding_res.data[0].embedding

    # ChromaDB에서 유사 게시글 검색
    results = collection.query(query_embeddings=[query_embedding], n_results=3)
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    ids = results["ids"][0]

    return {
        "posts": [
            {
                "id": int(post_id),
                "title": m["title"],
                "author": m["author"],
                "content": d[:300],  # 너무 길면 토큰 낭비 → 앞 300자만
                "github_url": m.get("github_url", "")
            }
            for post_id, d, m in zip(ids, docs, metas)
        ]
    }


async def execute_get_github_info(url: str) -> dict:
    """GitHub API 호출 — 레포 기본 정보 + 최근 커밋 반환"""
    parts = url.rstrip("/").split("/")
    if len(parts) < 2:
        return {"error": "유효하지 않은 GitHub URL"}

    owner, repo = parts[-2], parts[-1]
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

    async with httpx.AsyncClient() as http_client:
        res = await http_client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers, timeout=10.0
        )
        if res.status_code != 200:
            return {"error": f"GitHub API 오류 (status: {res.status_code})"}

        data = res.json()

        # 최근 커밋 날짜 추가 조회
        last_commit_at = None
        commits_res = await http_client.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1",
            headers=headers, timeout=10.0
        )
        if commits_res.status_code == 200 and commits_res.json():
            last_commit_at = commits_res.json()[0]["commit"]["committer"]["date"]

    return {
        "name": data["name"],
        "description": data.get("description") or "",
        "stars": data["stargazers_count"],
        "forks": data["forks_count"],
        "language": data.get("language") or "Unknown",
        "open_issues": data["open_issues_count"],
        "last_commit_at": last_commit_at,
    }


@router.post("/chat")
async def agent_chat(request: AgentRequest):
    """
    AI Agent — GPT가 질문을 보고 search_posts / get_github_info 중
    필요한 도구를 스스로 선택해 실행 후 최종 답변 생성
    """
    messages = [
        {
            "role": "system",
            "content": (
                "당신은 사이드 프로젝트 게시판 도우미입니다. "
                "search_posts와 get_github_info 도구를 활용해 사용자 질문에 답변하세요. "
                "도구가 필요 없는 간단한 질문은 바로 답변해도 됩니다."
            )
        },
        {"role": "user", "content": request.query}
    ]

    tools_used = []  # 실제로 사용된 도구 이름 기록 (UI 표시용)

    # Agent 루프 — GPT가 도구 호출을 원하지 않을 때까지 반복
    while True:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"  # GPT가 도구 사용 여부 자율 결정
        )

        choice = response.choices[0]

        # GPT가 도구 호출 없이 바로 답변하면 루프 종료
        if choice.finish_reason != "tool_calls":
            break

        # GPT가 요청한 도구 호출 실행
        messages.append(choice.message)  # GPT의 도구 호출 메시지를 대화에 추가

        for tool_call in choice.message.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)
            tools_used.append(name)

            # 도구 실행
            if name == "search_posts":
                result = execute_search_posts(args["query"])
            elif name == "get_github_info":
                result = await execute_get_github_info(args["url"])
            else:
                result = {"error": f"알 수 없는 도구: {name}"}

            # 도구 실행 결과를 대화에 추가 → GPT가 다음 턴에 참고
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result, ensure_ascii=False)
            })

    return {
        "answer": choice.message.content,
        "tools_used": tools_used  # 어떤 도구를 사용했는지 프론트에 전달
    }
