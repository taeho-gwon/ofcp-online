from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import jwt as jwt_lib
from app.users.models import User


async def _create_user(session: AsyncSession, *, nickname: str = "alice") -> User:
    user = User(
        google_sub=f"g-{nickname}",
        email=f"{nickname}@e.com",
        nickname=nickname,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def test_get_me_requires_auth(client: AsyncClient):
    resp = await client.get("/api/users/me")
    assert resp.status_code == 401


async def test_get_me_returns_user(client: AsyncClient, db_session: AsyncSession):
    user = await _create_user(db_session, nickname="alice")
    token = jwt_lib.issue_access(user.id)
    resp = await client.get(
        "/api/users/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["nickname"] == "alice"
    assert body["email"] == "alice@e.com"


async def test_patch_nickname_updates(client: AsyncClient, db_session: AsyncSession):
    user = await _create_user(db_session, nickname="alice")
    token = jwt_lib.issue_access(user.id)
    resp = await client.patch(
        "/api/users/me/nickname",
        headers={"Authorization": f"Bearer {token}"},
        json={"nickname": "alice2"},
    )
    assert resp.status_code == 200
    assert resp.json()["nickname"] == "alice2"


async def test_patch_nickname_conflict(client: AsyncClient, db_session: AsyncSession):
    await _create_user(db_session, nickname="bob")
    user = await _create_user(db_session, nickname="alice")
    token = jwt_lib.issue_access(user.id)
    resp = await client.patch(
        "/api/users/me/nickname",
        headers={"Authorization": f"Bearer {token}"},
        json={"nickname": "BOB"},  # CITEXT 충돌
    )
    assert resp.status_code == 409


async def test_patch_nickname_invalid_format(
    client: AsyncClient, db_session: AsyncSession
):
    user = await _create_user(db_session, nickname="alice")
    token = jwt_lib.issue_access(user.id)
    resp = await client.patch(
        "/api/users/me/nickname",
        headers={"Authorization": f"Bearer {token}"},
        json={"nickname": "a"},  # 너무 짧음 — pydantic 422
    )
    assert resp.status_code == 422


async def test_check_nickname_available(client: AsyncClient):
    resp = await client.get("/api/users/check-nickname", params={"nickname": "freshie"})
    assert resp.status_code == 200
    assert resp.json() == {"available": True}


async def test_check_nickname_taken(client: AsyncClient, db_session: AsyncSession):
    await _create_user(db_session, nickname="alice")
    resp = await client.get("/api/users/check-nickname", params={"nickname": "ALICE"})
    assert resp.json() == {"available": False}


async def test_check_nickname_invalid_format(client: AsyncClient):
    resp = await client.get(
        "/api/users/check-nickname", params={"nickname": "bad name!"}
    )
    # pydantic Query는 길이만 강제 → 형식 위반은 unavailable로 응답
    if resp.status_code == 200:
        assert resp.json() == {"available": False}
    else:
        assert resp.status_code == 422
