import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.cosmetics import repository as repo
from app.cosmetics.schemas import LoadoutOut, LoadoutUpdateIn

ALL_CATEGORIES = ("card_back", "card_face", "table_theme", "title")


class LoadoutValidationError(ValueError):
    """장착 검증 실패."""


async def grant_defaults(session: AsyncSession, user_id: uuid.UUID) -> None:
    """모든 카탈로그를 inventory에 ON CONFLICT DO NOTHING 부여 +
    category별 default를 loadout에 ON CONFLICT DO NOTHING 부여 (idempotent)."""
    cosmetics = await repo.list_all_cosmetics(session)
    await repo.insert_inventory_ignore_conflict(
        session,
        user_id=user_id,
        cosmetic_ids=[c.id for c in cosmetics],
    )
    defaults: dict[str, uuid.UUID] = {
        c.category: c.id for c in cosmetics if c.is_default
    }
    await repo.insert_loadout_ignore_conflict(session, user_id=user_id, items=defaults)


async def update_loadout(
    session: AsyncSession,
    user_id: uuid.UUID,
    payload: LoadoutUpdateIn,
) -> LoadoutOut:
    """4 슬롯 묶음 갱신.
    1) 4 cosmetic_id를 한 쿼리로 fetch
    2) 모두 존재 확인
    3) category 일치 검증
    4) 모두 user inventory에 있는지 검증
    5) UPSERT 4 row
    실패 시 LoadoutValidationError.
    """
    requested: dict[str, uuid.UUID] = {
        "card_back": payload.card_back,
        "card_face": payload.card_face,
        "table_theme": payload.table_theme,
        "title": payload.title,
    }

    cosmetics = await repo.get_cosmetics_by_ids(session, requested.values())
    by_id = {c.id: c for c in cosmetics}

    for cat, cid in requested.items():
        c = by_id.get(cid)
        if c is None:
            raise LoadoutValidationError(f"cosmetic 없음: {cid}")
        if c.category != cat:
            raise LoadoutValidationError(f"슬롯 {cat}에 {c.category} 아이템 장착 불가")

    inventory = set(await repo.list_inventory_for_user(session, user_id))
    for cat, cid in requested.items():
        if cid not in inventory:
            raise LoadoutValidationError(f"소유하지 않은 아이템: {cid}")

    await repo.upsert_loadout(session, user_id=user_id, items=requested)
    return LoadoutOut(**requested)


async def get_loadouts_for_users(
    session: AsyncSession,
    user_ids: list[uuid.UUID],
) -> dict[uuid.UUID, dict[str, str]]:
    """게임 시작 시 N+1 없이 user별 loadout(code 문자열)을 가져온다.

    누락된 (user, category)는 카테고리별 default cosmetic의 code로 fallback.
    """
    if not user_ids:
        return {}

    rows = await repo.get_loadouts_with_codes(session, user_ids)
    defaults = await repo.get_default_codes_by_category(session)

    result: dict[uuid.UUID, dict[str, str]] = {uid: dict(defaults) for uid in user_ids}
    for uid, cat, code in rows:
        result[uid][cat] = code
    return result
