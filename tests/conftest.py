"""DB-의존 테스트용 공용 fixture.

테스트 DB는 ofcp_test. 세션이 시작될 때 한 번 생성·스키마 적용하고,
각 테스트 함수 시작 시 users TRUNCATE.
"""

from collections.abc import AsyncIterator

import asyncpg
import fakeredis.aioredis
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.core.db import Base, get_session
from app.core.redis import get_redis
from app.cosmetics import models as _cosmetics_models  # noqa: F401
from app.main import app
from app.records import models as _records_models  # noqa: F401
from app.users import models as _users_models  # noqa: F401

TEST_DB_NAME = "ofcp_test"


def _split_url(url: str) -> tuple[str, str]:
    base, _, dbname = url.rpartition("/")
    return base, dbname


@pytest.fixture(scope="session")
def test_db_url() -> str:
    base, _ = _split_url(settings.database_url)
    return f"{base}/{TEST_DB_NAME}"


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def _setup_db(test_db_url: str) -> AsyncIterator[AsyncEngine]:
    base, _ = _split_url(settings.database_url)
    admin_dsn = (base + "/postgres").replace("postgresql+asyncpg://", "postgresql://")

    conn = await asyncpg.connect(admin_dsn)
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", TEST_DB_NAME
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{TEST_DB_NAME}"')
    finally:
        await conn.close()

    engine = create_async_engine(test_db_url)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
        await conn.execute(text("DROP TYPE IF EXISTS cosmetic_category"))
        await conn.execute(
            text(
                "CREATE TYPE cosmetic_category AS ENUM "
                "('card_back', 'card_face', 'table_theme', 'title')"
            )
        )
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_engine(_setup_db: AsyncEngine) -> AsyncEngine:
    async with _setup_db.begin() as conn:
        await conn.execute(
            text(
                "TRUNCATE TABLE "
                "user_cosmetic_loadout, user_cosmetic_inventory, cosmetics, "
                "game_events, game_players, games, users "
                "RESTART IDENTITY CASCADE"
            )
        )
    return _setup_db


@pytest_asyncio.fixture
async def db_session(db_engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    sm = async_sessionmaker(db_engine, expire_on_commit=False)
    async with sm() as session:
        yield session


@pytest_asyncio.fixture
async def fake_redis() -> AsyncIterator[fakeredis.aioredis.FakeRedis]:
    redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield redis
    await redis.aclose()


@pytest_asyncio.fixture
async def client(
    db_engine: AsyncEngine,
    fake_redis: fakeredis.aioredis.FakeRedis,
) -> AsyncIterator[AsyncClient]:
    sm = async_sessionmaker(db_engine, expire_on_commit=False)

    async def _override_session() -> AsyncIterator[AsyncSession]:
        async with sm() as session:
            yield session

    def _override_redis() -> fakeredis.aioredis.FakeRedis:
        return fake_redis

    app.dependency_overrides[get_session] = _override_session
    app.dependency_overrides[get_redis] = _override_redis
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
