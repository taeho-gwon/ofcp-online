import fakeredis.aioredis
import pytest

from app.game.repository import GameRepository
from app.game.service import GameNotFoundError, GameService, WrongPlayerError
from app.game.state import Phase


@pytest.fixture
def svc() -> GameService:
    redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    return GameService(GameRepository(redis))


async def test_create_game_persists_state(svc: GameService):
    state = await svc.create_game(["p0", "p1"], dealer_idx=0)
    assert state.phase == Phase.FIRST_TURN
    loaded = await svc.get_state(state.game_id)
    assert loaded.game_id == state.game_id
    assert [p.player_id for p in loaded.players] == ["p0", "p1"]


async def test_get_state_missing_raises(svc: GameService):
    with pytest.raises(GameNotFoundError):
        await svc.get_state("nope")


async def test_wrong_player_rejected(svc: GameService):
    state = await svc.create_game(["p0", "p1"], dealer_idx=0)
    # current_player는 p1 (dealer 다음). p0이 시도하면 거부.
    other_player = state.players[(state.current_player_idx + 1) % 2].player_id
    hand = state.current_player.hand
    with pytest.raises(WrongPlayerError):
        await svc.place_first_turn(
            state.game_id,
            other_player,
            {"top": hand[:2], "middle": hand[2:5]},
        )


async def test_place_first_turn_advances_state(svc: GameService):
    state = await svc.create_game(["p0", "p1"], dealer_idx=0)
    cur = state.current_player
    hand = cur.hand
    new_state = await svc.place_first_turn(
        state.game_id,
        cur.player_id,
        {"top": hand[:2], "middle": hand[2:5]},
    )
    # 상대 차례로 넘어가야 함
    assert new_state.current_player.player_id != cur.player_id
    # 영속화 확인
    loaded = await svc.get_state(state.game_id)
    assert loaded.current_player.player_id == new_state.current_player.player_id


async def test_engine_validation_error_propagates(svc: GameService):
    state = await svc.create_game(["p0", "p1"], dealer_idx=0)
    cur = state.current_player
    hand = cur.hand
    # top은 3장 제한인데 5장 배치 시도 → board.place가 ValueError
    with pytest.raises(ValueError):
        await svc.place_first_turn(
            state.game_id,
            cur.player_id,
            {"top": hand[:5]},
        )


async def test_advance_round_missing_game_raises(svc: GameService):
    with pytest.raises(GameNotFoundError):
        await svc.advance_round("nope")


async def test_advance_round_wrong_phase_raises(svc: GameService):
    state = await svc.create_game(["p0", "p1"], dealer_idx=0)
    # FIRST_TURN에서는 advance 불가
    with pytest.raises(ValueError):
        await svc.advance_round(state.game_id)


async def test_advance_round_increments_round_number(svc: GameService):
    state = await svc.create_game(["p0", "p1"], dealer_idx=0)
    # 라운드 채점이 끝난 상태로 직접 조작 후 영속화
    state.phase = Phase.DONE
    state.round_number = 3
    for p in state.players:
        p.next_fantasy_cards = None  # 보너스 아님
    await svc._repo.save(state)

    new_state = await svc.advance_round(state.game_id)
    assert new_state.round_number == 4
    assert new_state.is_bonus_round is False
    assert new_state.phase == Phase.FIRST_TURN
