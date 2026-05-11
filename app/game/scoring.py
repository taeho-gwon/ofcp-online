from dataclasses import dataclass

from app.game.board import PlayerBoard
from app.game.hand import HandRank, HandValue
from app.game.rules import PINEAPPLE_OFC, Ruleset


@dataclass(frozen=True, slots=True)
class HeadToHeadDetail:
    """a 기준 매치업 분해. 줄별로 라인 ±1과 royalty가 분리 노출됨."""

    top_line: int
    middle_line: int
    bottom_line: int
    top_royalty_a: int
    top_royalty_b: int
    middle_royalty_a: int
    middle_royalty_b: int
    bottom_royalty_a: int
    bottom_royalty_b: int
    scoop: int
    foul_a: bool
    foul_b: bool
    total: int


def royalty_top(board: PlayerBoard, rules: Ruleset = PINEAPPLE_OFC) -> int:
    if board.is_foul or len(board.top) != rules.top_size:
        return 0
    hv = board.top_value()
    if hv.rank == HandRank.THREE_OF_A_KIND:
        return rules.top_trips_royalty.get(hv.high_card, 0)
    if hv.rank == HandRank.ONE_PAIR:
        return rules.top_pair_royalty.get(hv.high_card, 0)
    return 0


def royalty_middle(board: PlayerBoard, rules: Ruleset = PINEAPPLE_OFC) -> int:
    if board.is_foul or len(board.middle) != rules.middle_size:
        return 0
    return rules.middle_royalty.get(board.middle_value().rank, 0)


def royalty_bottom(board: PlayerBoard, rules: Ruleset = PINEAPPLE_OFC) -> int:
    if board.is_foul or len(board.bottom) != rules.bottom_size:
        return 0
    return rules.bottom_royalty.get(board.bottom_value().rank, 0)


def total_royalty(board: PlayerBoard, rules: Ruleset = PINEAPPLE_OFC) -> int:
    return (
        royalty_top(board, rules)
        + royalty_middle(board, rules)
        + royalty_bottom(board, rules)
    )


def head_to_head_detail(
    a: PlayerBoard, b: PlayerBoard, rules: Ruleset = PINEAPPLE_OFC
) -> HeadToHeadDetail:
    """a 기준 매치업 분해.

    Foul은 자동 3패. 줄별 royalty는 foul인 쪽이 0. Scoop 보너스는
    line_sum이 ±3일 때 적용 — foul 매치업도 자동 sweep으로 ±3.
    """
    foul_a, foul_b = a.is_foul, b.is_foul

    top_roy_a = 0 if foul_a else royalty_top(a, rules)
    middle_roy_a = 0 if foul_a else royalty_middle(a, rules)
    bottom_roy_a = 0 if foul_a else royalty_bottom(a, rules)
    top_roy_b = 0 if foul_b else royalty_top(b, rules)
    middle_roy_b = 0 if foul_b else royalty_middle(b, rules)
    bottom_roy_b = 0 if foul_b else royalty_bottom(b, rules)

    if foul_a and foul_b:
        top_line = middle_line = bottom_line = 0
    elif foul_a:
        top_line = middle_line = bottom_line = -1
    elif foul_b:
        top_line = middle_line = bottom_line = 1
    else:
        top_line = _cmp(a.top_value(), b.top_value())
        middle_line = _cmp(a.middle_value(), b.middle_value())
        bottom_line = _cmp(a.bottom_value(), b.bottom_value())

    line_sum = top_line + middle_line + bottom_line
    scoop = (
        rules.scoop_bonus
        if line_sum == 3
        else -rules.scoop_bonus
        if line_sum == -3
        else 0
    )
    royalty_diff = (top_roy_a + middle_roy_a + bottom_roy_a) - (
        top_roy_b + middle_roy_b + bottom_roy_b
    )
    total = line_sum + scoop + royalty_diff

    return HeadToHeadDetail(
        top_line=top_line,
        middle_line=middle_line,
        bottom_line=bottom_line,
        top_royalty_a=top_roy_a,
        top_royalty_b=top_roy_b,
        middle_royalty_a=middle_roy_a,
        middle_royalty_b=middle_roy_b,
        bottom_royalty_a=bottom_roy_a,
        bottom_royalty_b=bottom_roy_b,
        scoop=scoop,
        foul_a=foul_a,
        foul_b=foul_b,
        total=total,
    )


def head_to_head(a: PlayerBoard, b: PlayerBoard, rules: Ruleset = PINEAPPLE_OFC) -> int:
    """a 기준 순점수 반환 (b에게서 a가 얻는 점수)."""
    return head_to_head_detail(a, b, rules).total


def calculate_scores(
    boards: list[PlayerBoard], rules: Ruleset = PINEAPPLE_OFC
) -> list[int]:
    """n명 플레이어의 최종 점수를 계산 (제로섬). boards[i]가 i번 플레이어."""
    n = len(boards)
    scores = [0] * n
    for i in range(n):
        for j in range(i + 1, n):
            delta = head_to_head(boards[i], boards[j], rules)
            scores[i] += delta
            scores[j] -= delta
    return scores


def _cmp(a: HandValue, b: HandValue) -> int:
    if a > b:
        return 1
    if a < b:
        return -1
    return 0
