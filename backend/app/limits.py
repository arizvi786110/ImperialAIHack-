"""A6: simple in-process rate limiting + per-session AI cost guard.

In-memory (resets on restart, single process). Good enough for a demo; not a
production limiter.
"""

import time
from collections import defaultdict, deque
from threading import Lock

from .config import settings
from .errors import ApiError

_hits: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def rate_limit(bucket: str, key: str, per_minute: int) -> None:
    now = time.monotonic()
    with _lock:
        q = _hits[f"{bucket}:{key}"]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= per_minute:
            raise ApiError(429, "RATE_LIMITED", f"Too many {bucket} requests; wait a moment and try again.")
        q.append(now)


def check_session_budget(kind: str, used: int) -> None:
    """Cap AI-backed calls per session so one session can't burn the API budget."""
    cap = settings.max_attempts_per_session if kind == "attempt" else settings.max_assists_per_session
    if used >= cap:
        raise ApiError(429, "SESSION_LIMIT_REACHED", f"This session has reached its {kind} limit ({cap}).")
