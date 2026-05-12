import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.records.models import Game, GameEvent, GamePlayer


async def get_game(session: AsyncSession, game_id: str) -> Game | None:
    return await session.get(Game, game_id)


async def create_game(
    session: AsyncSession,
    *,
    game_id: str,
    ruleset: str,
    started_at: datetime,
    room_code: str | None,
) -> Game:
    game = Game(
        id=game_id,
        room_code=room_code,
        ruleset=ruleset,
        started_at=started_at,
        round_count=0,
    )
    session.add(game)
    await session.flush()
    return game


async def add_players(
    session: AsyncSession,
    *,
    game_id: str,
    seats: list[tuple[int, uuid.UUID]],
) -> None:
    for seat_idx, user_id in seats:
        session.add(
            GamePlayer(
                game_id=game_id,
                user_id=user_id,
                seat_idx=seat_idx,
                fouled_rounds=0,
                fantasy_rounds=0,
            )
        )
    await session.flush()


async def next_seq(session: AsyncSession, game_id: str) -> int:
    stmt = select(func.coalesce(func.max(GameEvent.seq), 0)).where(
        GameEvent.game_id == game_id
    )
    current = (await session.execute(stmt)).scalar_one()
    return int(current) + 1


async def append_event(
    session: AsyncSession,
    *,
    game_id: str,
    seq: int,
    ts: datetime,
    event_type: str,
    actor_id: uuid.UUID | None,
    payload: dict[str, Any],
) -> GameEvent:
    event = GameEvent(
        game_id=game_id,
        seq=seq,
        ts=ts,
        event_type=event_type,
        actor_id=actor_id,
        payload=payload,
    )
    session.add(event)
    await session.flush()
    return event


async def list_events(session: AsyncSession, game_id: str) -> list[GameEvent]:
    stmt = select(GameEvent).where(GameEvent.game_id == game_id).order_by(GameEvent.seq)
    return list((await session.execute(stmt)).scalars().all())


async def list_games_for_user(
    session: AsyncSession,
    user_id: uuid.UUID,
    *,
    limit: int,
    offset: int,
) -> list[Game]:
    stmt = (
        select(Game)
        .join(GamePlayer, GamePlayer.game_id == Game.id)
        .where(GamePlayer.user_id == user_id)
        .order_by(Game.started_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list((await session.execute(stmt)).scalars().all())


async def list_players(session: AsyncSession, game_id: str) -> list[GamePlayer]:
    stmt = (
        select(GamePlayer)
        .where(GamePlayer.game_id == game_id)
        .order_by(GamePlayer.seat_idx)
    )
    return list((await session.execute(stmt)).scalars().all())


async def increment_round_count(session: AsyncSession, game_id: str) -> None:
    await session.execute(
        update(Game).where(Game.id == game_id).values(round_count=Game.round_count + 1)
    )


async def bump_player_round_flags(
    session: AsyncSession,
    *,
    game_id: str,
    user_id: uuid.UUID,
    fouled: bool,
    fantasy: bool,
) -> None:
    if not fouled and not fantasy:
        return
    values: dict[str, Any] = {}
    if fouled:
        values["fouled_rounds"] = GamePlayer.fouled_rounds + 1
    if fantasy:
        values["fantasy_rounds"] = GamePlayer.fantasy_rounds + 1
    await session.execute(
        update(GamePlayer)
        .where(GamePlayer.game_id == game_id, GamePlayer.user_id == user_id)
        .values(**values)
    )


async def finish_game(
    session: AsyncSession,
    *,
    game_id: str,
    ended_at: datetime,
    final_scores: dict[uuid.UUID, int],
) -> None:
    await session.execute(
        update(Game).where(Game.id == game_id).values(ended_at=ended_at)
    )
    for user_id, score in final_scores.items():
        await session.execute(
            update(GamePlayer)
            .where(GamePlayer.game_id == game_id, GamePlayer.user_id == user_id)
            .values(final_score=score)
        )
