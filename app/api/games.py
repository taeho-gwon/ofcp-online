import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.config import settings
from app.core.db import get_session
from app.core.redis import get_redis
from app.game.repository import GameRepository
from app.game.schemas import GameStateResponse, serialize_state
from app.game.service import GameNotFoundError, GameService
from app.game.state import GameState
from app.users.models import User

router = APIRouter(prefix="/games", tags=["games"])


def get_game_service(redis: Annotated[Redis, Depends(get_redis)]) -> GameService:
    return GameService(GameRepository(redis, ttl_seconds=settings.game_ttl_seconds))


ServiceDep = Annotated[GameService, Depends(get_game_service)]


async def load_display_names(session: AsyncSession, state: GameState) -> dict[str, str]:
    """player_id(=user_id 문자열) → nickname. 매핑 실패 시 player_id 그대로 사용."""
    ids: list[uuid.UUID] = []
    for p in state.players:
        try:
            ids.append(uuid.UUID(p.player_id))
        except ValueError:
            continue
    if not ids:
        return {}
    stmt = select(User.id, User.nickname).where(User.id.in_(ids))
    rows = (await session.execute(stmt)).all()
    return {str(uid): nick for uid, nick in rows}


def _ensure_player(state: GameState, user_id: uuid.UUID) -> None:
    if not any(p.player_id == str(user_id) for p in state.players):
        raise HTTPException(status_code=403, detail="게임 참가자가 아닙니다.")


@router.get("/{game_id}", response_model=GameStateResponse)
async def get_game(
    game_id: str,
    svc: ServiceDep,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GameStateResponse:
    try:
        state = await svc.get_state(game_id)
    except GameNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Game {e} not found") from e
    _ensure_player(state, user.id)
    names = await load_display_names(session, state)
    return serialize_state(state, viewer_id=str(user.id), display_names=names)


@router.post("/{game_id}/advance", response_model=GameStateResponse)
async def advance_round(
    game_id: str,
    svc: ServiceDep,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GameStateResponse:
    try:
        state = await svc.advance_round(game_id)
    except GameNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Game {e} not found") from e
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    _ensure_player(state, user.id)
    names = await load_display_names(session, state)
    return serialize_state(state, viewer_id=str(user.id), display_names=names)
