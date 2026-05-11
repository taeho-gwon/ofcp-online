from app.game.board import PlayerBoard
from app.game.card import Card, Deck
from app.game.hand import HandRank, evaluate
from app.game.scoring import calculate_scores
from app.game.state import GameState, Phase, PlayerState

FIRST_TURN_CARDS = 5
NORMAL_TURN_CARDS = 3
FANTASY_BOARD_SIZE = 13


def create_game(
    game_id: str,
    player_ids: list[str],
    dealer_idx: int = 0,
    fantasy_players: dict[str, int] | None = None,
) -> GameState:
    """
    fantasy_players: {player_id: card_count} — FL로 시작하는 플레이어와 받을 카드 수.
    """
    if not (2 <= len(player_ids) <= 3):
        raise ValueError("Player count must be 2 or 3")

    deck = Deck()
    players = [PlayerState(pid) for pid in player_ids]

    fantasy_set = fantasy_players or {}
    for player in players:
        if player.player_id in fantasy_set:
            player.is_fantasy = True
            player.hand = deck.deal(fantasy_set[player.player_id])

    state = GameState(
        game_id=game_id,
        players=players,
        deck=deck,
        dealer_idx=dealer_idx,
    )

    if fantasy_set:
        state.phase = Phase.FANTASY_TURN
        state.current_player_idx = _first_incomplete_fantasy_idx(state)
    else:
        state.phase = Phase.FIRST_TURN
        state.current_player_idx = (dealer_idx + 1) % len(player_ids)
        _deal_to_current(state)

    return state


def place_fantasy_turn(
    state: GameState,
    placements: dict[str, list[Card]],
    discards: list[Card],
) -> GameState:
    """FL 턴: N장 중 13장 배치, 나머지 버림."""
    if state.phase != Phase.FANTASY_TURN:
        raise ValueError("Not in fantasy turn phase")

    player = state.current_player
    placed = [c for cards in placements.values() for c in cards]

    if len(placed) != FANTASY_BOARD_SIZE:
        raise ValueError("Must place exactly 13 cards")
    if set(placed + discards) != set(player.hand):
        raise ValueError("Cards must come from hand")

    for row, cards in placements.items():
        player.board.place(cards, row)
    player.hand = []

    return _advance_fantasy(state)


def place_first_turn(state: GameState, placements: dict[str, list[Card]]) -> GameState:
    """첫 턴: 5장을 top/middle/bottom에 배치."""
    if state.phase != Phase.FIRST_TURN:
        raise ValueError("Not in first turn phase")

    _apply_placements(state.current_player, placements)
    return _advance(state)


def place_normal_turn(
    state: GameState, placements: dict[str, list[Card]], discard: Card
) -> GameState:
    """일반 턴: 3장 중 2장 배치, 1장 버림."""
    if state.phase != Phase.NORMAL_TURN:
        raise ValueError("Not in normal turn phase")

    player = state.current_player
    placed = [c for cards in placements.values() for c in cards]

    if len(placed) != 2 or discard not in player.hand:
        raise ValueError("Must place exactly 2 cards and discard 1 from hand")
    if set(placed + [discard]) != set(player.hand):
        raise ValueError("Cards must come from current hand")

    _apply_placements(player, placements)
    return _advance(state)


# ── 내부 헬퍼 ──────────────────────────────────────────────────────────────────


def _apply_placements(player: PlayerState, placements: dict[str, list[Card]]) -> None:
    for row, cards in placements.items():
        player.board.place(cards, row)
    player.hand = []


def _deal_to_current(state: GameState) -> None:
    n = FIRST_TURN_CARDS if state.phase == Phase.FIRST_TURN else NORMAL_TURN_CARDS
    state.current_player.hand = state.deck.deal(n)


