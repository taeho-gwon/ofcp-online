from app.game.board import PlayerBoard
from app.game.hand import HandRank


def royalty_top(board: PlayerBoard) -> int:
    if board.is_foul or len(board.top) != 3:
        return 0
    rank, (high, *_) = board.top_value()
    if rank == HandRank.THREE_OF_A_KIND:
        # 222=10 ... AAA=22
        return high - 2 + 10
    if rank == HandRank.ONE_PAIR and high >= 6:
        # 66x=1 ... AAx=9
        return high - 5
    return 0


def royalty_middle(board: PlayerBoard) -> int:
    if board.is_foul or len(board.middle) != 5:
        return 0
    rank, _ = board.middle_value()
    return {
        HandRank.THREE_OF_A_KIND: 2,
        HandRank.STRAIGHT: 4,
        HandRank.FLUSH: 8,
        HandRank.FULL_HOUSE: 12,
        HandRank.FOUR_OF_A_KIND: 20,
        HandRank.STRAIGHT_FLUSH: 30,
        HandRank.ROYAL_FLUSH: 50,
    }.get(rank, 0)


def royalty_bottom(board: PlayerBoard) -> int:
    if board.is_foul or len(board.bottom) != 5:
        return 0
    rank, _ = board.bottom_value()
    return {
        HandRank.STRAIGHT: 2,
        HandRank.FLUSH: 4,
        HandRank.FULL_HOUSE: 6,
        HandRank.FOUR_OF_A_KIND: 10,
        HandRank.STRAIGHT_FLUSH: 15,
        HandRank.ROYAL_FLUSH: 25,
    }.get(rank, 0)


def head_to_head(a: PlayerBoard, b: PlayerBoard) -> int:
    """a 기준 순점수 반환 (b에게서 a가 얻는 점수)."""
    if a.is_foul and b.is_foul:
        return 0

    if a.is_foul:
        royalty_diff = royalty_top(b) + royalty_middle(b) + royalty_bottom(b)
        return -(3 + royalty_diff)

    if b.is_foul:
        royalty_diff = royalty_top(a) + royalty_middle(a) + royalty_bottom(a)
        return 3 + royalty_diff

    def cmp(av: tuple, bv: tuple) -> int:
        if av > bv:
            return 1
        if av < bv:
            return -1
        return 0

    top_pts = cmp(a.top_value(), b.top_value())
    mid_pts = cmp(a.middle_value(), b.middle_value())
    bot_pts = cmp(a.bottom_value(), b.bottom_value())
    line_sum = top_pts + mid_pts + bot_pts

    # Scoop: 3줄 모두 이기면 +3 추가
    scoop = 3 if line_sum == 3 else (-3 if line_sum == -3 else 0)

    royalty_diff = (
        royalty_top(a)
        + royalty_middle(a)
        + royalty_bottom(a)
        - royalty_top(b)
        - royalty_middle(b)
        - royalty_bottom(b)
    )

    return line_sum + scoop + royalty_diff


def calculate_scores(boards: list[PlayerBoard]) -> list[int]:
    """n명 플레이어의 최종 점수를 계산 (제로섬). boards[i]가 i번 플레이어."""
    n = len(boards)
    scores = [0] * n
    for i in range(n):
        for j in range(i + 1, n):
            delta = head_to_head(boards[i], boards[j])
            scores[i] += delta
            scores[j] -= delta
    return scores
