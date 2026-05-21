import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import jwt as jwt_lib
from app.cosmetics import repository as cosmetics_repo
from app.cosmetics import service as cosmetics_service
from app.cosmetics.models import Cosmetic
from app.users import service as users_service


async def _seed_8(session: AsyncSession):
    rows = [
        ("card_back", "back.navy", "네이비", True, 0),
        ("card_back", "back.ocean", "오션", False, 1),
        ("card_face", "face.classic", "클래식", True, 0),
        ("card_face", "face.modern", "모던", False, 1),
        ("table_theme", "table.green", "그린", True, 0),
        ("table_theme", "table.walnut", "월넛", False, 1),
        ("title", "title.beginner", "초보자", True, 0),
        ("title", "title.fl_demon", "FL악마", False, 1),
    ]
    for cat, code, name, is_default, sort_order in rows:
        session.add(
            Cosmetic(
                category=cat,
                code=code,
                name=name,
                is_default=is_default,
                sort_order=sort_order,
            )
        )
    await session.flush()


@pytest.mark.asyncio
async def test_get_catalog_returns_8_rows(
    client: AsyncClient, db_session: AsyncSession
):
    await _seed_8(db_session)
    await db_session.commit()

    res = await client.get("/api/cosmetics/catalog")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 8
    cats = {item["category"] for item in body}
    assert cats == {"card_back", "card_face", "table_theme", "title"}


@pytest.mark.asyncio
async def test_get_me_cosmetics_requires_auth(client: AsyncClient):
    res = await client.get("/api/me/cosmetics")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_get_me_cosmetics_returns_owned_and_loadout(
    client: AsyncClient, db_session: AsyncSession
):
    await _seed_8(db_session)
    user = await users_service.create_user(
        db_session, google_sub="api:alice", email="a@t.local", nickname="alice_api"
    )
    await cosmetics_service.grant_defaults(db_session, user.id)
    await db_session.commit()
    token = jwt_lib.issue_access(user.id)

    res = await client.get(
        "/api/me/cosmetics", headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body["owned"]) == 8
    assert set(body["loadout"].keys()) == {
        "card_back",
        "card_face",
        "table_theme",
        "title",
    }


@pytest.mark.asyncio
async def test_put_loadout_happy(client: AsyncClient, db_session: AsyncSession):
    await _seed_8(db_session)
    user = await users_service.create_user(
        db_session, google_sub="api:bob", email="b@t.local", nickname="bob_api"
    )
    await cosmetics_service.grant_defaults(db_session, user.id)
    await db_session.commit()
    token = jwt_lib.issue_access(user.id)

    catalog = {c.code: c for c in await cosmetics_repo.list_all_cosmetics(db_session)}
    body = {
        "card_back": str(catalog["back.ocean"].id),
        "card_face": str(catalog["face.modern"].id),
        "table_theme": str(catalog["table.walnut"].id),
        "title": str(catalog["title.fl_demon"].id),
    }
    res = await client.put(
        "/api/me/cosmetics/loadout",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["card_back"] == body["card_back"]


@pytest.mark.asyncio
async def test_put_loadout_category_mismatch_returns_422(
    client: AsyncClient, db_session: AsyncSession
):
    await _seed_8(db_session)
    user = await users_service.create_user(
        db_session, google_sub="api:carol", email="c@t.local", nickname="carol_api"
    )
    await cosmetics_service.grant_defaults(db_session, user.id)
    await db_session.commit()
    token = jwt_lib.issue_access(user.id)

    catalog = {c.code: c for c in await cosmetics_repo.list_all_cosmetics(db_session)}
    body = {
        "card_back": str(catalog["back.navy"].id),
        "card_face": str(catalog["face.classic"].id),
        "table_theme": str(catalog["table.green"].id),
        "title": str(catalog["back.ocean"].id),  # 카테고리 불일치
    }
    res = await client.put(
        "/api/me/cosmetics/loadout",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422
