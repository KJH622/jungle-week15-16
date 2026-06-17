from fastapi import APIRouter
import httpx
import os
from dotenv import load_dotenv

load_dotenv(encoding='utf-8')

router = APIRouter()

# GitHub Personal Access Token — 없으면 시간당 60회, 있으면 5000회
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")


def parse_github_url(url: str):
    """
    https://github.com/owner/repo-name → (owner, repo)
    URL 끝 슬래시 제거 후 마지막 두 세그먼트 추출
    """
    parts = url.rstrip("/").split("/")
    if len(parts) < 2:
        return None, None
    return parts[-2], parts[-1]


@router.get("/github/repo")
async def get_github_repo(url: str):
    """
    GitHub URL을 받아 레포지토리 기본 정보 반환
    - url: 게시글에 저장된 github_url (e.g. https://github.com/user/repo)
    """
    owner, repo = parse_github_url(url)
    if not owner or not repo:
        return {"error": "유효하지 않은 GitHub URL입니다."}

    # GitHub API 요청 헤더
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"  # 토큰 있으면 rate limit 5000/h

    async with httpx.AsyncClient() as client:
        # 레포 기본 정보 조회
        res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers,
            timeout=10.0,
        )

        if res.status_code == 404:
            return {"error": "레포지토리를 찾을 수 없습니다."}
        if res.status_code == 403:
            # Rate Limit 초과 여부 확인 — X-RateLimit-Remaining 헤더가 0이면 한도 초과
            remaining = res.headers.get("X-RateLimit-Remaining", "?")
            reset_ts = res.headers.get("X-RateLimit-Reset", "")
            reset_time = ""
            if reset_ts:
                from datetime import datetime, timezone
                reset_time = datetime.fromtimestamp(int(reset_ts), tz=timezone.utc).strftime("%H:%M UTC")
            return {
                "error": f"GitHub API Rate Limit 초과 (남은 횟수: {remaining}). "
                         f"{'리셋 시간: ' + reset_time if reset_time else ''} "
                         f".env에 GITHUB_TOKEN을 설정하면 시간당 5000회로 늘어납니다."
            }
        if res.status_code != 200:
            return {"error": f"GitHub API 오류 (status: {res.status_code})"}

        data = res.json()

        # 최근 커밋 날짜 — 같은 클라이언트로 /commits 엔드포인트 추가 조회
        last_commit_at = None
        commits_res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1",
            headers=headers,
            timeout=10.0,
        )
        if commits_res.status_code == 200:
            commits_data = commits_res.json()
            if commits_data:
                last_commit_at = commits_data[0]["commit"]["committer"]["date"]

    return {
        "name": data["name"],
        "full_name": data["full_name"],
        "description": data.get("description") or "",
        "stars": data["stargazers_count"],
        "forks": data["forks_count"],
        "open_issues": data["open_issues_count"],
        "language": data.get("language") or "Unknown",
        "topics": data.get("topics") or [],  # 레포 소유자가 설정한 주제 태그 목록
        "html_url": data["html_url"],
        "updated_at": data["updated_at"],
        "last_commit_at": last_commit_at,
    }
