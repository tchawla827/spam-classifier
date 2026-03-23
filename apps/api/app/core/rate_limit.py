"""In-memory per-IP rate limiter for anonymous classify requests.

Design notes:
- Uses a sliding-window counter (list of timestamps per IP).
- Thread-safe via a threading.Lock; safe for a single-process FastAPI server.
- For multi-process / multi-replica deployments swap this for a Redis-backed
  implementation without changing the call-site in classify.py.
- Old timestamps are evicted lazily on each check, so memory is bounded by
  the number of unique IPs seen within the current window.
"""

import threading
import time
from collections import defaultdict
from typing import NamedTuple


class RateLimitResult(NamedTuple):
    allowed: bool
    retry_after: int  # seconds until the oldest token expires; 0 if allowed


class AnonRateLimiter:
    """Sliding-window rate limiter keyed by client IP."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        # ip -> sorted list of request timestamps (floats)
        self._store: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def check(self, ip: str) -> RateLimitResult:
        """Return whether the IP is within its rate limit.

        Side effect: records the current timestamp if the request is allowed.
        """
        if self.limit <= 0:
            # Feature disabled — always allow
            return RateLimitResult(allowed=True, retry_after=0)

        now = time.time()
        cutoff = now - self.window_seconds

        with self._lock:
            # Evict timestamps older than the window
            timestamps = [t for t in self._store[ip] if t > cutoff]

            if len(timestamps) >= self.limit:
                # Oldest timestamp + window = when a slot opens up
                retry_after = int(timestamps[0] + self.window_seconds - now) + 1
                return RateLimitResult(allowed=False, retry_after=max(retry_after, 1))

            timestamps.append(now)
            self._store[ip] = timestamps
            return RateLimitResult(allowed=True, retry_after=0)


def get_client_ip(request) -> str:  # type: ignore[no-untyped-def]
    """Extract the real client IP, honouring X-Forwarded-For from a proxy."""
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        # Take the first (leftmost) IP — the original client
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"
