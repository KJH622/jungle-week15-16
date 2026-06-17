"""
MCP Server — GitHub 도구 서버

실행 방법:
    python mcp_server.py

기본 포트: 8002
접속 URL:  http://localhost:8002/sse

추후 도구 추가 시:
    @mcp.tool() 데코레이터로 함수 하나 추가하면 끝.
"""

import os
import base64
import httpx
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv

load_dotenv(encoding="utf-8")

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# ── MCP 서버 인스턴스 ──────────────────────────────────────────────────────────
mcp = FastMCP(
    name="github-mcp-server",
    instructions="GitHub 레포지토리 정보를 조회하는 도구 모음입니다.",
)


# ── 공통 유틸 ─────────────────────────────────────────────────────────────────

def _github_headers() -> dict:
    """GitHub API 요청 헤더 반환. 토큰 있으면 시간당 5000회, 없으면 60회."""
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def _parse_github_url(url: str) -> tuple[str, str]:
    """
    https://github.com/owner/repo → ("owner", "repo")
    파싱 실패 시 ("", "") 반환.
    """
    parts = url.rstrip("/").split("/")
    if len(parts) < 2:
        return "", ""
    return parts[-2], parts[-1]


# ── Tools ─────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_github_repo(url: str) -> dict:
    """
    GitHub 레포지토리 기본 정보를 조회합니다.

    Args:
        url: GitHub 레포지토리 URL (예: https://github.com/owner/repo)

    Returns:
        name, description, language, topics, stars, forks, open_issues,
        last_commit_at 포함 딕셔너리. 오류 시 {"error": "..."} 반환.
    """
    owner, repo = _parse_github_url(url)
    if not owner:
        return {"error": f"유효하지 않은 GitHub URL: {url}"}

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=_github_headers(),
            timeout=10.0,
            follow_redirects=True,
        )
        if res.status_code == 404:
            return {"error": "레포지토리를 찾을 수 없습니다."}
        if res.status_code != 200:
            return {"error": f"GitHub API 오류 (status: {res.status_code})"}

        data = res.json()

        # 마지막 커밋 날짜 별도 조회
        last_commit_at = None
        commits_res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1",
            headers=_github_headers(),
            timeout=10.0,
            follow_redirects=True,
        )
        if commits_res.status_code == 200 and commits_res.json():
            last_commit_at = commits_res.json()[0]["commit"]["committer"]["date"]

    return {
        "name": data["name"],
        "full_name": data["full_name"],
        "description": data.get("description") or "",
        "language": data.get("language") or "Unknown",
        "topics": data.get("topics") or [],
        "stars": data["stargazers_count"],
        "forks": data["forks_count"],
        "open_issues": data["open_issues_count"],
        "last_commit_at": last_commit_at,
    }


@mcp.tool()
async def get_github_readme(url: str) -> dict:
    """
    GitHub 레포지토리의 README.md 내용을 반환합니다.
    태그 추천·개선 제안 시 프로젝트 설명 파악에 활용합니다.

    Args:
        url: GitHub 레포지토리 URL (예: https://github.com/owner/repo)

    Returns:
        exists(bool), content(str, 최대 3000자) 포함 딕셔너리.
    """
    owner, repo = _parse_github_url(url)
    if not owner:
        return {"exists": False, "content": "", "error": f"유효하지 않은 URL: {url}"}

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/readme",
            headers=_github_headers(),
            timeout=10.0,
            follow_redirects=True,
        )
        if res.status_code == 404:
            return {"exists": False, "content": ""}
        if res.status_code != 200:
            return {"exists": False, "content": "", "error": f"GitHub API 오류 (status: {res.status_code})"}

        # README는 base64로 인코딩되어 반환됨
        encoded = res.json().get("content", "")
        decoded = base64.b64decode(encoded).decode("utf-8", errors="ignore")

        return {
            "exists": True,
            "content": decoded[:3000],  # 토큰 절약을 위해 앞 3000자만
        }


@mcp.tool()
async def get_github_issues(url: str, max_count: int = 5) -> dict:
    """
    GitHub 레포지토리의 열린 이슈 목록을 반환합니다.
    개선 제안 시 현재 알려진 문제를 파악하는 데 활용합니다.

    Args:
        url: GitHub 레포지토리 URL (예: https://github.com/owner/repo)
        max_count: 가져올 이슈 최대 개수 (기본 5)

    Returns:
        issues 배열 (title, body 앞 200자, labels) 포함 딕셔너리.
    """
    owner, repo = _parse_github_url(url)
    if not owner:
        return {"issues": [], "error": f"유효하지 않은 URL: {url}"}

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/issues",
            headers=_github_headers(),
            params={"state": "open", "per_page": max_count},
            timeout=10.0,
            follow_redirects=True,
        )
        if res.status_code != 200:
            return {"issues": [], "error": f"GitHub API 오류 (status: {res.status_code})"}

        issues = [
            {
                "title": issue["title"],
                "body": (issue.get("body") or "")[:200],
                "labels": [label["name"] for label in issue.get("labels", [])],
            }
            for issue in res.json()
            if "pull_request" not in issue  # PR은 제외, 순수 이슈만
        ]

    return {"issues": issues}


@mcp.tool()
async def get_github_languages(url: str) -> dict:
    """
    GitHub 레포지토리에서 사용된 언어와 바이트 비중을 반환합니다.
    태그 추천 시 주언어 외 부언어까지 반영하는 데 활용합니다.

    Args:
        url: GitHub 레포지토리 URL (예: https://github.com/owner/repo)

    Returns:
        languages 딕셔너리 (언어명: 바이트 수). 예) {"TypeScript": 45230, "CSS": 3400}
    """
    owner, repo = _parse_github_url(url)
    if not owner:
        return {"languages": {}, "error": f"유효하지 않은 URL: {url}"}

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/languages",
            headers=_github_headers(),
            timeout=10.0,
            follow_redirects=True,
        )
        if res.status_code != 200:
            return {"languages": {}, "error": f"GitHub API 오류 (status: {res.status_code})"}

    return {"languages": res.json()}


# ── 서버 실행 ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print("MCP GitHub Server starting on http://localhost:8002/sse")
    uvicorn.run(mcp.sse_app(), host="0.0.0.0", port=8002)
