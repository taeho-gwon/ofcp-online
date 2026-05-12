from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.core.db import get_session
from app.users import service
from app.users.models import User
from app.users.schemas import NicknameAvailability, NicknameUpdate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me/nickname", response_model=UserOut)
async def change_nickname(
    payload: NicknameUpdate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserOut:
    try:
        user = await service.change_nickname(session, user, payload.nickname)
    except service.NicknameError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    await session.commit()
    return UserOut.model_validate(user)


@router.get("/check-nickname", response_model=NicknameAvailability)
async def check_nickname(
    nickname: Annotated[str, Query(min_length=2, max_length=16)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> NicknameAvailability:
    try:
        service.validate_nickname_format(nickname)
    except service.NicknameError:
        return NicknameAvailability(available=False)
    available = await service.is_nickname_available(session, nickname)
    return NicknameAvailability(available=available)
