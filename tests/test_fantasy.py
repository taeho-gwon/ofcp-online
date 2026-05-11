from app.game.board import PlayerBoard
from app.game.card import Card, Rank, Suit
from app.game.engine import (
    _fantasy_entry_cards,
    _qualifies_for_reentry,
    create_game,
    place_fantasy_turn,
    place_first_turn,
    place_normal_turn,
)
from app.game.state import Phase


def card(rank: int, suit: int) -> Card:
    return Card(Rank(rank), Suit(suit))


def make_board(top: list, middle: list, bottom: list) -> PlayerBoard:
    b = PlayerBoard()
    b.top = [card(*c) for c in top]
    b.middle = [card(*c) for c in middle]
    b.bottom = [card(*c) for c in bottom]
    return b


class TestFantasyEntryCards:
    def test_qq_pair(self):
        b = make_board([(12, 1), (12, 2), (2, 3)], [], [])
        assert _fantasy_entry_cards(b) == 14

    def test_kk_pair(self):
        b = make_board([(13, 1), (13, 2), (2, 3)], [], [])
        assert _fantasy_entry_cards(b) == 15

    def test_aa_pair(self):
        b = make_board([(14, 1), (14, 2), (2, 3)], [], [])
        assert _fantasy_entry_cards(b) == 16

    def test_trips(self):
        b = make_board([(7, 1), (7, 2), (7, 3)], [], [])
        assert _fantasy_entry_cards(b) == 17

    def test_jj_no_entry(self):
        b = make_board([(11, 1), (11, 2), (2, 3)], [], [])
        assert _fantasy_entry_cards(b) is None

    def test_foul_no_entry(self):
        b = make_board(
            [(14, 1), (14, 2), (14, 3)],
            [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],
            [(8, 1), (9, 2), (10, 3), (11, 1), (13, 2)],
        )
        assert _fantasy_entry_cards(b) is None


class TestQualifiesForReentry:
    def _valid_board(self, top, middle, bottom) -> PlayerBoard:
        return make_board(top, middle, bottom)

    def test_trips_top(self):
        b = make_board(
            [(7, 1), (7, 2), (7, 3)],
            [(9, 1), (9, 2), (9, 3), (2, 1), (3, 2)],
            [(10, 1), (10, 2), (10, 3), (10, 4), (2, 1)],
        )
        assert _qualifies_for_reentry(b)

    def test_quads_bottom(self):
        b = make_board(
            [(6, 1), (6, 2), (2, 3)],
            [(9, 1), (9, 2), (9, 3), (2, 1), (3, 2)],
            [(10, 1), (10, 2), (10, 3), (10, 4), (2, 1)],
        )
        assert _qualifies_for_reentry(b)

    def test_straight_flush_bottom(self):
        b = make_board(
            [(6, 1), (6, 2), (2, 3)],
            [(9, 1), (9, 2), (9, 3), (2, 1), (3, 2)],
            [(5, 1), (6, 1), (7, 1), (8, 1), (9, 1)],
        )
        # SF >= FOUR_OF_A_KIND → reentry
        assert _qualifies_for_reentry(b)

    def test_no_reentry(self):
        b = make_board(
            [(6, 1), (6, 2), (2, 3)],
            [(9, 1), (9, 2), (9, 3), (2, 1), (3, 2)],
            [(10, 1), (10, 2), (10, 3), (11, 1), (13, 2)],
        )
        assert not _qualifies_for_reentry(b)

    def test_foul_no_reentry(self):
        b = make_board(
            [(14, 1), (14, 2), (14, 3)],
            [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],
            [(8, 1), (9, 2), (10, 3), (11, 1), (13, 2)],
        )
        assert not _qualifies_for_reentry(b)


