from app.game.card import Card, Rank, Suit
from app.game.hand import HandRank, evaluate


def card(rank: int, suit: int) -> Card:
    return Card(Rank(rank), Suit(suit))


def cards(*args: tuple[int, int]) -> list[Card]:
    return [card(r, s) for r, s in args]


class TestEvaluateThree:
    def test_trips(self):
        hand = cards((14, 1), (14, 2), (14, 3))
        rank, tiebreak = evaluate(hand)
        assert rank == HandRank.THREE_OF_A_KIND
        assert tiebreak[0] == 14

    def test_pair(self):
        hand = cards((13, 1), (13, 2), (2, 3))
        rank, tiebreak = evaluate(hand)
        assert rank == HandRank.ONE_PAIR
        assert tiebreak[0] == 13

    def test_high_card(self):
        hand = cards((14, 1), (10, 2), (7, 3))
        rank, _ = evaluate(hand)
        assert rank == HandRank.HIGH_CARD


class TestEvaluateFive:
    def test_royal_flush(self):
        hand = cards((14, 1), (13, 1), (12, 1), (11, 1), (10, 1))
        rank, _ = evaluate(hand)
        assert rank == HandRank.ROYAL_FLUSH

    def test_straight_flush(self):
        hand = cards((9, 1), (8, 1), (7, 1), (6, 1), (5, 1))
        rank, (high,) = evaluate(hand)
        assert rank == HandRank.STRAIGHT_FLUSH
        assert high == 9

    def test_four_of_a_kind(self):
        hand = cards((7, 1), (7, 2), (7, 3), (7, 4), (2, 1))
        rank, tiebreak = evaluate(hand)
        assert rank == HandRank.FOUR_OF_A_KIND
        assert tiebreak[0] == 7

    def test_full_house(self):
        hand = cards((10, 1), (10, 2), (10, 3), (6, 1), (6, 2))
        rank, tiebreak = evaluate(hand)
        assert rank == HandRank.FULL_HOUSE
        assert tiebreak == (10, 6)

    def test_flush(self):
        hand = cards((14, 1), (10, 1), (8, 1), (5, 1), (2, 1))
        rank, _ = evaluate(hand)
        assert rank == HandRank.FLUSH

    def test_straight(self):
        hand = cards((9, 1), (8, 2), (7, 3), (6, 1), (5, 2))
        rank, (high,) = evaluate(hand)
        assert rank == HandRank.STRAIGHT
        assert high == 9

    def test_wheel_straight(self):
        hand = cards((14, 1), (2, 2), (3, 3), (4, 1), (5, 2))
        rank, (high,) = evaluate(hand)
        assert rank == HandRank.STRAIGHT
        assert high == 5

    def test_two_pair(self):
        hand = cards((14, 1), (14, 2), (13, 1), (13, 2), (2, 1))
        rank, tiebreak = evaluate(hand)
        assert rank == HandRank.TWO_PAIR
        assert tiebreak[:2] == (14, 13)

    def test_one_pair(self):
        hand = cards((9, 1), (9, 2), (7, 1), (5, 2), (2, 3))
        rank, tiebreak = evaluate(hand)
        assert rank == HandRank.ONE_PAIR
        assert tiebreak[0] == 9

    def test_high_card(self):
        hand = cards((14, 1), (10, 2), (7, 3), (5, 1), (2, 2))
        rank, _ = evaluate(hand)
        assert rank == HandRank.HIGH_CARD
