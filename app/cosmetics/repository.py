import uuid
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.cosmetics.models import Cosmetic, UserCosmeticInventory, UserCosmeticLoadout


async def list_all_cosmetics(session: AsyncSession) -> list[Cosmetic]:
    stmt = select(Cosmetic).order_by(Cosmetic.category, Cosmetic.sort_order)
    return list((await session.execute(stmt)).scalars().all())


async def get_cosmetics_by_ids(
    session: AsyncSession, ids: Iterable[uuid.UUID]
) -> list[Cosmetic]:
    ids = list(ids)
    if not ids:
        return []
    stmt = select(Cosmetic).where(Cosmetic.id.in_(ids))
    return list((await session.execute(stmt)).scalars().all())


async def list_inventory_for_user(
    session: AsyncSession, user_id: uuid.UUID
) -> list[uuid.UUID]:
    stmt = select(UserCosmeticInventory.cosmetic_id).where(
        UserCosmeticInventory.user_id == user_id
    )
    return list((await session.execute(stmt)).scalars().all())


async def get_loadout_for_user(
    session: AsyncSession, user_id: uuid.UUID
) -> dict[str, uuid.UUID]:
    stmt = select(UserCosmeticLoadout.category, UserCosmeticLoadout.cosmetic_id).where(
        UserCosmeticLoadout.user_id == user_id
    )
    return {cat: cid for cat, cid in (await session.execute(stmt)).all()}


async def insert_inventory_ignore_conflict(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    cosmetic_ids: Iterable[uuid.UUID],
    source: str = "grant",
) -> None:
    rows = [
        {"user_id": user_id, "cosmetic_id": cid, "source": source}
        for cid in cosmetic_ids
    ]
    if not rows:
        return
    stmt = (
        pg_insert(UserCosmeticInventory)
        .values(rows)
        .on_conflict_do_nothing(
            index_elements=[
                UserCosmeticInventory.user_id,
                UserCosmeticInventory.cosmetic_id,
            ]
        )
    )
    await session.execute(stmt)


async def insert_loadout_ignore_conflict(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    items: dict[str, uuid.UUID],
) -> None:
    rows = [
        {"user_id": user_id, "category": cat, "cosmetic_id": cid}
        for cat, cid in items.items()
    ]
    if not rows:
        return
    stmt = (
        pg_insert(UserCosmeticLoadout)
        .values(rows)
        .on_conflict_do_nothing(
            index_elements=[
                UserCosmeticLoadout.user_id,
                UserCosmeticLoadout.category,
            ]
        )
    )
    await session.execute(stmt)


async def upsert_loadout(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    items: dict[str, uuid.UUID],
) -> None:
    rows = [
        {"user_id": user_id, "category": cat, "cosmetic_id": cid}
        for cat, cid in items.items()
    ]
    stmt = pg_insert(UserCosmeticLoadout).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=[
            UserCosmeticLoadout.user_id,
            UserCosmeticLoadout.category,
        ],
        set_={"cosmetic_id": stmt.excluded.cosmetic_id},
    )
    await session.execute(stmt)


async def get_loadouts_with_codes(
    session: AsyncSession, user_ids: Iterable[uuid.UUID]
) -> list[tuple[uuid.UUID, str, str]]:
    """user_id, category, code 튜플 list — 단일 쿼리.

    Loadout row가 없는 user는 비어있어 fallback을 호출자가 처리.
    """
    user_ids = list(user_ids)
    if not user_ids:
        return []
    stmt = (
        select(
            UserCosmeticLoadout.user_id,
            UserCosmeticLoadout.category,
            Cosmetic.code,
        )
        .join(Cosmetic, Cosmetic.id == UserCosmeticLoadout.cosmetic_id)
        .where(UserCosmeticLoadout.user_id.in_(user_ids))
    )
    return list((await session.execute(stmt)).all())


async def get_default_codes_by_category(session: AsyncSession) -> dict[str, str]:
    """category별 default cosmetic의 code — fallback용."""
    stmt = select(Cosmetic.category, Cosmetic.code).where(Cosmetic.is_default.is_(True))
    return {cat: code for cat, code in (await session.execute(stmt)).all()}
