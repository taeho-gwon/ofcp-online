from collections.abc import Iterator

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import jwt as jwt_lib
from app.auth import oauth
from app.auth.oauth import GoogleIdentity
from app.users.models import User


@pytest.fixture
def fake_google(monkeypatch: pytest.MonkeyPatch) -> Iterator[dict[str, GoogleIdentity]]:
    """id_token 값을 키로 미리 등록된 GoogleIdentity를 돌려주는 mock."""
    registry: dict[str, GoogleIdentity] = {}

    def fake_verify(id_token: str) -> GoogleIdentity:
        if id_token not in registry:
            raise oauth.GoogleAuthError("unknown id_token")
        return registry[id_token]

    monkeypatch.setattr(oauth, "verify_google_id_token", fake_verify)
    # router가 from-import로 들고 있으므로 거기도 패치
    from app.auth import router as auth_router

    monkeypatch.setattr(auth_router, "verify_google_id_token", fake_verify)
    yield registry


async def test_google_login_new_user_returns_signup_token(
    client: AsyncClient, fake_google: dict[str, GoogleIdentity]
):
    fake_google["tok-1"] = GoogleIdentity(sub="g-1", email="alice@example.com")

    resp = await client.post("/api/auth/google", json={"id_token": "tok-1"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["needs_signup"] is True
    assert body["signup_token"]
    assert body["email"] == "alice@example.com"
    assert body["tokens"] is None


async def test_signup_creates_user_and_returns_tokens(
    client: AsyncClient,
    db_session: AsyncSession,
    fake_google: dict[str, GoogleIdentity],
):
    fake_google["tok-1"] = GoogleIdentity(sub="g-1", email="alice@example.com")
    r1 = await client.post("/api/auth/google", json={"id_token": "tok-1"})
    signup_token = r1.json()["signup_token"]

    r2 = await client.post(
        "/api/auth/signup",
        json={"signup_token": signup_token, "nickname": "alice"},
    )
    assert r2.status_code == 200
    body = r2.json()
    assert body["tokens"]["access_token"]
    assert body["tokens"]["refresh_token"]
    assert body["user"]["nickname"] == "alice"
    assert body["user"]["email"] == "alice@example.com"


async def test_google_login_existing_user_returns_tokens(
    client: AsyncClient,
    db_session: AsyncSession,
    fake_google: dict[str, GoogleIdentity],
):
    user = User(google_sub="g-1", email="alice@example.com", nickname="alice")
    db_session.add(user)
    await db_session.commit()

    fake_google["tok-1"] = GoogleIdentity(sub="g-1", email="alice@example.com")
    resp = await client.post("/api/auth/google", json={"id_token": "tok-1"})
    body = resp.json()
    assert body["needs_signup"] is False
    assert body["tokens"]["access_token"]
    assert body["user"]["nickname"] == "alice"


async def test_signup_nickname_conflict_returns_409(
    client: AsyncClient,
    db_session: AsyncSession,
    fake_google: dict[str, GoogleIdentity],
):
    existing = User(google_sub="g-1", email="alice@example.com", nickname="alice")
    db_session.add(existing)
    await db_session.commit()

    fake_google["tok-2"] = GoogleIdentity(sub="g-2", email="bob@example.com")
    r1 = await client.post("/api/auth/google", json={"id_token": "tok-2"})
    signup_token = r1.json()["signup_token"]

    r2 = await client.post(
        "/api/auth/signup",
        json={"signup_token": signup_token, "nickname": "ALICE"},  # CITEXT 충돌
    )
    assert r2.status_code == 409


async def test_signup_token_reuse_blocked_after_first_use(
    client: AsyncClient, fake_google: dict[str, GoogleIdentity]
):
    fake_google["tok-1"] = GoogleIdentity(sub="g-1", email="alice@example.com")
    r1 = await client.post("/api/auth/google", json={"id_token": "tok-1"})
    signup_token = r1.json()["signup_token"]

    await client.post(
        "/api/auth/signup",
        json={"signup_token": signup_token, "nickname": "alice"},
    )
    r3 = await client.post(
        "/api/auth/signup",
        json={"signup_token": signup_token, "nickname": "bob"},
    )
    assert r3.status_code == 409


async def test_refresh_issues_new_pair(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = User(google_sub="g-1", email="alice@example.com", nickname="alice")
    db_session.add(user)
    await db_session.commit()

    refresh = jwt_lib.issue_refresh(user.id)
    resp = await client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["refresh_token"]


async def test_refresh_rejects_access_token(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = User(google_sub="g-1", email="alice@example.com", nickname="alice")
    db_session.add(user)
    await db_session.commit()

    access = jwt_lib.issue_access(user.id)
    resp = await client.post("/api/auth/refresh", json={"refresh_token": access})
    assert resp.status_code == 401
