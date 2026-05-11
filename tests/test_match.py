"""매치(여러 라운드) 단위 로직: 라운드 전환, 보너스 라운드 카운트, 종료 조건."""

from dataclasses import replace

import pytest

from app.game.board import PlayerBoard
from app.game.card import Card, Rank, Suit
from app.game.engine import (
    _finalize,
    create_game,
    start_next_round,
)
from app.game.rules import PINEAPPLE_OFC
from app.game.state import GameState, Phase, PlayerState


def card(rank: int, suit: int) -> Card:
    return Card(Rank(rank), Suit(suit))


def valid_board_qq_top() -> tuple[list[Card], list[Card], list[Card]]:
    """QQ / KK pair / AA pair — FL 14장 신규 진입 자격, foul 아님."""
    top = [card(12, 1), card(12, 2), card(2, 3)]
    middle = [card(13, 1), card(13, 2), card(3, 3), card(4, 1), card(5, 2)]
    bottom = [card(14, 1), card(14, 2), card(6, 3), card(7, 1), card(8, 2)]
    return top, middle, bottom


def valid_board_trips_top_quads_bottom() -> tuple[list[Card], list[Card], list[Card]]:
    """777 trips / 99922 full house / TTTT3 quads — FL 연속 진입 자격."""
    top = [card(7, 1), card(7, 2), card(7, 3)]
    middle = [card(9, 1), card(9, 2), card(9, 3), card(2, 1), card(2, 2)]
    bottom = [card(10, 1), card(10, 2), card(10, 3), card(10, 4), card(3, 1)]
    return top, middle, bottom


def attach_board(player: PlayerState, top, middle, bottom) -> None:
    player.board = PlayerBoard()
    player.board.top = list(top)
    player.board.middle = list(middle)
    player.board.bottom = list(bottom)


class TestStartingScore:
    def test_default_starting_score(self):
        state = create_game("g", ["p0", "p1"])
        assert all(p.score == PINEAPPLE_OFC.starting_score for p in state.players)
        assert state.round_number == 1
        assert state.is_bonus_round is False

    def test_custom_starting_score(self):
        rules = replace(PINEAPPLE_OFC, starting_score=50)
        state = create_game("g", ["p0", "p1"], rules=rules)
        assert all(p.score == 50 for p in state.players)


class TestEliminationEndsMatch:
    def test_score_below_threshold_ends_match(self):
        state = create_game("g", ["p0", "p1"])
        for p in state.players:
            attach_board(p, *valid_board_qq_top())
        # 동일 보드라 델타는 0. p1.score=0이면 채점 후에도 0 → eliminate_at 트리거.
        state.players[1].score = 0

        _finalize(state, PINEAPPLE_OFC)

        assert state.phase == Phase.GAME_OVER

    def test_survivor_continues(self):
        state = create_game("g", ["p0", "p1"])
        for p in state.players:
            attach_board(p, *valid_board_qq_top())
        # 둘 다 충분한 점수 → DONE
        _finalize(state, PINEAPPLE_OFC)
        assert state.phase == Phase.DONE


class TestMaxRoundsEndsMatch:
    def test_last_normal_round_finalize_goes_to_game_over(self):
        rules = replace(PINEAPPLE_OFC, max_rounds=3)
        state = create_game("g", ["p0", "p1"], rules=rules)
        state.round_number = rules.max_rounds  # 마지막 일반 라운드 시뮬레이션
        state.is_bonus_round = False
        for p in state.players:
            attach_board(p, *valid_board_qq_top())

        _finalize(state, rules)

        assert state.phase == Phase.GAME_OVER

    def test_bonus_round_at_max_does_not_end(self):
        """보너스 라운드는 max_rounds 도달 판정에서 제외된다.

        1단계 규칙상 12R(일반) 완료 시점에 이미 GAME_OVER이므로, max_rounds 이전 일반
        라운드 후 보너스 라운드가 채점돼도 GAME_OVER가 되지 않음을 확인한다.
        """
        rules = replace(PINEAPPLE_OFC, max_rounds=3)
        state = create_game("g", ["p0", "p1"], rules=rules)
        state.round_number = 1
        state.is_bonus_round = True
        for p in state.players:
            attach_board(p, *valid_board_qq_top())

        _finalize(state, rules)

        assert state.phase == Phase.DONE