def _first_incomplete_fantasy_idx(state: GameState) -> int:
    start = (state.dealer_idx + 1) % state.player_count
    for i in range(state.player_count):
        idx = (start + i) % state.player_count
        p = state.players[idx]
        if p.is_fantasy and not p.board.is_complete:
            return idx
    raise RuntimeError("No incomplete fantasy player found")


def _advance_fantasy(state: GameState) -> GameState:
    """FL 플레이어 배치 완료 후 다음 FL 플레이어로, 없으면 FIRST_TURN으로 전환."""
    probe = state.next_player_idx()
    for _ in range(state.player_count - 1):
        p = state.players[probe]
        if p.is_fantasy and not p.board.is_complete:
            state.current_player_idx = probe
            return state
        probe = (probe + 1) % state.player_count

    # 모든 FL 플레이어 완료 → 일반 플레이어 첫 턴 시작
    start = (state.dealer_idx + 1) % state.player_count
    for i in range(state.player_count):
        idx = (start + i) % state.player_count
        if not state.players[idx].is_fantasy:
            state.phase = Phase.FIRST_TURN
            state.current_player_idx = idx
            _deal_to_current(state)
            return state

    # 전원 FL → 바로 채점
    return _finalize(state)


def _advance(state: GameState) -> GameState:
    """첫 턴/일반 턴 배치 완료 후 다음 상태로 전환."""
    if state.phase == Phase.FIRST_TURN:
        return _advance_first_turn(state)
    return _advance_normal_turn(state)


def _advance_first_turn(state: GameState) -> GameState:
    # top이 비어있는 일반 플레이어 = 아직 첫 턴 미완
    probe = state.next_player_idx()
    for _ in range(state.player_count - 1):
        p = state.players[probe]
        if not p.is_fantasy and len(p.board.top) == 0:
            state.current_player_idx = probe
            _deal_to_current(state)
            return state
        probe = (probe + 1) % state.player_count

    # 모든 일반 플레이어 첫 턴 완료 → NORMAL_TURN
    state.phase = Phase.NORMAL_TURN
    return _advance_normal_turn(state)


def _advance_normal_turn(state: GameState) -> GameState:
    # 보드 미완성 플레이어 순서대로 (FL 플레이어는 이미 완성되어 자동 건너뜀)
    probe = state.next_player_idx()
    for _ in range(state.player_count):
        if not state.players[probe].board.is_complete:
            state.current_player_idx = probe
            _deal_to_current(state)
            return state
        probe = (probe + 1) % state.player_count

    return _finalize(state)


def _finalize(state: GameState) -> GameState:
    state.phase = Phase.SCORING
    boards = [p.board for p in state.players]
    deltas = calculate_scores(boards)
    for player, delta in zip(state.players, deltas):
        player.score += delta

    for player in state.players:
        if player.is_fantasy:
            cards = 14 if _qualifies_for_reentry(player.board) else None
            player.next_fantasy_cards = cards
        else:
            player.next_fantasy_cards = _fantasy_entry_cards(player.board)

    state.phase = Phase.DONE
    return state


def _fantasy_entry_cards(board: PlayerBoard) -> int | None:
    """첫 FL 진입 카드 수. QQ=14, KK=15, AA=16, 트립스=17. 미달 시 None."""
    if board.is_foul or len(board.top) != 3:
        return None
    rank, (high, *_) = evaluate(board.top)
    if rank == HandRank.THREE_OF_A_KIND:
        return 17
    if rank == HandRank.ONE_PAIR:
        if high == 14:
            return 16
        if high == 13:
            return 15
        if high == 12:
            return 14
    return None


def _qualifies_for_reentry(board: PlayerBoard) -> bool:
    """FL 연속 진입: 탑 트립스 이상 OR 바텀 포카드 이상."""
    if board.is_foul:
        return False
    top_rank, _ = evaluate(board.top)
    bottom_rank, _ = evaluate(board.bottom)
    return (
        top_rank >= HandRank.THREE_OF_A_KIND or bottom_rank >= HandRank.FOUR_OF_A_KIND
    )
