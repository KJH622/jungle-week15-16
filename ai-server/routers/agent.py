from fastapi import APIRouter, Depends
from pydantic import BaseModel
from openai import OpenAI
from mcp import ClientSession
from mcp.client.sse import sse_client
import chromadb
import json
import os
from dotenv import load_dotenv
from auth import CurrentUser, require_user

load_dotenv(encoding='utf-8')

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# MCP 서버 주소 — mcp_server.py가 여기서 실행 중이어야 함
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8002/sse")

# rag.py와 동일한 ChromaDB 컬렉션 참조 (같은 벡터 저장소 공유)
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="posts")


class AgentRequest(BaseModel):
    query: str  # 사용자 자연어 질문


class ImproveRequest(BaseModel):
    github_url: str   # 게시글의 GitHub 레포 URL
    title: str        # 게시글 제목 (RAG 검색 키워드로 활용)
    content: str      # 게시글 본문 (RAG 검색 키워드로 활용)


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
    """
    MCP 서버를 통해 GitHub 레포 기본 정보 조회.
    내부적으로 mcp_server.py의 get_github_repo 도구를 SSE로 호출한다.
    MCP 서버가 꺼져 있으면 {"error": "..."} 반환.
    """
    try:
        async with sse_client(MCP_SERVER_URL) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool("get_github_repo", {"url": url})
                if result.content:
                    return json.loads(result.content[0].text)
                return {"error": "MCP 서버 응답이 비어 있습니다."}
    except Exception as e:
        print(f"[MCP ERROR] {type(e).__name__}: {e}")
        return {"error": f"MCP 서버 연결 실패: {str(e)}"}


@router.post("/chat")
async def agent_chat(request: AgentRequest, current_user: CurrentUser = Depends(require_user)):
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


@router.post("/improve")
async def improve_project(request: ImproveRequest, current_user: CurrentUser = Depends(require_user)):
    """
    프로젝트 개선 제안 Agent
    - get_github_info: 현재 레포 상태 파악 (MCP 역할)
    - search_posts: 유사하게 잘 된 프로젝트 사례 검색 (RAG 역할)
    → 두 결과를 종합해 구체적인 개선 제안 생성
    """
    # 1단계: GitHub 레포 정보 수집 (MCP)
    github_info = await execute_get_github_info(request.github_url)

    # 2단계: 유사 프로젝트 검색 (RAG)
    search_query = f"{request.title} {request.content[:200]}"
    similar_posts = execute_search_posts(search_query)

    # 3단계: 수집한 정보를 GPT 컨텍스트로 구성
    github_summary = json.dumps(github_info, ensure_ascii=False, indent=2)

    similar_summary = ""
    for post in similar_posts["posts"]:
        similar_summary += f"- [{post['title']}] {post['content'][:150]}\n"

    messages = [
        {
            "role": "system",
            "content": (
                "당신은 사이드 프로젝트 개선 전문가입니다. "
                "GitHub 레포 현황과 유사 프로젝트 사례를 바탕으로 "
                "실행 가능한 개선 제안 3~5개를 아래 JSON 형식으로만 반환하세요. "
                "다른 텍스트나 마크다운 없이 JSON 배열만 출력하세요.\n"
                '[{"title": "제안 제목", "reason": "왜 필요한지 2~3문장", "how": "어떻게 하면 되는지 2~3문장"}]'
            )
        },
        {
            "role": "user",
            "content": (
                f"[분석할 프로젝트]\n"
                f"제목: {request.title}\n"
                f"내용: {request.content[:300]}\n\n"
                f"[GitHub 레포 현황]\n{github_summary}\n\n"
                f"[유사 프로젝트 사례]\n{similar_summary}\n\n"
                "위 정보를 바탕으로 개선 제안 JSON 배열을 반환하세요."
            )
        }
    ]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        response_format={"type": "json_object"}  # JSON 모드 강제
    )

    import re
    raw = response.choices[0].message.content
    # json_object 모드는 최상위가 객체여야 해서 {"suggestions": [...]} 형태로 올 수도 있음
    parsed = json.loads(raw)
    suggestions = parsed if isinstance(parsed, list) else parsed.get("suggestions", parsed.get("items", list(parsed.values())[0]))

    return {
        "suggestions": suggestions,
        "github_info": github_info,
        "similar_posts": similar_posts["posts"]
    }
