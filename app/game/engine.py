from app.game.board import PlayerBoard
from app.game.card import Card, Deck
from app.game.hand import HandRank, evaluate
from app.game.scoring import calculate_scores
from app.game.state import GameState, Phase, PlayerState

FIRST_TURN_CARDS = 5
NORMAL_TURN_CARDS = 3


def create_game(game_id: str, player_ids: list[str], dealer_idx: int = 0) -> GameState:
    if not (2 <= len(player_ids) <= 3):
        raise ValueError("Player count must be 2 or 3")

    state = GameState(
        game_id=game_id,
        players=[PlayerState(pid) for pid in player_ids],
        deck=Deck(),
        dealer_idx=dealer_idx,
        current_player_idx=(dealer_idx + 1) % len(player_ids),
        phase=Phase.FIRST_TURN,
    )
    _deal_to_current(state)
    return state


def place_first_turn(state: GameState, placements: dict[str, list[Card]]) -> GameState:
    """첫 턴: 5장을 top/middle/bottom에 배치. placements = {"top": [...], ...}"""
    if state.phase != Phase.FIRST_TURN:
        raise ValueError("Not in first turn phase")

    player = state.current_player
    _apply_placements(player, placements, discard=None)

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

    _apply_placements(player, placements, discard=discard)

    return _advance(state)


def _apply_placements(
    player: PlayerState,
    placements: dict[str, list[Card]],
    discard: Card | None,
) -> None:
    for row, cards in placements.items():
        player.board.place(cards, row)
    player.hand = []


def _advance(state: GameState) -> GameState:
    """다음 플레이어로 이동하거나 페이즈를 전환한다."""
    next_idx = state.next_player_idx()

    # 아직 첫 턴을 마치지 않은 플레이어가 있으면 계속
    if state.phase == Phase.FIRST_TURN:
        if next_idx != (state.dealer_idx + 1) % state.player_count:
            state.current_player_idx = next_idx
            _deal_to_current(state)
            return state
        # 한 바퀴 돌았으면 일반 턴으로
        state.phase = Phase.NORMAL_TURN
        state.current_player_idx = (state.dealer_idx + 1) % state.player_count
        _deal_to_current(state)
        return state

    # 일반 턴: 보드가 완성된 플레이어 건너뜀
    probe = next_idx
    for _ in range(state.player_count):
        if not state.players[probe].board.is_complete:
            state.current_player_idx = probe
            _deal_to_current(state)
            return state
        probe = (probe + 1) % state.player_count

    # 전원 완성 → 점수 계산
    return _finalize(state)


def _deal_to_current(state: GameState) -> None:
    n = FIRST_TURN_CARDS if state.phase == Phase.FIRST_TURN else NORMAL_TURN_CARDS
    state.current_player.hand = state.deck.deal(n)


def _finalize(state: GameState) -> GameState:
    state.phase = Phase.SCORING
    boards = [p.board for p in state.players]
    deltas = calculate_scores(boards)
    for player, delta in zip(state.players, deltas):
        player.score += delta

    # FantasyLand 진입 여부 체크
    for player in state.players:
        player.in_fantasy = _qualifies_for_fantasy(player.board)

    state.phase = Phase.DONE
    return state


def _qualifies_for_fantasy(board: PlayerBoard) -> bool:
    if board.is_foul or len(board.top) != 3:
        return False
    rank, (high, *_) = evaluate(board.top)
    # QQ 이상 페어 또는 트립스
    return (
        rank == HandRank.ONE_PAIR and high >= 12
    ) or rank == HandRank.THREE_OF_A_KIND
