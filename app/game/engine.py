from app.game.board import PlayerBoard
from app.game.card import Card, Deck
from app.game.hand import evaluate
from app.game.rules import PINEAPPLE_OFC, Ruleset
from app.game.scoring import calculate_scores
from app.game.state import GameState, Phase, PlayerState


def create_game(
    game_id: str,
    player_ids: list[str],
    dealer_idx: int = 0,
    fantasy_players: dict[str, int] | None = None,
    rules: Ruleset = PINEAPPLE_OFC,
) -> GameState:
    """
    fantasy_players: {player_id: card_count} — FL로 시작하는 플레이어와 받을 카드 수.
    """
    if not (2 <= len(player_ids) <= 3):
        raise ValueError("Player count must be 2 or 3")

    deck = Deck()
    players = [PlayerState(pid, score=rules.starting_score) for pid in player_ids]

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
        is_bonus_round=bool(fantasy_set),
    )

    if fantasy_set:
        state.phase = Phase.FANTASY_TURN
        state.current_player_idx = _first_incomplete_fantasy_idx(state)
    else:
        state.phase = Phase.FIRST_TURN
        state.current_player_idx = (dealer_idx + 1) % len(player_ids)
        _deal_to_current(state, rules)

    return state


def start_next_round(state: GameState, rules: Ruleset = PINEAPPLE_OFC) -> GameState:
    """DONE 라운드에서 다음 라운드로 전환.

    FL 보유자가 있으면 보너스 라운드(round_number 유지), 아니면 일반 라운드(+1).
    """
    if state.phase != Phase.DONE:
        raise ValueError(f"Cannot advance from phase {state.phase}")

    fl_carryover = {
        p.player_id: p.next_fantasy_cards
        for p in state.players
        if p.next_fantasy_cards is not None
    }
    is_bonus = bool(fl_carryover)

    state.deck = Deck()
    for p in state.players:
        p.board = PlayerBoard()
        p.hand = []
        p.is_fantasy = False
        p.next_fantasy_cards = None

    for p in state.players:
        if p.player_id in fl_carryover:
            p.is_fantasy = True
            p.hand = state.deck.deal(fl_carryover[p.player_id])

    if is_bonus:
        state.is_bonus_round = True
    else:
        state.is_bonus_round = False
        state.round_number += 1
        state.dealer_idx = (state.dealer_idx + 1) % state.player_count

    if is_bonus:
        state.phase = Phase.FANTASY_TURN
        state.current_player_idx = _first_incomplete_fantasy_idx(state)
    else:
        state.phase = Phase.FIRST_TURN
        state.current_player_idx = (state.dealer_idx + 1) % state.player_count
        _deal_to_current(state, rules)

    return state


def place_fantasy_turn(
    state: GameState,
    player_id: str,
    placements: dict[str, list[Card]],
    discards: list[Card],
    rules: Ruleset = PINEAPPLE_OFC,
) -> GameState:
    """FL 턴: N장 중 13장 배치, 나머지 버림. FL 플레이어 간 동시 진행."""
    if state.phase != Phase.FANTASY_TURN:
        raise ValueError("Not in fantasy turn phase")

    player = next((p for p in state.players if p.player_id == player_id), None)
    if player is None or not player.is_fantasy or player.board.is_complete:
        raise ValueError(f"Player {player_id} is not an eligible FL player")

    placed = [c for cards in placements.values() for c in cards]

    if len(placed) != rules.fantasy_board_size:
        raise ValueError(f"Must place exactly {rules.fantasy_board_size} cards")
    if set(placed + discards) != set(player.hand):
        raise ValueError("Cards must come from hand")

    for row, cards in placements.items():
        player.board.place(cards, row)
    player.hand = []

    return _advance_fantasy(state, rules)


def place_first_turn(
    state: GameState,
    placements: dict[str, list[Card]],
    rules: Ruleset = PINEAPPLE_OFC,
) -> GameState:
    """첫 턴: 5장을 top/middle/bottom에 배치."""
    if state.phase != Phase.FIRST_TURN:
        raise ValueError("Not in first turn phase")

    _apply_placements(state.current_player, placements)
    return _advance(state, rules)


def place_normal_turn(
    state: GameState,
    placements: dict[str, list[Card]],
    discard: Card,
    rules: Ruleset = PINEAPPLE_OFC,
) -> GameState:
    """일반 턴: 3장 중 2장 배치, 1장 버림."""
    if state.phase != Phase.NORMAL_TURN:
        raise ValueError("Not in normal turn phase")

    player = state.current_player
    placed = [c for cards in placements.values() for c in cards]
    expected_placed = rules.normal_turn_cards - rules.normal_turn_discards

    if len(placed) != expected_placed or discard not in player.hand:
        raise ValueError(
            f"Must place exactly {expected_placed} cards and discard "
            f"{rules.normal_turn_discards} from hand"
        )
    if set(placed + [discard]) != set(player.hand):
        raise ValueError("Cards must come from current hand")

    _apply_placements(player, placements)
    return _advance(state, rules)


# ── 내부 헬퍼 ──────────────────────────────────────────────────────────────────


