import os
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, status

from auth import CurrentUser

WINDOW_SECONDS = int(os.getenv("AI_RATE_LIMIT_WINDOW_SECONDS", "60"))

ENDPOINT_LIMITS = {
    "rag_search": int(os.getenv("RATE_LIMIT_RAG_SEARCH", "5")),
    "rag_suggest_tags": int(os.getenv("RATE_LIMIT_RAG_SUGGEST_TAGS", "5")),
    "rag_similar": int(os.getenv("RATE_LIMIT_RAG_SIMILAR", "10")),
    "agent_chat": int(os.getenv("RATE_LIMIT_AGENT_CHAT", "2")),
    "agent_improve": int(os.getenv("RATE_LIMIT_AGENT_IMPROVE", "2")),
    "github_repo": int(os.getenv("RATE_LIMIT_GITHUB_REPO", "10")),
}

_requests: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_lock = Lock()


def check_rate_limit(current_user: CurrentUser, endpoint: str):
    limit = ENDPOINT_LIMITS.get(endpoint)
    if not limit or limit <= 0:
        return

    now = time.time()
    key = (current_user.email, endpoint)

    with _lock:
        history = _requests[key]
        while history and now - history[0] >= WINDOW_SECONDS:
            history.popleft()

        if len(history) >= limit:
            retry_after = max(1, int(WINDOW_SECONDS - (now - history[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"요청이 너무 많습니다. {retry_after}초 후 다시 시도해주세요.",
                headers={"Retry-After": str(retry_after)},
            )

        history.append(now)
