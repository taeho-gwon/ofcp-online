from app.game.board import PlayerBoard
from app.game.card import Card, Rank, Suit
from app.game.scoring import (
    calculate_scores,
    head_to_head,
    head_to_head_detail,
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

    def test_detail_matches_total(self):
        a = self._valid_board()
        b = make_board(
            [(3, 1), (4, 2), (5, 3)],
            [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],
            [(8, 1), (9, 2), (10, 3), (11, 1), (13, 2)],
        )
        d = head_to_head_detail(a, b)
        assert d.total == head_to_head(a, b)
        # a가 모든 줄 우세 → 라인 +1/+1/+1, 스쿱 +3
        assert d.top_line == 1
        assert d.middle_line == 1
        assert d.bottom_line == 1
        assert d.scoop == 3
        assert not d.foul_a and not d.foul_b
        line_sum = d.top_line + d.middle_line + d.bottom_line
        roy_diff = (
            d.top_royalty_a
            + d.middle_royalty_a
            + d.bottom_royalty_a
            - d.top_royalty_b
            - d.middle_royalty_b
            - d.bottom_royalty_b
        )
        assert d.total == line_sum + d.scoop + roy_diff

    def test_detail_foul_a(self):
        foul = make_board(
            [(14, 1), (14, 2), (14, 3)],
            [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],
            [(8, 1), (9, 2), (10, 3), (11, 1), (13, 2)],
        )
        normal = self._valid_board()
        d = head_to_head_detail(foul, normal)
        assert d.foul_a and not d.foul_b
        # foul 쪽은 자동 3패
        assert d.top_line == -1
        assert d.middle_line == -1
        assert d.bottom_line == -1
        # 자동 sweep이므로 scoop -3
        assert d.scoop == -3
        # foul 쪽 royalty는 모두 0
        assert d.top_royalty_a == 0
        assert d.middle_royalty_a == 0
        assert d.bottom_royalty_a == 0
        # 상대 royalty는 그대로
        roy_b_total = d.top_royalty_b + d.middle_royalty_b + d.bottom_royalty_b
        assert roy_b_total > 0
        # 총합 = -3 - 3 - roy_b
        assert d.total == -3 - 3 - roy_b_total
        assert d.total == head_to_head(foul, normal)

    def test_detail_both_foul(self):
        foul1 = make_board(
            [(14, 1), (14, 2), (14, 3)],
            [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],
            [(8, 1), (9, 2), (10, 3), (11, 1), (13, 2)],
        )
        foul2 = make_board(
            [(13, 1), (13, 2), (13, 3)],  # KKK top
            [(2, 1), (3, 2), (4, 3), (5, 1), (7, 2)],  # 하이카드 7
            [(6, 1), (8, 2), (9, 3), (10, 1), (12, 2)],  # 하이카드 Q
        )
        d = head_to_head_detail(foul1, foul2)
        assert d.foul_a and d.foul_b
        assert d.top_line == 0
        assert d.middle_line == 0
        assert d.bottom_line == 0
        assert d.scoop == 0
        assert d.top_royalty_a == 0 and d.top_royalty_b == 0
        assert d.total == 0

    def test_user_example_foul_with_strong_opponent(self):
        """P1: 탑 A 하이카드, 미들 트리플, 바텀 포카드. P2: foul → P1 +18."""
        p1 = make_board(
            [(14, 1), (13, 2), (12, 3)],  # A-K-Q 하이카드 (royalty 0)
            [(7, 1), (7, 2), (7, 3), (2, 1), (3, 2)],  # 트리플 7 (royalty +2)
            [(10, 1), (10, 2), (10, 3), (10, 4), (2, 2)],  # 포카드 10 (royalty +10)
        )
        # foul: top이 너무 강함 (AAA) vs middle/bottom 약함
        p2 = make_board(
            [(14, 4), (14, 1), (14, 2)],  # AAA 트리플 (foul 유발)
            [(2, 3), (3, 3), (4, 4), (5, 4), (7, 4)],  # 하이카드 7
            [(8, 4), (9, 4), (10, 1), (11, 4), (13, 4)],  # 하이카드 K
        )
        assert not p1.is_foul
        assert p2.is_foul
        d = head_to_head_detail(p1, p2)
        assert d.foul_a is False and d.foul_b is True
        assert d.top_line == 1
        assert d.middle_line == 1
        assert d.bottom_line == 1
        assert d.scoop == 3
        # P1 royalty: 탑 0, 미들 2 (트리플 7), 바텀 10 (포카드)
        assert d.top_royalty_a == 0
        assert d.middle_royalty_a == 2
        assert d.bottom_royalty_a == 10
        # P2 royalty: foul → 0
        assert d.top_royalty_b == 0
        assert d.middle_royalty_b == 0
        assert d.bottom_royalty_b == 0
        # 총합 +18
        assert d.total == 18

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
