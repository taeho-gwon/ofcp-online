import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.cosmetics import repository as repo


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
