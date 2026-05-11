import json
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from redis.asyncio import Redis

from app.game.state import GameState

GAME_KEY = "game:{game_id}"
LOCK_KEY = "game:{game_id}:lock"
LOCK_TTL_SECONDS = 5
DEFAULT_GAME_TTL_SECONDS = 3600


class GameLockError(RuntimeError):
    """다른 요청이 같은 게임을 처리 중이라 락 획득에 실패."""


class GameRepository:
    def __init__(
        self, redis: Redis, ttl_seconds: int = DEFAULT_GAME_TTL_SECONDS
    ) -> None:
        self._redis = redis
        self._ttl_seconds = ttl_seconds

    async def save(self, state: GameState) -> None:
        # save마다 TTL을 다시 걸어 활성 게임은 유지되고 방치된 게임만 만료된다.
        await self._redis.set(
            GAME_KEY.format(game_id=state.game_id),
            json.dumps(state.to_dict()),
            ex=self._ttl_seconds,
        )

    async def load(self, game_id: str) -> GameState | None:
        raw = await self._redis.get(GAME_KEY.format(game_id=game_id))
        if raw is None:
            return None
        return GameState.from_dict(json.loads(raw))

    async def delete(self, game_id: str) -> None:
        await self._redis.delete(GAME_KEY.format(game_id=game_id))

    @asynccontextmanager
    async def acquire_lock(self, game_id: str) -> AsyncIterator[None]:
        """동시 수정 방지용 락. TTL로 deadlock 회피."""
        token = uuid.uuid4().hex
        key = LOCK_KEY.format(game_id=game_id)
        acquired = await self._redis.set(key, token, nx=True, ex=LOCK_TTL_SECONDS)
        if not acquired:
            raise GameLockError(f"Game {game_id} is being modified by another request")
        try:
            yield
        finally:
            # 본인이 건 락만 해제 (TTL로 만료된 경우 다른 요청의 락을 풀어버리면 안 됨)
            current = await self._redis.get(key)
            if current == token:
                await self._redis.delete(key)
