from redis.asyncio import Redis, from_url

from app.config import settings

_client: Redis | None = None


def get_redis() -> Redis:
    """싱글톤 비동기 Redis 클라이언트. FastAPI Depends에서 사용."""
    global _client
    if _client is None:
        _client = from_url(settings.redis_url, decode_responses=True)
    return _client


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
