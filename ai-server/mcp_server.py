import base64
import os
import time

import httpx
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

load_dotenv(encoding="utf-8")

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_CACHE_TTL_SECONDS = int(os.getenv("GITHUB_CACHE_TTL_SECONDS", "3600"))
GITHUB_TIMEOUT_SECONDS = float(os.getenv("GITHUB_TIMEOUT_SECONDS", "10"))
github_cache = {}

mcp = FastMCP(
    name="github-mcp-server",
    instructions="GitHub repository information tools.",
)


def _github_headers() -> dict:
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def _parse_github_url(url: str) -> tuple[str, str]:
    parts = url.rstrip("/").split("/")
    if len(parts) < 2:
        return "", ""
    return parts[-2], parts[-1]


def _cache_key(tool_name: str, url: str, *extra) -> tuple:
    owner, repo = _parse_github_url(url)
    return (tool_name, owner.lower(), repo.lower(), *extra)


def _get_cached(key: tuple):
    cached = github_cache.get(key)
    if not cached:
        return None
    if time.time() - cached["saved_at"] >= GITHUB_CACHE_TTL_SECONDS:
        github_cache.pop(key, None)
        return None
    return {**cached["data"], "cached": True}


def _set_cached(key: tuple, data: dict):
    github_cache[key] = {
        "saved_at": time.time(),
        "data": data,
    }
    return data


@mcp.tool()
async def get_github_repo(url: str) -> dict:
    owner, repo = _parse_github_url(url)
    if not owner:
        return {"error": f"Invalid GitHub URL: {url}"}

    cache_key = _cache_key("repo", url)
    cached = _get_cached(cache_key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=GITHUB_TIMEOUT_SECONDS, follow_redirects=True) as client:
        res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=_github_headers(),
        )
        if res.status_code == 404:
            return {"error": "Repository not found."}
        if res.status_code != 200:
            return {"error": f"GitHub API error (status: {res.status_code})"}

        data = res.json()

        last_commit_at = None
        commits_res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1",
            headers=_github_headers(),
        )
        if commits_res.status_code == 200 and commits_res.json():
            last_commit_at = commits_res.json()[0]["commit"]["committer"]["date"]

    return _set_cached(
        cache_key,
        {
            "name": data["name"],
            "full_name": data["full_name"],
            "description": data.get("description") or "",
            "language": data.get("language") or "Unknown",
            "topics": data.get("topics") or [],
            "stars": data["stargazers_count"],
            "forks": data["forks_count"],
            "open_issues": data["open_issues_count"],
            "last_commit_at": last_commit_at,
            "cached": False,
        },
    )


@mcp.tool()
async def get_github_readme(url: str) -> dict:
    owner, repo = _parse_github_url(url)
    if not owner:
        return {"exists": False, "content": "", "error": f"Invalid GitHub URL: {url}"}

    cache_key = _cache_key("readme", url)
    cached = _get_cached(cache_key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=GITHUB_TIMEOUT_SECONDS, follow_redirects=True) as client:
        res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/readme",
            headers=_github_headers(),
        )
        if res.status_code == 404:
            return {"exists": False, "content": ""}
        if res.status_code != 200:
            return {"exists": False, "content": "", "error": f"GitHub API error (status: {res.status_code})"}

        encoded = res.json().get("content", "")
        decoded = base64.b64decode(encoded).decode("utf-8", errors="ignore")

    return _set_cached(
        cache_key,
        {
            "exists": True,
            "content": decoded[:3000],
            "cached": False,
        },
    )


@mcp.tool()
async def get_github_issues(url: str, max_count: int = 5) -> dict:
    owner, repo = _parse_github_url(url)
    if not owner:
        return {"issues": [], "error": f"Invalid GitHub URL: {url}"}

    cache_key = _cache_key("issues", url, max_count)
    cached = _get_cached(cache_key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=GITHUB_TIMEOUT_SECONDS, follow_redirects=True) as client:
        res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/issues",
            headers=_github_headers(),
            params={"state": "open", "per_page": max_count},
        )
        if res.status_code != 200:
            return {"issues": [], "error": f"GitHub API error (status: {res.status_code})"}

        issues = [
            {
                "title": issue["title"],
                "body": (issue.get("body") or "")[:200],
                "labels": [label["name"] for label in issue.get("labels", [])],
            }
            for issue in res.json()
            if "pull_request" not in issue
        ]

    return _set_cached(cache_key, {"issues": issues, "cached": False})


@mcp.tool()
async def get_github_languages(url: str) -> dict:
    owner, repo = _parse_github_url(url)
    if not owner:
        return {"languages": {}, "error": f"Invalid GitHub URL: {url}"}

    cache_key = _cache_key("languages", url)
    cached = _get_cached(cache_key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=GITHUB_TIMEOUT_SECONDS, follow_redirects=True) as client:
        res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/languages",
            headers=_github_headers(),
        )
        if res.status_code != 200:
            return {"languages": {}, "error": f"GitHub API error (status: {res.status_code})"}

        languages = res.json()

    return _set_cached(cache_key, {"languages": languages, "cached": False})


if __name__ == "__main__":
    import uvicorn

    print("MCP GitHub Server starting on http://localhost:8002/sse")
    uvicorn.run(mcp.sse_app(), host="0.0.0.0", port=8002)
