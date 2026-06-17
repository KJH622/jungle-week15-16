import json
import time


def log_openai_usage(endpoint: str, user: str, response, extra: dict | None = None):
    usage = getattr(response, "usage", None)
    if not usage:
        return

    payload = {
        "event": "openai_usage",
        "endpoint": endpoint,
        "user": user,
        "prompt_tokens": getattr(usage, "prompt_tokens", None),
        "completion_tokens": getattr(usage, "completion_tokens", None),
        "total_tokens": getattr(usage, "total_tokens", None),
        "created_at": int(time.time()),
    }
    if extra:
        payload.update(extra)

    print(json.dumps(payload, ensure_ascii=False), flush=True)