class TestStartNextRound:
    def _done_state_with_carryover(self, carryover: dict[str, int | None]) -> GameState:
        state = create_game("g", list(carryover.keys()))
        state.phase = Phase.DONE
        for p in state.players:
            p.is_fantasy = False
            p.next_fantasy_cards = carryover[p.player_id]
        return state

    def test_normal_after_no_fl_increments_round(self):
        state = self._done_state_with_carryover({"p0": None, "p1": None})
        state.round_number = 1

        start_next_round(state)

        assert state.phase == Phase.FIRST_TURN
        assert state.round_number == 2
        assert state.is_bonus_round is False
        assert all(not p.is_fantasy for p in state.players)

    def test_bonus_after_fl_holds_round_number(self):
        state = self._done_state_with_carryover({"p0": None, "p1": 14})
        state.round_number = 5

        start_next_round(state)

        assert state.phase == Phase.FANTASY_TURN
        assert state.round_number == 5  # 변하지 않음
        assert state.is_bonus_round is True
        p1 = next(p for p in state.players if p.player_id == "p1")
        assert p1.is_fantasy is True
        assert len(p1.hand) == 14

    def test_bonus_carryover_uses_assigned_cards(self):
        """KK 진입한 플레이어는 15장, 트립스 진입자는 17장 그대로 적용."""
        state = self._done_state_with_carryover({"p0": 15, "p1": 17})
        state.round_number = 2

        start_next_round(state)

        assert state.is_bonus_round is True
        hands = {p.player_id: len(p.hand) for p in state.players}
        assert hands == {"p0": 15, "p1": 17}

    def test_carryover_consumed(self):
        state = self._done_state_with_carryover({"p0": None, "p1": 14})
        start_next_round(state)
        assert all(p.next_fantasy_cards is None for p in state.players)

    def test_advance_from_wrong_phase_fails(self):
        state = create_game("g", ["p0", "p1"])
        # FIRST_TURN
        with pytest.raises(ValueError):
            start_next_round(state)

    def test_board_and_deck_reset(self):
        state = self._done_state_with_carryover({"p0": None, "p1": None})
        # 직전 라운드에서 가득 찼던 보드 흔적
        for p in state.players:
            attach_board(p, *valid_board_qq_top())

        start_next_round(state)

        # 모든 플레이어 보드 초기화 + 현재 차례 플레이어가 first_turn_cards 만큼 받음
        assert all(p.board.is_empty for p in state.players)
        assert len(state.current_player.hand) == PINEAPPLE_OFC.first_turn_cards


class TestBonusRoundFlEntryByNonFlPlayer:
    """보너스 라운드 중 비FL 플레이어가 QQ+ 조건 충족 시 다음 보너스에 합류한다."""

    def test_non_fl_player_enters_fl_in_bonus_round(self):
        # 보너스 라운드 종료 상태 시뮬레이션:
        #   p0: 이번 라운드 FL이 아니었지만 QQ 페어 달성 → next_fantasy_cards = 14
        #   p1: 이번 라운드 FL이었고 트립스 탑 → 연속 진입 14장 (고정)
        state = create_game("g", ["p0", "p1"])
        state.is_bonus_round = True
        state.round_number = 3
        state.players[0].is_fantasy = False
        attach_board(state.players[0], *valid_board_qq_top())
        state.players[1].is_fantasy = True
        attach_board(state.players[1], *valid_board_trips_top_quads_bottom())
        # 점수가 0 이하로 떨어지지 않도록 충분히 높게
        for p in state.players:
            p.score = 200

        _finalize(state, PINEAPPLE_OFC)

        assert state.phase == Phase.DONE
        p0 = state.players[0]
        p1 = state.players[1]
        assert p0.next_fantasy_cards == 14  # QQ → 14장 신규 진입
        assert p1.next_fantasy_cards == 14  # 연속 진입은 항상 14장 고정

        # 다음 라운드로 진행: 둘 다 FL → 보너스 라운드 지속, round_number 유지
        prev_round = state.round_number
        start_next_round(state)
        assert state.is_bonus_round is True
        assert state.round_number == prev_round
        assert state.players[0].is_fantasy is True
        assert state.players[1].is_fantasy is True
        assert len(state.players[0].hand) == 14
        assert len(state.players[1].hand) == 14


class TestFlReentryAlwaysFourteen:
    """FL → FL 연속 진입은 신규 진입 카드 수와 무관하게 항상 14장."""

    def test_reentry_uses_fixed_cards(self):
        # 17장으로 진입했더라도 연속 진입은 14장
        rules = replace(PINEAPPLE_OFC, fantasy_reentry_cards=14)
        state = create_game("g", ["p0", "p1"], rules=rules)
        state.players[0].is_fantasy = True
        state.players[1].is_fantasy = True
        attach_board(state.players[0], *valid_board_trips_top_quads_bottom())
        attach_board(state.players[1], *valid_board_trips_top_quads_bottom())
        for p in state.players:
            p.score = 200

        _finalize(state, rules)

        assert state.players[0].next_fantasy_cards == 14
        assert state.players[1].next_fantasy_cards == 14
