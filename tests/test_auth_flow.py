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


async def test_dev_login_disabled_by_default(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    from app.config import settings

    monkeypatch.setattr(settings, "dev_auth_enabled", False)
    resp = await client.post("/api/auth/dev-login", json={"nickname": "alice"})
    assert resp.status_code == 404


async def test_dev_login_creates_user_when_enabled(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
):
    from app.config import settings

    monkeypatch.setattr(settings, "dev_auth_enabled", True)
    resp = await client.post("/api/auth/dev-login", json={"nickname": "devalice"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["nickname"] == "devalice"
    assert body["tokens"]["access_token"]


async def test_dev_login_reuses_existing_user(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
):
    from app.config import settings

    monkeypatch.setattr(settings, "dev_auth_enabled", True)
    user = User(google_sub="dev:bob", email="bob@dev.local", nickname="bob")
    db_session.add(user)
    await db_session.commit()

    resp = await client.post("/api/auth/dev-login", json={"nickname": "bob"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["nickname"] == "bob"


async def test_dev_login_grants_default_cosmetics(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
):
    """dev_login으로 신규 user 생성 시 inventory·loadout이 default로 채워져야 함."""
    import uuid

    from app.config import settings
    from app.cosmetics import repository as cosmetics_repo
    from app.cosmetics.models import Cosmetic

    monkeypatch.setattr(settings, "dev_auth_enabled", True)

    seed = [
        ("card_back", "back.navy", "네이비", True),
        ("card_back", "back.ocean", "오션", False),
        ("card_face", "face.classic", "클래식", True),
        ("card_face", "face.modern", "모던", False),
        ("table_theme", "table.green", "그린", True),
        ("table_theme", "table.walnut", "월넛", False),
        ("title", "title.beginner", "초보자", True),
        ("title", "title.fl_demon", "FL악마", False),
    ]
    for cat, code, name, is_default in seed:
        db_session.add(
            Cosmetic(category=cat, code=code, name=name, is_default=is_default)
        )
    await db_session.commit()

    resp = await client.post("/api/auth/dev-login", json={"nickname": "newbie_x"})
    assert resp.status_code == 200
    user_id = uuid.UUID(resp.json()["user"]["id"])

    inv = await cosmetics_repo.list_inventory_for_user(db_session, user_id)
    loadout = await cosmetics_repo.get_loadout_for_user(db_session, user_id)
    assert len(inv) == 8
    assert set(loadout.keys()) == {"card_back", "card_face", "table_theme", "title"}
