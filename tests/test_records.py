import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.game.card import Card, Rank, Suit
from app.game.state import GameState, Phase, PlayerState
from app.records import repository as records_repo
from app.records import service as records_service
from app.records.models import GamePlayer
from app.users.models import User


@pytest_asyncio.fixture
async def two_users(db_session: AsyncSession) -> tuple[User, User]:
    u1 = User(google_sub="g-1", email="a@example.com", nickname="alice")
    u2 = User(google_sub="g-2", email="b@example.com", nickname="bob")
    db_session.add_all([u1, u2])
    await db_session.commit()
    return u1, u2


def _state(u1_id: uuid.UUID, u2_id: uuid.UUID, game_id: str) -> GameState:
    return GameState(
        game_id=game_id,
        players=[
            PlayerState(player_id=str(u1_id)),
            PlayerState(player_id=str(u2_id)),
        ],
        ruleset_name="pineapple",
    )


def _c(r: int, s: int) -> Card:
    return Card(Rank(r), Suit(s))


async def test_start_game_creates_game_and_players(
    db_session: AsyncSession, two_users: tuple[User, User]
):
    u1, u2 = two_users
    state = _state(u1.id, u2.id, "abc123def456")
    await records_service.start_game(db_session, state=state, room_code="ROOM01")
    await db_session.commit()

    game = await records_repo.get_game(db_session, "abc123def456")
    assert game is not None
    assert game.ruleset == "pineapple"
    assert game.room_code == "ROOM01"
    assert game.round_count == 0
    assert game.ended_at is None

    rows = (
        (
            await db_session.execute(
                select(GamePlayer)
                .where(GamePlayer.game_id == "abc123def456")
                .order_by(GamePlayer.seat_idx)
            )
        )
        .scalars()
        .all()
    )
    assert [r.user_id for r in rows] == [u1.id, u2.id]
    assert [r.seat_idx for r in rows] == [0, 1]
    assert all(r.final_score is None for r in rows)


async def test_start_game_rejects_non_uuid_player(
    db_session: AsyncSession, two_users: tuple[User, User]
):
    u1, _ = two_users
    bad_state = GameState(
        game_id="g0",
        players=[
            PlayerState(player_id=str(u1.id)),
            PlayerState(player_id="not-a-uuid"),
        ],
        ruleset_name="pineapple",
    )
    with pytest.raises(ValueError):
        await records_service.start_game(db_session, state=bad_state, room_code=None)


async def test_append_action_event_assigns_sequential_seq(
    db_session: AsyncSession, two_users: tuple[User, User]
):
    u1, u2 = two_users
    state = _state(u1.id, u2.id, "g1")
    await records_service.start_game(db_session, state=state, room_code=None)

    await records_service.append_action_event(
        db_session,
        game_id="g1",
        actor_id=str(u1.id),
        action="first_turn",
        hand_before=[{"rank": 14, "suit": 1}],
        payload_extra={"placements": {"top": []}},
    )
    await records_service.append_action_event(
        db_session,
        game_id="g1",
        actor_id=str(u2.id),
        action="normal_turn",
        hand_before=[{"rank": 2, "suit": 2}],
        payload_extra={"placements": {"top": []}, "discard": {"rank": 3, "suit": 3}},
    )
    await db_session.commit()

    evs = await records_repo.list_events(db_session, "g1")
    assert [e.seq for e in evs] == [1, 2]
    assert [e.event_type for e in evs] == ["first_turn", "normal_turn"]
    assert evs[0].actor_id == u1.id
    assert evs[1].actor_id == u2.id
    assert evs[0].payload["hand"] == [{"rank": 14, "suit": 1}]


