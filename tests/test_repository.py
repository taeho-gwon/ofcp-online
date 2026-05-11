import fakeredis.aioredis
import pytest

from app.game.engine import create_game
from app.game.repository import GameLockError, GameRepository


@pytest.fixture
def repo() -> GameRepository:
    return GameRepository(fakeredis.aioredis.FakeRedis(decode_responses=True))


async def test_save_and_load_round_trip(repo: GameRepository):
    state = create_game("g1", ["p0", "p1"])
    await repo.save(state)

    loaded = await repo.load("g1")
    assert loaded is not None
    assert loaded.game_id == "g1"
    assert [p.player_id for p in loaded.players] == ["p0", "p1"]
    assert loaded.phase == state.phase
    assert loaded.current_player_idx == state.current_player_idx


async def test_load_missing_returns_none(repo: GameRepository):
    assert await repo.load("nope") is None


async def test_delete(repo: GameRepository):
    state = create_game("g1", ["p0", "p1"])
    await repo.save(state)
    await repo.delete("g1")
    assert await repo.load("g1") is None


async def test_lock_blocks_concurrent_acquisition(repo: GameRepository):
    async with repo.acquire_lock("g1"):
        with pytest.raises(GameLockError):
            async with repo.acquire_lock("g1"):
                pass


async def test_lock_releases_after_block(repo: GameRepository):
    async with repo.acquire_lock("g1"):
        pass
    # 다시 잡을 수 있어야 함
    async with repo.acquire_lock("g1"):
        pass


async def test_save_sets_ttl():
    """save마다 TTL이 갱신되어 활성 게임은 유지되고 방치된 게임만 만료된다."""
    redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    repo = GameRepository(redis, ttl_seconds=120)
    state = create_game("g1", ["p0", "p1"])

    await repo.save(state)
    ttl = await redis.ttl("game:g1")
    assert 0 < ttl <= 120
