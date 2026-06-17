import json
import os
import asyncio

from dotenv import load_dotenv
from fastapi import APIRouter, Depends
from mcp import ClientSession
from mcp.client.sse import sse_client
from openai import OpenAI
from pydantic import BaseModel

from auth import CurrentUser, require_user
from database import search_post_embeddings
from rate_limit import check_rate_limit
from usage_log import log_openai_usage

load_dotenv(encoding="utf-8")

router = APIRouter()
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    timeout=float(os.getenv("OPENAI_TIMEOUT_SECONDS", "30")),
)
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8002/sse")
MAX_AGENT_TOOL_ROUNDS = int(os.getenv("MAX_AGENT_TOOL_ROUNDS", "3"))
MAX_AGENT_TOOL_CALLS = int(os.getenv("MAX_AGENT_TOOL_CALLS", "6"))
MCP_TIMEOUT_SECONDS = float(os.getenv("MCP_TIMEOUT_SECONDS", "15"))


class AgentRequest(BaseModel):
    query: str


class ImproveRequest(BaseModel):
    github_url: str
    title: str
    content: str


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_posts",
            "description": (
                "Search similar project posts in the board. Use this for project "
                "recommendations, tech-stack questions, and content discovery."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search keyword or natural language question.",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_github_info",
            "description": (
                "Fetch GitHub repository information such as stars, forks, language, "
                "issues, and latest commit."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "GitHub repository URL, e.g. https://github.com/user/repo.",
                    }
                },
                "required": ["url"],
            },
        },
    },
]


def get_embedding(text: str, endpoint: str | None = None, user: str | None = None) -> list[float]:
    response = client.embeddings.create(
        model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
        input=text,
    )
    if endpoint and user:
        log_openai_usage(endpoint, user, response, {"operation": "embedding"})
    return response.data[0].embedding


def execute_search_posts(query: str, current_user: CurrentUser | None = None) -> dict:
    user_email = current_user.email if current_user else "system"
    query_embedding = get_embedding(query, "agent_search_posts", user_email)
    posts = search_post_embeddings(query_embedding, limit=3)

    return {
        "posts": [
            {
                "id": int(post["id"]),
                "title": post["title"],
                "author": post["author"],
                "content": post["content"][:300],
                "github_url": post.get("github_url", ""),
            }
            for post in posts
        ]
    }


async def execute_get_github_info(url: str) -> dict:
    async def call_mcp() -> dict:
        async with sse_client(MCP_SERVER_URL) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool("get_github_repo", {"url": url})
                if result.content:
                    return json.loads(result.content[0].text)
                return {"error": "MCP server returned an empty response."}

    try:
        return await asyncio.wait_for(call_mcp(), timeout=MCP_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        return {"error": f"MCP server timed out after {MCP_TIMEOUT_SECONDS} seconds."}
    except Exception as e:
        print(f"[MCP ERROR] {type(e).__name__}: {e}")
        return {"error": f"MCP server connection failed: {str(e)}"}


@router.post("/chat")
async def agent_chat(request: AgentRequest, current_user: CurrentUser = Depends(require_user)):
    check_rate_limit(current_user, "agent_chat")
    messages = [
        {
            "role": "system",
            "content": (
                "You are a project-board assistant. Use search_posts and "
                "get_github_info when they help answer the user's question. "
                "For simple questions, answer directly."
            ),
        },
        {"role": "user", "content": request.query},
    ]

    tools_used = []

    choice = None

    for _ in range(MAX_AGENT_TOOL_ROUNDS):
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )
        log_openai_usage(
            "agent_chat",
            current_user.email,
            response,
            {"tool_calls": len(tools_used)},
        )

        choice = response.choices[0]
        if choice.finish_reason != "tool_calls":
            return {
                "answer": choice.message.content,
                "tools_used": tools_used,
            }

        messages.append(choice.message)
        tool_calls = choice.message.tool_calls or []

        if len(tools_used) + len(tool_calls) > MAX_AGENT_TOOL_CALLS:
            messages.append(
                {
                    "role": "system",
                    "content": (
                        "Tool call limit reached. Stop calling tools and provide "
                        "the best possible answer using the information already gathered."
                    ),
                }
            )
            break

        for tool_call in tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)
            tools_used.append(name)

            if name == "search_posts":
                result = execute_search_posts(args["query"], current_user)
            elif name == "get_github_info":
                result = await execute_get_github_info(args["url"])
            else:
                result = {"error": f"Unknown tool: {name}"}

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, ensure_ascii=False),
                }
            )

    final_response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            *messages,
            {
                "role": "system",
                "content": (
                    "Stop using tools now. Provide a concise final answer based on "
                    "the conversation and any tool results already available."
                ),
            },
        ],
    )
    log_openai_usage(
        "agent_chat_final",
        current_user.email,
        final_response,
        {"tool_calls": len(tools_used)},
    )
    choice = final_response.choices[0]
    return {
        "answer": choice.message.content,
        "tools_used": tools_used,
    }


@router.post("/improve")
async def improve_project(request: ImproveRequest, current_user: CurrentUser = Depends(require_user)):
    check_rate_limit(current_user, "agent_improve")
    github_info = await execute_get_github_info(request.github_url)
    search_query = f"{request.title} {request.content[:200]}"
    similar_posts = execute_search_posts(search_query, current_user)

    github_summary = json.dumps(github_info, ensure_ascii=False, indent=2)
    similar_summary = ""
    for post in similar_posts["posts"]:
        similar_summary += f"- [{post['title']}] {post['content'][:150]}\n"

    messages = [
        {
            "role": "system",
            "content": (
                "You are a project improvement expert. Based on GitHub repository "
                "status and similar projects, return 3 to 5 concrete improvement "
                "suggestions as JSON only. Use this shape: "
                '{"suggestions":[{"title":"title","reason":"reason","how":"how"}]}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"[Project]\n"
                f"Title: {request.title}\n"
                f"Content: {request.content[:300]}\n\n"
                f"[GitHub]\n{github_summary}\n\n"
                f"[Similar projects]\n{similar_summary}\n\n"
                "Return improvement suggestions as JSON."
            ),
        },
    ]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        response_format={"type": "json_object"},
    )
    log_openai_usage(
        "agent_improve",
        current_user.email,
        response,
        {"similar_posts": len(similar_posts["posts"])},
    )

    raw = response.choices[0].message.content
    parsed = json.loads(raw)
    suggestions = parsed.get("suggestions", parsed.get("items", []))

    return {
        "suggestions": suggestions,
        "github_info": github_info,
        "similar_posts": similar_posts["posts"],
    }