async def test_append_round_end_updates_counts_and_flags(
    db_session: AsyncSession, two_users: tuple[User, User]
):
    u1, u2 = two_users
    state = _state(u1.id, u2.id, "g2")
    state.phase = Phase.DONE
    # u1: 정상 — high/flush/straight-flush (강도 오름차순)
    state.players[0].board.top = [_c(2, 1), _c(3, 1), _c(4, 1)]
    state.players[0].board.middle = [_c(5, 1), _c(6, 1), _c(7, 1), _c(8, 1), _c(10, 1)]
    state.players[0].board.bottom = [_c(5, 2), _c(6, 2), _c(7, 2), _c(8, 2), _c(9, 2)]
    state.players[0].is_fantasy = True
    # u2: foul — top(AA) > middle(high)
    state.players[1].board.top = [_c(14, 3), _c(14, 4), _c(2, 3)]
    state.players[1].board.middle = [_c(3, 3), _c(4, 3), _c(5, 3), _c(6, 4), _c(8, 4)]
    state.players[1].board.bottom = [
        _c(9, 3),
        _c(10, 3),
        _c(11, 3),
        _c(12, 4),
        _c(13, 4),
    ]
    assert state.players[1].board.is_foul

    await records_service.start_game(db_session, state=state, room_code=None)
    await records_service.append_round_end(db_session, state=state)
    await db_session.commit()

    game = await records_repo.get_game(db_session, "g2")
    assert game.round_count == 1

    evs = await records_repo.list_events(db_session, "g2")
    assert len(evs) == 1
    assert evs[0].event_type == "round_end"
    payload = evs[0].payload
    assert payload["round_number"] == 1
    assert payload["is_bonus_round"] is False
    assert set(payload["boards"]) == {str(u1.id), str(u2.id)}
    # u1이 foul인 u2를 상대로 자동 sweep + u1 royalty(flush 8 + straight_flush 15 = 23)
    # total = 라인3 + scoop3 + royalty_diff23 = 29
    assert payload["deltas"][str(u1.id)] == 29
    assert payload["deltas"][str(u2.id)] == -29

    rows = (
        (
            await db_session.execute(
                select(GamePlayer)
                .where(GamePlayer.game_id == "g2")
                .order_by(GamePlayer.seat_idx)
            )
        )
        .scalars()
        .all()
    )
    assert rows[0].fantasy_rounds == 1
    assert rows[0].fouled_rounds == 0
    assert rows[1].fantasy_rounds == 0
    assert rows[1].fouled_rounds == 1


async def test_append_game_end_sets_final_scores_and_ended_at(
    db_session: AsyncSession, two_users: tuple[User, User]
):
    u1, u2 = two_users
    state = _state(u1.id, u2.id, "g3")
    state.players[0].score = 120
    state.players[1].score = 80

    await records_service.start_game(db_session, state=state, room_code=None)
    await records_service.append_game_end(db_session, state=state)
    await db_session.commit()

    game = await records_repo.get_game(db_session, "g3")
    assert game.ended_at is not None

    rows = (
        (
            await db_session.execute(
                select(GamePlayer)
                .where(GamePlayer.game_id == "g3")
                .order_by(GamePlayer.seat_idx)
            )
        )
        .scalars()
        .all()
    )
    assert rows[0].final_score == 120
    assert rows[1].final_score == 80

    evs = await records_repo.list_events(db_session, "g3")
    assert [e.event_type for e in evs] == ["game_end"]
    assert evs[0].payload["final_scores"][str(u1.id)] == 120
    assert evs[0].payload["final_scores"][str(u2.id)] == 80


async def test_events_seq_is_per_game(
    db_session: AsyncSession, two_users: tuple[User, User]
):
    u1, u2 = two_users
    s1 = _state(u1.id, u2.id, "ga")
    s2 = _state(u1.id, u2.id, "gb")
    await records_service.start_game(db_session, state=s1, room_code=None)
    await records_service.start_game(db_session, state=s2, room_code=None)
    await records_service.append_action_event(
        db_session,
        game_id="ga",
        actor_id=str(u1.id),
        action="first_turn",
        hand_before=[],
        payload_extra={},
    )
    await records_service.append_action_event(
        db_session,
        game_id="gb",
        actor_id=str(u2.id),
        action="first_turn",
        hand_before=[],
        payload_extra={},
    )
    await db_session.commit()

    a_seqs = [e.seq for e in await records_repo.list_events(db_session, "ga")]
    b_seqs = [e.seq for e in await records_repo.list_events(db_session, "gb")]
    assert a_seqs == [1]
    assert b_seqs == [1]
