from datetime import UTC, datetime, timedelta

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import jwt as jwt_lib
from app.records import repository as records_repo
from app.users.models import User


async def _create_user(session: AsyncSession, *, nickname: str) -> User:
    user = User(
        google_sub=f"g-{nickname}",
        email=f"{nickname}@e.com",
        nickname=nickname,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def alice(db_session: AsyncSession) -> User:
    return await _create_user(db_session, nickname="alice")


@pytest_asyncio.fixture
async def bob(db_session: AsyncSession) -> User:
    return await _create_user(db_session, nickname="bob")


def _bearer(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {jwt_lib.issue_access(user.id)}"}


async def _seed_game(
    session: AsyncSession,
    *,
    game_id: str,
    started_at: datetime,
    players: list[User],
    ended_at: datetime | None = None,
) -> None:
    await records_repo.create_game(
        session,
        game_id=game_id,
        ruleset="pineapple",
        started_at=started_at,
        room_code=None,
    )
    await records_repo.add_players(
        session,
        game_id=game_id,
        seats=[(i, u.id) for i, u in enumerate(players)],
    )
    if ended_at is not None:
        await records_repo.finish_game(
            session,
            game_id=game_id,
            ended_at=ended_at,
            final_scores={u.id: 100 + i for i, u in enumerate(players)},
        )
    await session.commit()


async def test_my_games_requires_auth(client: AsyncClient):
    resp = await client.get("/api/records/users/me/games")
    assert resp.status_code == 401


async def test_my_games_returns_only_own_games(
    client: AsyncClient,
    db_session: AsyncSession,
    alice: User,
    bob: User,
):
    now = datetime.now(UTC)
    await _seed_game(
        db_session,
        game_id="g-alice-1",
        started_at=now - timedelta(hours=2),
        players=[alice, bob],
        ended_at=now - timedelta(hours=1),
    )
    await _seed_game(
        db_session,
        game_id="g-bob-only",
        started_at=now - timedelta(minutes=30),
        players=[bob],
    )

    resp = await client.get("/api/records/users/me/games", headers=_bearer(alice))
    assert resp.status_code == 200
    body = resp.json()
    ids = [e["game_id"] for e in body["entries"]]
    assert ids == ["g-alice-1"]
    assert body["entries"][0]["round_count"] == 0


async def test_my_games_ordered_by_started_desc_with_pagination(
    client: AsyncClient,
    db_session: AsyncSession,
    alice: User,
):
    base = datetime.now(UTC)
    for i in range(5):
        await _seed_game(
            db_session,
            game_id=f"g-{i}",
            started_at=base - timedelta(minutes=i),
            players=[alice],
        )

    resp = await client.get(
        "/api/records/users/me/games?limit=2&offset=1", headers=_bearer(alice)
    )
    assert resp.status_code == 200
    body = resp.json()
    assert [e["game_id"] for e in body["entries"]] == ["g-1", "g-2"]
    assert body["limit"] == 2
    assert body["offset"] == 1


async def test_other_user_games_visible(
    client: AsyncClient,
    db_session: AsyncSession,
    alice: User,
    bob: User,
):
    now = datetime.now(UTC)
    await _seed_game(
        db_session,
        game_id="g-bob-1",
        started_at=now,
        players=[bob, alice],
    )

    resp = await client.get(
        f"/api/records/users/{bob.id}/games", headers=_bearer(alice)
    )
    assert resp.status_code == 200
    ids = [e["game_id"] for e in resp.json()["entries"]]
    assert ids == ["g-bob-1"]


async def test_game_detail_returns_players_with_nicknames(
    client: AsyncClient,
    db_session: AsyncSession,
    alice: User,
    bob: User,
):
    now = datetime.now(UTC)
    await _seed_game(
        db_session,
        game_id="gd-1",
        started_at=now - timedelta(minutes=10),
        players=[alice, bob],
        ended_at=now,
    )

    resp = await client.get("/api/records/games/gd-1", headers=_bearer(alice))
    assert resp.status_code == 200
    body = resp.json()
    assert body["game_id"] == "gd-1"
    assert body["ended_at"] is not None
    nicks = sorted(p["nickname"] for p in body["players"])
    assert nicks == ["alice", "bob"]
    seats = sorted(p["seat_idx"] for p in body["players"])
    assert seats == [0, 1]


async def test_game_detail_404(client: AsyncClient, alice: User):
    resp = await client.get("/api/records/games/nope", headers=_bearer(alice))
    assert resp.status_code == 404


async def test_game_events_returns_in_order(
    client: AsyncClient,
    db_session: AsyncSession,
    alice: User,
    bob: User,
):
    now = datetime.now(UTC)
    await _seed_game(
        db_session,
        game_id="ge-1",
        started_at=now,
        players=[alice, bob],
    )
    await records_repo.append_event(
        db_session,
        game_id="ge-1",
        seq=1,
        ts=now,
        event_type="first_turn",
        actor_id=alice.id,
        payload={"placements": {}},
    )
    await records_repo.append_event(
        db_session,
        game_id="ge-1",
        seq=2,
        ts=now,
        event_type="round_end",
        actor_id=None,
        payload={"round_number": 1},
    )
    await db_session.commit()

    resp = await client.get("/api/records/games/ge-1/events", headers=_bearer(alice))
    assert resp.status_code == 200
    body = resp.json()
    assert body["game_id"] == "ge-1"
    seqs = [e["seq"] for e in body["events"]]
    types = [e["event_type"] for e in body["events"]]
    assert seqs == [1, 2]
    assert types == ["first_turn", "round_end"]
    assert body["events"][0]["actor_id"] == str(alice.id)
    assert body["events"][1]["actor_id"] is None


async def test_game_events_404(client: AsyncClient, alice: User):
    resp = await client.get("/api/records/games/nope/events", headers=_bearer(alice))
    assert resp.status_code == 404
