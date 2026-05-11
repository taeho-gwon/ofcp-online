from app.game.card import Card, Rank, Suit
from app.game.hand import HandRank, evaluate


def card(rank: int, suit: int) -> Card:
    return Card(Rank(rank), Suit(suit))


def cards(*args: tuple[int, int]) -> list[Card]:
    return [card(r, s) for r, s in args]


class TestEvaluateThree:
    def test_trips(self):
        hv = evaluate(cards((14, 1), (14, 2), (14, 3)))
        assert hv.rank == HandRank.THREE_OF_A_KIND
        assert hv.high_card == 14

    def test_pair(self):
        hv = evaluate(cards((13, 1), (13, 2), (2, 3)))
        assert hv.rank == HandRank.ONE_PAIR
        assert hv.high_card == 13

    def test_high_card(self):
        hv = evaluate(cards((14, 1), (10, 2), (7, 3)))
        assert hv.rank == HandRank.HIGH_CARD


class TestEvaluateFive:
    def test_royal_flush(self):
        hv = evaluate(cards((14, 1), (13, 1), (12, 1), (11, 1), (10, 1)))
        assert hv.rank == HandRank.ROYAL_FLUSH

    def test_straight_flush(self):
        hv = evaluate(cards((9, 1), (8, 1), (7, 1), (6, 1), (5, 1)))
        assert hv.rank == HandRank.STRAIGHT_FLUSH
        assert hv.high_card == 9

    def test_four_of_a_kind(self):
        hv = evaluate(cards((7, 1), (7, 2), (7, 3), (7, 4), (2, 1)))
        assert hv.rank == HandRank.FOUR_OF_A_KIND
        assert hv.high_card == 7

    def test_full_house(self):
        hv = evaluate(cards((10, 1), (10, 2), (10, 3), (6, 1), (6, 2)))
        assert hv.rank == HandRank.FULL_HOUSE
        assert hv.tiebreakers == (10, 6)

    def test_flush(self):
        hv = evaluate(cards((14, 1), (10, 1), (8, 1), (5, 1), (2, 1)))
        assert hv.rank == HandRank.FLUSH

    def test_straight(self):
        hv = evaluate(cards((9, 1), (8, 2), (7, 3), (6, 1), (5, 2)))
        assert hv.rank == HandRank.STRAIGHT
        assert hv.high_card == 9

    def test_wheel_straight(self):
        hv = evaluate(cards((14, 1), (2, 2), (3, 3), (4, 1), (5, 2)))
        assert hv.rank == HandRank.STRAIGHT
        assert hv.high_card == 5

    def test_two_pair(self):
        hv = evaluate(cards((14, 1), (14, 2), (13, 1), (13, 2), (2, 1)))
        assert hv.rank == HandRank.TWO_PAIR
        assert hv.tiebreakers[:2] == (14, 13)

    def test_one_pair(self):
        hv = evaluate(cards((9, 1), (9, 2), (7, 1), (5, 2), (2, 3)))
        assert hv.rank == HandRank.ONE_PAIR
        assert hv.high_card == 9

    def test_high_card(self):
        hv = evaluate(cards((14, 1), (10, 2), (7, 3), (5, 1), (2, 2)))
        assert hv.rank == HandRank.HIGH_CARD


class TestHandValueComparison:
    def test_higher_rank_beats_lower(self):
        pair = evaluate(cards((5, 1), (5, 2), (2, 3)))
        trips = evaluate(cards((2, 1), (2, 2), (2, 3)))
        assert trips > pair

    def test_same_rank_higher_tiebreaker_wins(self):
        kk = evaluate(cards((13, 1), (13, 2), (2, 3)))
        qq = evaluate(cards((12, 1), (12, 2), (14, 3)))
        assert kk > qq
