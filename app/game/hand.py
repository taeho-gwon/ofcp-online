from collections import Counter
from dataclasses import dataclass
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


@dataclass(frozen=True, order=True, slots=True)
class HandValue:
    """포커 핸드의 강도. (rank, tiebreakers) 순서로 자연스럽게 비교된다."""

    rank: HandRank
    tiebreakers: tuple[int, ...]

    @property
    def high_card(self) -> int:
        return self.tiebreakers[0]


HAND_RANK_LABEL: dict[HandRank, str] = {
    HandRank.HIGH_CARD: "하이카드",
    HandRank.ONE_PAIR: "원페어",
    HandRank.TWO_PAIR: "투페어",
    HandRank.THREE_OF_A_KIND: "트리플",
    HandRank.STRAIGHT: "스트레이트",
    HandRank.FLUSH: "플러시",
    HandRank.FULL_HOUSE: "풀하우스",
    HandRank.FOUR_OF_A_KIND: "포카드",
    HandRank.STRAIGHT_FLUSH: "스트레이트 플러시",
    HandRank.ROYAL_FLUSH: "로열 플러시",
}

_RANK_CHARS: dict[int, str] = {
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "T",
    11: "J",
    12: "Q",
    13: "K",
    14: "A",
}


def format_hand_value(hv: HandValue) -> str:
    """사람 표시용 핸드 라벨."""
    base = HAND_RANK_LABEL[hv.rank]
    tb = hv.tiebreakers
    match hv.rank:
        case HandRank.ROYAL_FLUSH:
            return base
        case HandRank.STRAIGHT_FLUSH | HandRank.STRAIGHT:
            high = _RANK_CHARS[tb[0]]
            return f"{base} ({high}-high)"
        case HandRank.FOUR_OF_A_KIND:
            quad = _RANK_CHARS[tb[0]]
            return f"{base} {quad * 4}"
        case HandRank.FULL_HOUSE:
            trip, pair = _RANK_CHARS[tb[0]], _RANK_CHARS[tb[1]]
            return f"{base} ({trip * 3}+{pair * 2})"
        case HandRank.FLUSH:
            high = _RANK_CHARS[tb[0]]
            return f"{base} ({high}-high)"
        case HandRank.THREE_OF_A_KIND:
            trip = _RANK_CHARS[tb[0]]
            return f"{base} {trip * 3}"
        case HandRank.TWO_PAIR:
            hi, lo = _RANK_CHARS[tb[0]], _RANK_CHARS[tb[1]]
            return f"{base} {hi * 2}+{lo * 2}"
        case HandRank.ONE_PAIR:
            pair = _RANK_CHARS[tb[0]]
            return f"{base} {pair * 2}"
        case HandRank.HIGH_CARD:
            high = _RANK_CHARS[tb[0]]
            return f"{base} ({high}-high)"
    return base


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
        return HandValue(HandRank.THREE_OF_A_KIND, (r,))
    if freq[0] == 2:
        pair_rank = counts.most_common(1)[0][0]
        kicker = [r for r in ranks if r != pair_rank][0]
        return HandValue(HandRank.ONE_PAIR, (pair_rank, kicker))
    return HandValue(HandRank.HIGH_CARD, tuple(ranks))


def _evaluate_five(cards: list[Card]) -> HandValue:
    ranks = _ranks_sorted(cards)
    counts = Counter(c.rank.value for c in cards)
    freq = sorted(counts.values(), reverse=True)
    is_flush = len({c.suit for c in cards}) == 1
    is_straight, straight_high = _check_straight(ranks)

    if is_flush and is_straight:
        if straight_high == Rank.ACE:
            return HandValue(HandRank.ROYAL_FLUSH, (straight_high,))
        return HandValue(HandRank.STRAIGHT_FLUSH, (straight_high,))

    if freq[0] == 4:
        quad = counts.most_common(1)[0][0]
        kicker = [r for r in ranks if r != quad][0]
        return HandValue(HandRank.FOUR_OF_A_KIND, (quad, kicker))

    if freq == [3, 2]:
        trip = counts.most_common(1)[0][0]
        pair = counts.most_common(2)[1][0]
        return HandValue(HandRank.FULL_HOUSE, (trip, pair))

    if is_flush:
        return HandValue(HandRank.FLUSH, tuple(ranks))

    if is_straight:
        return HandValue(HandRank.STRAIGHT, (straight_high,))

    if freq[0] == 3:
        trip = counts.most_common(1)[0][0]
        kickers = sorted([r for r in ranks if r != trip], reverse=True)
        return HandValue(HandRank.THREE_OF_A_KIND, (trip, *kickers))

    if freq == [2, 2, 1]:
        pairs = sorted([r for r, c in counts.items() if c == 2], reverse=True)
        kicker = [r for r in ranks if r not in pairs][0]
        return HandValue(HandRank.TWO_PAIR, (*pairs, kicker))

    if freq[0] == 2:
        pair = counts.most_common(1)[0][0]
        kickers = sorted([r for r in ranks if r != pair], reverse=True)
        return HandValue(HandRank.ONE_PAIR, (pair, *kickers))

    return HandValue(HandRank.HIGH_CARD, tuple(ranks))


def _check_straight(ranks: list[int]) -> tuple[bool, int]:
    unique = sorted(set(ranks), reverse=True)
    if len(unique) == 5 and unique[0] - unique[4] == 4:
        return True, unique[0]
    # A-2-3-4-5 wheel
    if unique == [14, 5, 4, 3, 2]:
        return True, 5
    return False, 0
