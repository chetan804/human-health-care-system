from functools import lru_cache
from redis import Redis
from backend.app.core.config import settings


@lru_cache
def redis_client():
    return Redis.from_url(settings().redis_url, socket_connect_timeout=2, socket_timeout=2)
