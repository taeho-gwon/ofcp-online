import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.game.rules import PINEAPPLE_OFC, RULESETS
from app.game.scoring import head_to_head_detail
from app.game.state import GameState
from app.records import repository as repo


def _now() -> datetime:
    return datetime.now(UTC)


def _to_uuid(actor: str | None) -> uuid.UUID | None:
    if actor is None:
        return None
    try:
        return uuid.UUID(actor)
    except ValueError:
        return None


def _round_deltas(state: GameState) -> dict[str, int]:
    rules = RULESETS.get(state.ruleset_name, PINEAPPLE_OFC)
    deltas: dict[str, int] = {p.player_id: 0 for p in state.players}
    n = len(state.players)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = state.players[i], state.players[j]
            d = head_to_head_detail(a.board, b.board, rules)
            deltas[a.player_id] += d.total
            deltas[b.player_id] -= d.total
    return deltas


async def start_game(
    session: AsyncSession,
    *,
    state: GameState,
    room_code: str | None,
) -> None:
    """게임 생성 직후 호출. games + game_players 행 추가."""
    await repo.create_game(
        session,
        game_id=state.game_id,
        ruleset=state.ruleset_name,
        started_at=_now(),
        room_code=room_code,
    )
    seats: list[tuple[int, uuid.UUID]] = []
    for i, p in enumerate(state.players):
        uid = _to_uuid(p.player_id)
        if uid is None:
            raise ValueError(f"player_id is not UUID: {p.player_id}")
        seats.append((i, uid))
    await repo.add_players(session, game_id=state.game_id, seats=seats)


async def append_action_event(
    session: AsyncSession,
    *,
    game_id: str,
    actor_id: str,
    action: str,
    hand_before: list[dict[str, int]],
    payload_extra: dict[str, Any],
) -> None:
    """플레이어 액션 이벤트(first_turn/normal_turn/fantasy_turn) append."""
    seq = await repo.next_seq(session, game_id)
    payload: dict[str, Any] = {"hand": hand_before, **payload_extra}
    await repo.append_event(
        session,
        game_id=game_id,
        seq=seq,
        ts=_now(),
        event_type=action,
        actor_id=_to_uuid(actor_id),
        payload=payload,
    )


async def append_round_end(
    session: AsyncSession,
    *,
    state: GameState,
) -> None:
    """라운드 채점 직후 호출. round_end 이벤트 + round_count·player 통계 갱신."""
    seq = await repo.next_seq(session, state.game_id)
    deltas = _round_deltas(state)
    boards = {
        p.player_id: {**p.board.to_dict(), "is_foul": p.board.is_foul}
        for p in state.players
    }
    scores = {p.player_id: p.score for p in state.players}
    next_fl = {p.player_id: p.next_fantasy_cards for p in state.players}
    payload = {
        "round_number": state.round_number,
        "is_bonus_round": state.is_bonus_round,
        "boards": boards,
        "scores": scores,
        "deltas": deltas,
        "next_fantasy_cards": next_fl,
    }
    await repo.append_event(
        session,
        game_id=state.game_id,
        seq=seq,
        ts=_now(),
        event_type="round_end",
        actor_id=None,
        payload=payload,
    )
    await repo.increment_round_count(session, state.game_id)
    for p in state.players:
        uid = _to_uuid(p.player_id)
        if uid is None:
            continue
        await repo.bump_player_round_flags(
            session,
            game_id=state.game_id,
            user_id=uid,
            fouled=p.board.is_foul,
            fantasy=p.is_fantasy,
        )


async def append_game_end(
    session: AsyncSession,
    *,
    state: GameState,
) -> None:
    """매치 종료(GAME_OVER) 시 호출. game_end 이벤트 + ended_at·final_score 기록."""
    seq = await repo.next_seq(session, state.game_id)
    final_scores = {p.player_id: p.score for p in state.players}
    await repo.append_event(
        session,
        game_id=state.game_id,
        seq=seq,
        ts=_now(),
        event_type="game_end",
        actor_id=None,
        payload={"final_scores": final_scores},
    )
    by_uuid: dict[uuid.UUID, int] = {}
    for p in state.players:
        uid = _to_uuid(p.player_id)
        if uid is not None:
            by_uuid[uid] = p.score
    await repo.finish_game(
        session,
        game_id=state.game_id,
        ended_at=_now(),
        final_scores=by_uuid,
    )
