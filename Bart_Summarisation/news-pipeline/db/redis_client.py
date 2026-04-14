"""
Redis client — Upstash compatible.

Upstash requires TLS. The REDIS_URL env var must start with  rediss://
(two s's). redis.from_url() handles SSL automatically when it sees that scheme.
"""
import redis

from config.settings import settings


def get_redis() -> redis.Redis:
    """
    Return a Redis client connected via the full URL.
    Works for Upstash (rediss://) and local Redis (redis://).
    """
    return redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,   # all keys/values come back as str, not bytes
        socket_connect_timeout=10,
        socket_timeout=10,
    )
