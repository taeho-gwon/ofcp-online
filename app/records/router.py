import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.core.db import get_session
from app.records import repository as repo
from app.records.schemas import (
    GameDetailResponse,
    GameEventOut,
    GameEventsResponse,
    GameListItem,
    GameListResponse,
    GamePlayerOut,
)
from app.users.models import User

router = APIRouter(prefix="/records", tags=["records"])


@router.get("/users/me/games", response_model=GameListResponse)
async def my_games(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> GameListResponse:
    return await _list_games(session, user.id, limit=limit, offset=offset)


@router.get("/users/{user_id}/games", response_model=GameListResponse)
async def user_games(
    user_id: uuid.UUID,
    _user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> GameListResponse:
    return await _list_games(session, user_id, limit=limit, offset=offset)


@router.get("/games/{game_id}", response_model=GameDetailResponse)
async def game_detail(
    game_id: str,
    _user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GameDetailResponse:
    game = await repo.get_game(session, game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="게임을 찾을 수 없습니다.")
    players = await repo.list_players(session, game_id)
    nicks = await _nicknames(session, [p.user_id for p in players])
    return GameDetailResponse(
        game_id=game.id,
        room_code=game.room_code,
        ruleset=game.ruleset,
        started_at=game.started_at,
        ended_at=game.ended_at,
        round_count=game.round_count,
        players=[
            GamePlayerOut(
                user_id=p.user_id,
                nickname=nicks.get(p.user_id, ""),
                seat_idx=p.seat_idx,
                final_score=p.final_score,
                fouled_rounds=p.fouled_rounds,
                fantasy_rounds=p.fantasy_rounds,
            )
            for p in players
        ],
    )


@router.get("/games/{game_id}/events", response_model=GameEventsResponse)
async def game_events(
    game_id: str,
    _user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GameEventsResponse:
    if await repo.get_game(session, game_id) is None:
        raise HTTPException(status_code=404, detail="게임을 찾을 수 없습니다.")
    events = await repo.list_events(session, game_id)
    return GameEventsResponse(
        game_id=game_id,
        events=[
            GameEventOut(
                seq=e.seq,
                ts=e.ts,
                event_type=e.event_type,
                actor_id=e.actor_id,
                payload=e.payload,
            )
            for e in events
        ],
    )


async def _list_games(
    session: AsyncSession, user_id: uuid.UUID, *, limit: int, offset: int
) -> GameListResponse:
    games = await repo.list_games_for_user(session, user_id, limit=limit, offset=offset)
    return GameListResponse(
        entries=[
            GameListItem(
                game_id=g.id,
                room_code=g.room_code,
                ruleset=g.ruleset,
                started_at=g.started_at,
                ended_at=g.ended_at,
                round_count=g.round_count,
            )
            for g in games
        ],
        limit=limit,
        offset=offset,
    )


async def _nicknames(
    session: AsyncSession, user_ids: list[uuid.UUID]
) -> dict[uuid.UUID, str]:
    if not user_ids:
        return {}
    stmt = select(User.id, User.nickname).where(User.id.in_(user_ids))
    rows = (await session.execute(stmt)).all()
    return {uid: nick for uid, nick in rows}
