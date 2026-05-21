import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cosmetics import repository as cosmetics_repo
from app.cosmetics import service as cosmetics_service
from app.cosmetics.models import Cosmetic, UserCosmeticInventory, UserCosmeticLoadout
from app.cosmetics.schemas import LoadoutUpdateIn
from app.users import service as users_service


async def _make_user(session: AsyncSession, nickname: str):
    user = await users_service.create_user(
        session,
        google_sub=f"sub:{nickname}",
        email=f"{nickname}@t.local",
        nickname=nickname,
    )
    await session.flush()
    return user


@pytest_asyncio.fixture
async def _seed_catalog(db_session: AsyncSession):
    """카탈로그 8 row를 직접 INSERT — 테스트 DB는 마이그레이션을 안 거치므로."""
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
        db_session.add(
            Cosmetic(
                category=cat,
                code=code,
                name=name,
                is_default=is_default,
                sort_order=sort_order,
            )
        )
    await db_session.flush()
    return rows


@pytest.mark.asyncio
async def test_grant_defaults_new_user_inventory_and_loadout(
    db_session: AsyncSession, _seed_catalog
):
    user = await _make_user(db_session, "alice")

    await cosmetics_service.grant_defaults(db_session, user.id)
    await db_session.flush()

    inv_ids = await cosmetics_repo.list_inventory_for_user(db_session, user.id)
    assert len(inv_ids) == 8

    loadout = await cosmetics_repo.get_loadout_for_user(db_session, user.id)
    assert set(loadout.keys()) == {"card_back", "card_face", "table_theme", "title"}

    codes = (
        await db_session.execute(
            select(Cosmetic.category, Cosmetic.code, Cosmetic.id).where(
                Cosmetic.is_default.is_(True)
            )
        )
    ).all()
    default_by_cat = {cat: cid for cat, _code, cid in codes}
    for cat, cid in default_by_cat.items():
        assert loadout[cat] == cid


@pytest.mark.asyncio
async def test_grant_defaults_idempotent_preserves_user_selection(
    db_session: AsyncSession, _seed_catalog
):
    user = await _make_user(db_session, "bob")
    await cosmetics_service.grant_defaults(db_session, user.id)

    # 유저가 alt(card_back.ocean)로 변경
    ocean = (
        await db_session.execute(select(Cosmetic).where(Cosmetic.code == "back.ocean"))
    ).scalar_one()
    await cosmetics_repo.upsert_loadout(
        db_session, user_id=user.id, items={"card_back": ocean.id}
    )
    await db_session.flush()

    # 다시 grant_defaults 호출 — 사용자 선택 보존
    await cosmetics_service.grant_defaults(db_session, user.id)
    await db_session.flush()

    loadout = await cosmetics_repo.get_loadout_for_user(db_session, user.id)
    assert loadout["card_back"] == ocean.id


@pytest.mark.asyncio
async def test_update_loadout_happy(db_session: AsyncSession, _seed_catalog):
    user = await _make_user(db_session, "carol")
    await cosmetics_service.grant_defaults(db_session, user.id)

    catalog = {
        (c.category, c.code): c.id
        for c in await cosmetics_repo.list_all_cosmetics(db_session)
    }
    payload = LoadoutUpdateIn(
        card_back=catalog[("card_back", "back.ocean")],
        card_face=catalog[("card_face", "face.modern")],
        table_theme=catalog[("table_theme", "table.walnut")],
        title=catalog[("title", "title.fl_demon")],
    )

    result = await cosmetics_service.update_loadout(db_session, user.id, payload)
    await db_session.flush()

    assert result.card_back == catalog[("card_back", "back.ocean")]
    loadout = await cosmetics_repo.get_loadout_for_user(db_session, user.id)
    assert loadout["card_back"] == catalog[("card_back", "back.ocean")]
    assert loadout["title"] == catalog[("title", "title.fl_demon")]


@pytest.mark.asyncio
async def test_update_loadout_not_owned(db_session: AsyncSession, _seed_catalog):
    """다른 user의 cosmetic을 owner 검사로 거부."""
    user = await _make_user(db_session, "dave")
    await cosmetics_service.grant_defaults(db_session, user.id)

    catalog = {c.code: c for c in await cosmetics_repo.list_all_cosmetics(db_session)}
    ocean = catalog["back.ocean"]
    # owner 검사 시뮬레이션: 인벤토리에서 한 row 삭제 후 그걸 장착 시도
    await db_session.execute(
        UserCosmeticInventory.__table__.delete().where(
            (UserCosmeticInventory.user_id == user.id)
            & (UserCosmeticInventory.cosmetic_id == ocean.id)
        )
    )
    await db_session.flush()

    payload = LoadoutUpdateIn(
        card_back=ocean.id,
        card_face=catalog["face.classic"].id,
        table_theme=catalog["table.green"].id,
        title=catalog["title.beginner"].id,
    )

    with pytest.raises(cosmetics_service.LoadoutValidationError):
        await cosmetics_service.update_loadout(db_session, user.id, payload)