class TestFantasyTurnFlow:
    def _make_13_cards(self) -> list[Card]:
        suits = [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES]
        cards = [Card(Rank(r), suits[i % 4]) for i, r in enumerate(range(2, 15))]
        return cards  # 13장

    def test_fantasy_only_players_go_to_done(self):
        state = create_game(
            "g1",
            ["p1", "p2"],
            dealer_idx=0,
            fantasy_players={"p1": 14, "p2": 14},
        )
        assert state.phase == Phase.FANTASY_TURN
        assert state.players[0].is_fantasy
        assert state.players[1].is_fantasy

        # p1 (딜러 왼쪽, idx=1이 first 아닌, idx=1이 dealer 왼쪽)
        # dealer=0 → first FL: idx=1
        assert state.current_player_idx == 1
        assert len(state.current_player.hand) == 14

    def test_fantasy_player_then_normal(self):
        # dealer=0, p1=FL, p2=일반
        state = create_game(
            "g1",
            ["p0", "p1", "p2"],
            dealer_idx=0,
            fantasy_players={"p1": 14},
        )
        assert state.phase == Phase.FANTASY_TURN
        assert state.current_player_idx == 1  # dealer 왼쪽 FL 플레이어

        # p1 FL 배치
        hand = state.current_player.hand
        placements = {
            "top": hand[:3],
            "middle": hand[3:8],
            "bottom": hand[8:13],
        }
        discards = hand[13:]
        state = place_fantasy_turn(state, "p1", placements, discards)

        # FL 완료 → FIRST_TURN으로 전환, 일반 플레이어 시작
        assert state.phase == Phase.FIRST_TURN
        assert not state.players[state.current_player_idx].is_fantasy

    def test_next_fantasy_cards_set_on_reentry(self):
        state = create_game(
            "g1",
            ["p0", "p1"],
            dealer_idx=0,
            fantasy_players={"p1": 14},
        )
        # 트립스가 확실히 포함된 14장으로 hand 교체
        fixed = [
            card(7, 1),
            card(7, 2),
            card(7, 3),  # top: 트립스
            card(9, 1),
            card(9, 2),
            card(9, 3),
            card(9, 4),
            card(2, 1),  # middle: 포카드+1
            card(10, 1),
            card(10, 2),
            card(10, 3),
            card(10, 4),
            card(3, 1),  # bottom: 포카드+1
            card(4, 1),  # discard
        ]
        state.current_player.hand = fixed

        state = place_fantasy_turn(
            state,
            "p1",
            {"top": fixed[:3], "middle": fixed[3:8], "bottom": fixed[8:13]},
            [fixed[13]],
        )
        assert state.phase == Phase.FIRST_TURN

        # p0 첫 턴: top 3장, middle 2장, bottom 비워둠
        hand0 = state.current_player.hand
        state = place_first_turn(state, {"top": hand0[:3], "middle": hand0[3:5]})

        # bottom 5장, middle 3장 채워야 함 → 4턴
        # 턴1: bottom 2장
        h = state.current_player.hand
        state = place_normal_turn(state, {"bottom": h[:2]}, h[2])
        # 턴2: bottom 2장
        h = state.current_player.hand
        state = place_normal_turn(state, {"bottom": h[:2]}, h[2])
        # 턴3: bottom 1장 + middle 1장
        h = state.current_player.hand
        state = place_normal_turn(state, {"bottom": h[:1], "middle": h[1:2]}, h[2])
        # 턴4: middle 2장 → 완성 → DONE
        h = state.current_player.hand
        state = place_normal_turn(state, {"middle": h[:2]}, h[2])

        assert state.phase == Phase.DONE
        p1 = next(p for p in state.players if p.player_id == "p1")
        assert p1.next_fantasy_cards == 14

    def test_no_fantasy_game_unaffected(self):
        state = create_game("g1", ["p0", "p1"], dealer_idx=0)
        assert state.phase == Phase.FIRST_TURN
        assert not any(p.is_fantasy for p in state.players)


class TestFantasySimultaneousPlacement:
    """FL 플레이어 간 순서에 상관없이 동시 진행이 가능해야 한다."""

    def _full_fl_placements(
        self, hand: list[Card]
    ) -> tuple[dict[str, list[Card]], list[Card]]:
        return (
            {"top": hand[:3], "middle": hand[3:8], "bottom": hand[8:13]},
            list(hand[13:]),
        )

    def test_later_player_can_place_first(self):
        state = create_game(
            "g1",
            ["p0", "p1", "p2"],
            dealer_idx=0,
            fantasy_players={"p1": 14, "p2": 14},
        )
        # 기본 순회상 dealer+1=p1이 먼저지만 p2가 먼저 둬도 허용되어야 한다.
        p2 = next(p for p in state.players if p.player_id == "p2")
        placements, discards = self._full_fl_placements(p2.hand)
        state = place_fantasy_turn(state, "p2", placements, discards)

        # 아직 p1 미완 → FANTASY_TURN 유지
        assert state.phase == Phase.FANTASY_TURN
        assert p2.board.is_complete
        # current_player_idx는 표시용으로 미완 FL을 가리킨다
        assert state.players[state.current_player_idx].player_id == "p1"

    def test_completed_player_cannot_place_again(self):
        state = create_game(
            "g1",
            ["p0", "p1"],
            dealer_idx=0,
            fantasy_players={"p0": 14, "p1": 14},
        )
        p1 = next(p for p in state.players if p.player_id == "p1")
        placements, discards = self._full_fl_placements(p1.hand)
        state = place_fantasy_turn(state, "p1", placements, discards)

        # p1은 이미 완료 → 다시 두려 하면 거부
        import pytest

        with pytest.raises(ValueError):
            place_fantasy_turn(state, "p1", placements, discards)

    def test_non_fl_player_cannot_place_fantasy(self):
        state = create_game(
            "g1",
            ["p0", "p1"],
            dealer_idx=0,
            fantasy_players={"p1": 14},
        )
        p1 = next(p for p in state.players if p.player_id == "p1")
        placements, discards = self._full_fl_placements(p1.hand)

        import pytest

        with pytest.raises(ValueError):
            place_fantasy_turn(state, "p0", placements, discards)
