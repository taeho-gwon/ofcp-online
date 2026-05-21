import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.core.db import get_session
from app.cosmetics import repository as repo
from app.cosmetics import service
from app.cosmetics.schemas import (
    CosmeticOut,
    LoadoutOut,
    LoadoutUpdateIn,
    MyCosmeticsOut,
)
from app.users.models import User

router = APIRouter(tags=["cosmetics"])


@router.get("/cosmetics/catalog", response_model=list[CosmeticOut])
async def get_catalog(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[CosmeticOut]:
    items = await repo.list_all_cosmetics(session)
    return [CosmeticOut.model_validate(c) for c in items]


@router.get("/me/cosmetics", response_model=MyCosmeticsOut)
async def get_my_cosmetics(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MyCosmeticsOut:
    owned = await repo.list_inventory_for_user(session, user.id)
    loadout_map = await repo.get_loadout_for_user(session, user.id)

    # 부분 누락 시 default로 fallback (이론적으로 없지만 안전망)
    if set(loadout_map.keys()) != {"card_back", "card_face", "table_theme", "title"}:
        all_cos = await repo.list_all_cosmetics(session)
        defaults_id: dict[str, uuid.UUID] = {
            c.category: c.id for c in all_cos if c.is_default
        }
        for cat, cid in defaults_id.items():
            loadout_map.setdefault(cat, cid)

    return MyCosmeticsOut(
        owned=owned,
        loadout=LoadoutOut(**loadout_map),
    )


@router.put("/me/cosmetics/loadout", response_model=LoadoutOut)
async def put_loadout(
    payload: LoadoutUpdateIn,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LoadoutOut:
    try:
        result = await service.update_loadout(session, user.id, payload)
    except service.LoadoutValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    await session.commit()
    return result