def _apply_placements(player: PlayerState, placements: dict[str, list[Card]]) -> None:
    for row, cards in placements.items():
        player.board.place(cards, row)
    player.hand = []


def _deal_to_current(state: GameState, rules: Ruleset) -> None:
    n = (
        rules.first_turn_cards
        if state.phase == Phase.FIRST_TURN
        else rules.normal_turn_cards
    )
    state.current_player.hand = state.deck.deal(n)


def _first_incomplete_fantasy_idx(state: GameState) -> int:
    start = (state.dealer_idx + 1) % state.player_count
    for i in range(state.player_count):
        idx = (start + i) % state.player_count
        p = state.players[idx]
        if p.is_fantasy and not p.board.is_complete:
            return idx
    raise RuntimeError("No incomplete fantasy player found")


def _advance_fantasy(state: GameState, rules: Ruleset) -> GameState:
    """FL 동시 진행: 미완 FL이 남아있으면 유지, 모두 완료되면 FIRST_TURN으로 전환."""
    start = (state.dealer_idx + 1) % state.player_count
    for i in range(state.player_count):
        idx = (start + i) % state.player_count
        p = state.players[idx]
        if p.is_fantasy and not p.board.is_complete:
            state.current_player_idx = idx  # 표시용; 실제 둘 사람은 FL+미완 누구나
            return state

    # 모든 FL 플레이어 완료 → 일반 플레이어 첫 턴 시작
    for i in range(state.player_count):
        idx = (start + i) % state.player_count
        if not state.players[idx].is_fantasy:
            state.phase = Phase.FIRST_TURN
            state.current_player_idx = idx
            _deal_to_current(state, rules)
            return state

    # 전원 FL → 바로 채점
    return _finalize(state, rules)


def _advance(state: GameState, rules: Ruleset) -> GameState:
    """첫 턴/일반 턴 배치 완료 후 다음 상태로 전환."""
    if state.phase == Phase.FIRST_TURN:
        return _advance_first_turn(state, rules)
    return _advance_normal_turn(state, rules)


def _advance_first_turn(state: GameState, rules: Ruleset) -> GameState:
    # 보드가 비어있는 일반 플레이어 = 아직 첫 턴 미완
    probe = state.next_player_idx()
    for _ in range(state.player_count - 1):
        p = state.players[probe]
        if not p.is_fantasy and p.board.is_empty:
            state.current_player_idx = probe
            _deal_to_current(state, rules)
            return state
        probe = (probe + 1) % state.player_count

    # 모든 일반 플레이어 첫 턴 완료 → NORMAL_TURN
    state.phase = Phase.NORMAL_TURN
    return _advance_normal_turn(state, rules)


def _advance_normal_turn(state: GameState, rules: Ruleset) -> GameState:
    # 보드 미완성 플레이어 순서대로 (FL 플레이어는 이미 완성되어 자동 건너뜀)
    probe = state.next_player_idx()
    for _ in range(state.player_count):
        if not state.players[probe].board.is_complete:
            state.current_player_idx = probe
            _deal_to_current(state, rules)
            return state
        probe = (probe + 1) % state.player_count

    return _finalize(state, rules)


def _finalize(state: GameState, rules: Ruleset) -> GameState:
    state.phase = Phase.SCORING
    boards = [p.board for p in state.players]
    deltas = calculate_scores(boards, rules)
    for player, delta in zip(state.players, deltas):
        player.score += delta

    for player in state.players:
        if player.is_fantasy:
            qualifies = _qualifies_for_reentry(player.board, rules)
            player.next_fantasy_cards = (
                rules.fantasy_reentry_cards if qualifies else None
            )
        else:
            player.next_fantasy_cards = _fantasy_entry_cards(player.board, rules)

    eliminated = any(p.score <= rules.eliminate_at for p in state.players)
    fl_carryover = any(p.next_fantasy_cards is not None for p in state.players)
    # 일반 라운드 한도 도달 후라도 FL 자격자가 있으면 보너스 라운드까지 마저 진행한다.
    reached_max = state.round_number >= rules.max_rounds
    match_over = eliminated or (reached_max and not fl_carryover)
    state.phase = Phase.GAME_OVER if match_over else Phase.DONE
    return state


def _fantasy_entry_cards(
    board: PlayerBoard, rules: Ruleset = PINEAPPLE_OFC
) -> int | None:
    """첫 FL 진입 카드 수. 미달 시 None. fantasy_entry 순서대로 첫 매칭 적용."""
    if board.is_foul or len(board.top) != rules.top_size:
        return None
    hv = evaluate(board.top)
    for rule in rules.fantasy_entry:
        if hv.rank == rule.hand_rank and hv.high_card >= rule.min_high:
            return rule.cards
    return None


def _qualifies_for_reentry(board: PlayerBoard, rules: Ruleset = PINEAPPLE_OFC) -> bool:
    """FL 연속 진입: 탑이 reentry_top_min 이상 OR 바텀이 reentry_bottom_min 이상."""
    if board.is_foul:
        return False
    return (
        evaluate(board.top).rank >= rules.fantasy_reentry_top_min
        or evaluate(board.bottom).rank >= rules.fantasy_reentry_bottom_min
    )