@pytest.mark.asyncio
async def test_update_loadout_category_mismatch(
    db_session: AsyncSession, _seed_catalog
):
    """title 슬롯에 card_back을 보내면 거부."""
    user = await _make_user(db_session, "eve")
    await cosmetics_service.grant_defaults(db_session, user.id)
    catalog = {c.code: c for c in await cosmetics_repo.list_all_cosmetics(db_session)}

    payload = LoadoutUpdateIn(
        card_back=catalog["back.navy"].id,
        card_face=catalog["face.classic"].id,
        table_theme=catalog["table.green"].id,
        title=catalog["back.ocean"].id,  # 카테고리 불일치
    )
    with pytest.raises(cosmetics_service.LoadoutValidationError):
        await cosmetics_service.update_loadout(db_session, user.id, payload)


@pytest.mark.asyncio
async def test_update_loadout_unknown_cosmetic(db_session: AsyncSession, _seed_catalog):
    """존재하지 않는 cosmetic_id 거부."""
    user = await _make_user(db_session, "frank")
    await cosmetics_service.grant_defaults(db_session, user.id)
    catalog = {c.code: c for c in await cosmetics_repo.list_all_cosmetics(db_session)}

    payload = LoadoutUpdateIn(
        card_back=uuid.uuid4(),  # 존재하지 않음
        card_face=catalog["face.classic"].id,
        table_theme=catalog["table.green"].id,
        title=catalog["title.beginner"].id,
    )
    with pytest.raises(cosmetics_service.LoadoutValidationError):
        await cosmetics_service.update_loadout(db_session, user.id, payload)


@pytest.mark.asyncio
async def test_get_loadouts_for_users_multi(db_session: AsyncSession, _seed_catalog):
    u1 = await _make_user(db_session, "g1")
    u2 = await _make_user(db_session, "g2")
    await cosmetics_service.grant_defaults(db_session, u1.id)
    await cosmetics_service.grant_defaults(db_session, u2.id)
    await db_session.flush()

    result = await cosmetics_service.get_loadouts_for_users(db_session, [u1.id, u2.id])
    assert set(result.keys()) == {u1.id, u2.id}
    assert result[u1.id]["card_back"] == "back.navy"
    assert result[u1.id]["title"] == "title.beginner"
    assert result[u2.id]["card_face"] == "face.classic"


@pytest.mark.asyncio
async def test_get_loadouts_for_users_empty(db_session: AsyncSession, _seed_catalog):
    result = await cosmetics_service.get_loadouts_for_users(db_session, [])
    assert result == {}


@pytest.mark.asyncio
async def test_get_loadouts_for_users_fallback_when_missing_row(
    db_session: AsyncSession, _seed_catalog
):
    """loadout row가 비어있는 user는 카테고리별 default code로 fallback."""
    user = await _make_user(db_session, "h1")
    await cosmetics_service.grant_defaults(db_session, user.id)
    # 일부 슬롯 삭제로 부분 누락 시뮬레이션
    await db_session.execute(
        UserCosmeticLoadout.__table__.delete().where(
            (UserCosmeticLoadout.user_id == user.id)
            & (UserCosmeticLoadout.category == "title")
        )
    )
    await db_session.flush()

    result = await cosmetics_service.get_loadouts_for_users(db_session, [user.id])
    assert result[user.id]["title"] == "title.beginner"  # default fallback


@pytest.mark.asyncio
async def test_get_loadouts_for_users_single_query(
    db_session: AsyncSession, _seed_catalog
):
    """N+1 회귀 방지: get_loadouts_for_users 호출 중 SELECT 2회 이하."""
    from sqlalchemy import event

    u1 = await _make_user(db_session, "q1")
    u2 = await _make_user(db_session, "q2")
    u3 = await _make_user(db_session, "q3")
    for u in (u1, u2, u3):
        await cosmetics_service.grant_defaults(db_session, u.id)
    await db_session.flush()

    select_count = 0
    bind = db_session.get_bind()

    def _counter(conn, cursor, statement, parameters, context, executemany):
        nonlocal select_count
        if statement.lstrip().upper().startswith("SELECT"):
            select_count += 1

    sync_engine = getattr(bind, "sync_engine", bind)
    event.listen(sync_engine, "before_cursor_execute", _counter)
    try:
        await cosmetics_service.get_loadouts_for_users(
            db_session, [u1.id, u2.id, u3.id]
        )
    finally:
        event.remove(sync_engine, "before_cursor_execute", _counter)

    assert select_count <= 2, f"expected ≤2 SELECTs, got {select_count}"
