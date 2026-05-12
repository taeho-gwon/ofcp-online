from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import jwt as jwt_lib
from app.users.models import User


async def _user(session: AsyncSession, *, nickname: str = "alice") -> User:
    user = User(
        google_sub=f"g-{nickname}",
        email=f"{nickname}@e.com",
        nickname=nickname,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_create_room_requires_auth(client: AsyncClient):
    resp = await client.post(
        "/api/rooms", json={"ruleset_name": "pineapple", "max_seats": 2}
    )
    assert resp.status_code == 401


async def test_create_room_returns_code_and_host(
    client: AsyncClient, db_session: AsyncSession
):
    user = await _user(db_session, nickname="alice")
    token = jwt_lib.issue_access(user.id)
    resp = await client.post(
        "/api/rooms",
        headers=_auth(token),
        json={"ruleset_name": "pineapple", "max_seats": 2},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["code"]) == 6
    assert body["host_user_id"] == str(user.id)
    assert len(body["members"]) == 1
    assert body["members"][0]["nickname"] == "alice"
    assert body["members"][0]["ready"] is True  # 방장 자동 ready
    assert body["game_id"] is None


async def test_get_room_returns_state(client: AsyncClient, db_session: AsyncSession):
    user = await _user(db_session, nickname="alice")
    token = jwt_lib.issue_access(user.id)
    create = await client.post(
        "/api/rooms",
        headers=_auth(token),
        json={"ruleset_name": "pineapple", "max_seats": 2},
    )
    code = create.json()["code"]

    resp = await client.get(f"/api/rooms/{code}", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["code"] == code


async def test_get_room_missing_returns_404(
    client: AsyncClient, db_session: AsyncSession
):
    user = await _user(db_session, nickname="alice")
    token = jwt_lib.issue_access(user.id)
    resp = await client.get("/api/rooms/ZZZZZZ", headers=_auth(token))
    assert resp.status_code == 404


async def test_create_room_invalid_seats_returns_422(
    client: AsyncClient, db_session: AsyncSession
):
    user = await _user(db_session, nickname="alice")
    token = jwt_lib.issue_access(user.id)
    resp = await client.post(
        "/api/rooms",
        headers=_auth(token),
        json={"ruleset_name": "pineapple", "max_seats": 5},
    )
    assert resp.status_code == 422
