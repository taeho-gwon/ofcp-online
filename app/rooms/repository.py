import json
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from redis.asyncio import Redis

from app.rooms.schemas import Room

ROOM_KEY = "room:{code}"
LOCK_KEY = "room:{code}:lock"
LOCK_TTL_SECONDS = 5
DEFAULT_ROOM_TTL_SECONDS = 3600


class RoomLockError(RuntimeError):
    pass


class RoomRepository:
    def __init__(
        self, redis: Redis, ttl_seconds: int = DEFAULT_ROOM_TTL_SECONDS
    ) -> None:
        self._redis = redis
        self._ttl_seconds = ttl_seconds

    async def save(self, room: Room) -> None:
        await self._redis.set(
            ROOM_KEY.format(code=room.code),
            json.dumps(room.to_dict()),
            ex=self._ttl_seconds,
        )

    async def create_if_absent(self, room: Room) -> bool:
        """코드 충돌 시 False. 호출자가 새 코드로 재시도."""
        ok = await self._redis.set(
            ROOM_KEY.format(code=room.code),
            json.dumps(room.to_dict()),
            ex=self._ttl_seconds,
            nx=True,
        )
        return bool(ok)

    async def load(self, code: str) -> Room | None:
        raw = await self._redis.get(ROOM_KEY.format(code=code))
        if raw is None:
            return None
        return Room.from_dict(json.loads(raw))

    async def delete(self, code: str) -> None:
        await self._redis.delete(ROOM_KEY.format(code=code))

    @asynccontextmanager
    async def acquire_lock(self, code: str) -> AsyncIterator[None]:
        token = uuid.uuid4().hex
        key = LOCK_KEY.format(code=code)
        acquired = await self._redis.set(key, token, nx=True, ex=LOCK_TTL_SECONDS)
        if not acquired:
            raise RoomLockError(f"Room {code} is being modified by another request")
        try:
            yield
        finally:
            current = await self._redis.get(key)
            if current == token:
                await self._redis.delete(key)
