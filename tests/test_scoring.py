from app.game.board import PlayerBoard
from app.game.card import Card, Rank, Suit
from app.game.scoring import (
    calculate_scores,
    head_to_head,
    royalty_top,
)


def card(rank: int, suit: int) -> Card:
    return Card(Rank(rank), Suit(suit))


def make_board(top: list, middle: list, bottom: list) -> PlayerBoard:
    b = PlayerBoard()
    b.top = [card(*c) for c in top]
    b.middle = [card(*c) for c in middle]
    b.bottom = [card(*c) for c in bottom]
    return b


class TestRoyaltyTop:
    def test_pair_66(self):
        b = make_board([(6, 1), (6, 2), (2, 3)], [], [])
        assert royalty_top(b) == 1

    def test_pair_aa(self):
        b = make_board([(14, 1), (14, 2), (2, 3)], [], [])
        assert royalty_top(b) == 9

    def test_trips_222(self):
        b = make_board([(2, 1), (2, 2), (2, 3)], [], [])
        assert royalty_top(b) == 10

    def test_trips_aaa(self):
        b = make_board([(14, 1), (14, 2), (14, 3)], [], [])
        assert royalty_top(b) == 22

    def test_no_royalty_pair_55(self):
        b = make_board([(5, 1), (5, 2), (2, 3)], [], [])
        assert royalty_top(b) == 0


class TestFoul:
    def test_foul_detected(self):
        # top이 bottom보다 강한 경우 → foul
        b = make_board(
            [(14, 1), (14, 2), (14, 3)],  # top: AAA
            [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],  # middle: 하이카드
            [(8, 1), (9, 2), (10, 3), (11, 1), (13, 2)],  # bottom: 하이카드
        )
        assert b.is_foul

    def test_no_foul(self):
        b = make_board(
            [(6, 1), (6, 2), (2, 3)],  # top: 66 페어
            [(9, 1), (9, 2), (9, 3), (2, 1), (3, 2)],  # middle: 트리플
            [(10, 1), (10, 2), (10, 3), (10, 4), (2, 1)],  # bottom: 포카드
        )
        assert not b.is_foul


class TestHeadToHead:
    def _valid_board(self) -> PlayerBoard:
        return make_board(
            [(6, 1), (6, 2), (2, 3)],
            [(9, 1), (9, 2), (9, 3), (2, 1), (3, 2)],
            [(10, 1), (10, 2), (10, 3), (10, 4), (2, 1)],
        )

    def test_scoop(self):
        a = self._valid_board()
        b = make_board(
            [(3, 1), (4, 2), (5, 3)],
            [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],
            [(8, 1), (9, 2), (10, 3), (11, 1), (13, 2)],
        )
        score = head_to_head(a, b)
        # a wins all 3 lines (+3) + scoop (+3) + royalties
        assert score >= 6

    def test_foul_loses(self):
        foul = make_board(
            [(14, 1), (14, 2), (14, 3)],  # AAA top → foul
            [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],
            [(8, 1), (9, 2), (10, 3), (11, 1), (13, 2)],
        )
        normal = self._valid_board()
        assert head_to_head(foul, normal) < 0
        assert head_to_head(normal, foul) > 0

    def test_zero_sum(self):
        a = self._valid_board()
        b = make_board(
            [(3, 1), (4, 2), (5, 3)],
            [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],
            [(8, 1), (9, 2), (10, 3), (11, 1), (13, 2)],
        )
        assert head_to_head(a, b) + head_to_head(b, a) == 0

    def test_three_player_zero_sum(self):
        boards = [
            self._valid_board(),
            make_board(
                [(3, 1), (4, 2), (5, 3)],
                [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],
                [(8, 1), (9, 2), (10, 3), (11, 1), (13, 2)],
            ),
            make_board(
                [(7, 1), (7, 2), (2, 3)],
                [(5, 1), (5, 2), (5, 3), (3, 1), (4, 2)],
                [(9, 1), (9, 2), (9, 3), (9, 4), (2, 1)],
            ),
        ]
        scores = calculate_scores(boards)
        assert sum(scores) == 0
