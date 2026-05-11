from collections import Counter
from enum import IntEnum

from app.game.card import Card, Rank


class HandRank(IntEnum):
    HIGH_CARD = 1
    ONE_PAIR = 2
    TWO_PAIR = 3
    THREE_OF_A_KIND = 4
    STRAIGHT = 5
    FLUSH = 6
    FULL_HOUSE = 7
    FOUR_OF_A_KIND = 8
    STRAIGHT_FLUSH = 9
    ROYAL_FLUSH = 10


# (HandRank, tiebreaker tuple) — higher is stronger
HandValue = tuple[HandRank, tuple[int, ...]]


def evaluate(cards: list[Card]) -> HandValue:
    if len(cards) == 3:
        return _evaluate_three(cards)
    if len(cards) == 5:
        return _evaluate_five(cards)
    raise ValueError(f"Cannot evaluate {len(cards)}-card hand")


def _ranks_sorted(cards: list[Card]) -> list[int]:
    return sorted((c.rank.value for c in cards), reverse=True)


def _evaluate_three(cards: list[Card]) -> HandValue:
    ranks = _ranks_sorted(cards)
    counts = Counter(c.rank.value for c in cards)
    freq = sorted(counts.values(), reverse=True)

    if freq[0] == 3:
        r = counts.most_common(1)[0][0]
        return (HandRank.THREE_OF_A_KIND, (r,))
    if freq[0] == 2:
        pair_rank = counts.most_common(1)[0][0]
        kicker = [r for r in ranks if r != pair_rank][0]
        return (HandRank.ONE_PAIR, (pair_rank, kicker))
    return (HandRank.HIGH_CARD, tuple(ranks))


def _evaluate_five(cards: list[Card]) -> HandValue:
    ranks = _ranks_sorted(cards)
    counts = Counter(c.rank.value for c in cards)
    freq = sorted(counts.values(), reverse=True)
    is_flush = len({c.suit for c in cards}) == 1
    is_straight, straight_high = _check_straight(ranks)

    if is_flush and is_straight:
        if straight_high == Rank.ACE:
            return (HandRank.ROYAL_FLUSH, (straight_high,))
        return (HandRank.STRAIGHT_FLUSH, (straight_high,))

    if freq[0] == 4:
        quad = counts.most_common(1)[0][0]
        kicker = [r for r in ranks if r != quad][0]
        return (HandRank.FOUR_OF_A_KIND, (quad, kicker))

    if freq == [3, 2]:
        trip = counts.most_common(1)[0][0]
        pair = counts.most_common(2)[1][0]
        return (HandRank.FULL_HOUSE, (trip, pair))

    if is_flush:
        return (HandRank.FLUSH, tuple(ranks))

    if is_straight:
        return (HandRank.STRAIGHT, (straight_high,))

    if freq[0] == 3:
        trip = counts.most_common(1)[0][0]
        kickers = sorted([r for r in ranks if r != trip], reverse=True)
        return (HandRank.THREE_OF_A_KIND, (trip, *kickers))

    if freq == [2, 2, 1]:
        pairs = sorted([r for r, c in counts.items() if c == 2], reverse=True)
        kicker = [r for r in ranks if r not in pairs][0]
        return (HandRank.TWO_PAIR, (*pairs, kicker))

    if freq[0] == 2:
        pair = counts.most_common(1)[0][0]
        kickers = sorted([r for r in ranks if r != pair], reverse=True)
        return (HandRank.ONE_PAIR, (pair, *kickers))

    return (HandRank.HIGH_CARD, tuple(ranks))


def _check_straight(ranks: list[int]) -> tuple[bool, int]:
    unique = sorted(set(ranks), reverse=True)
    if len(unique) == 5 and unique[0] - unique[4] == 4:
        return True, unique[0]
    # A-2-3-4-5 wheel
    if unique == [14, 5, 4, 3, 2]:
        return True, 5
    return False, 0
