#!/usr/bin/env python3
"""OFC 게임 CLI 테스트 도구."""

from app.game.board import PlayerBoard
from app.game.card import Card, Rank, Suit
from app.game.engine import (
    create_game,
    place_fantasy_turn,
    place_first_turn,
    place_normal_turn,
)
from app.game.hand import evaluate
from app.game.scoring import royalty_bottom, royalty_middle, royalty_top
from app.game.state import GameState, Phase

RANK_MAP = {
    "2": Rank.TWO,
    "3": Rank.THREE,
    "4": Rank.FOUR,
    "5": Rank.FIVE,
    "6": Rank.SIX,
    "7": Rank.SEVEN,
    "8": Rank.EIGHT,
    "9": Rank.NINE,
    "T": Rank.TEN,
    "J": Rank.JACK,
    "Q": Rank.QUEEN,
    "K": Rank.KING,
    "A": Rank.ACE,
}
SUIT_MAP = {"C": Suit.CLUBS, "D": Suit.DIAMONDS, "H": Suit.HEARTS, "S": Suit.SPADES}
RANK_STR = {v: k for k, v in RANK_MAP.items()}
SUIT_STR = {v: k for k, v in SUIT_MAP.items()}
ROW_ALIAS = {
    "top": "top",
    "t": "top",
    "mid": "middle",
    "middle": "middle",
    "m": "middle",
    "bot": "bottom",
    "bottom": "bottom",
    "b": "bottom",
}


def fmt(c: Card) -> str:
    return f"{RANK_STR[c.rank]}{SUIT_STR[c.suit]}"


def parse_card(s: str) -> Card:
    s = s.strip().upper()
    if len(s) != 2 or s[0] not in RANK_MAP or s[1] not in SUIT_MAP:
        raise ValueError(f"카드 형식 오류: '{s}' (예: AS, TC, 2H)")
    return Card(RANK_MAP[s[0]], SUIT_MAP[s[1]])


def print_separator():
    print("─" * 52)


def print_board(state: GameState):
    print_separator()
    for i, player in enumerate(state.players):
        b = player.board
        marker = " ◀" if i == state.current_player_idx else ""
        foul = " [FOUL]" if b.is_complete and b.is_foul else ""
        print(f"  {player.player_id}{foul}{marker}  (score: {player.score:+d})")
        top = " ".join(fmt(c) for c in b.top) or "—"
        mid = " ".join(fmt(c) for c in b.middle) or "—"
        bot = " ".join(fmt(c) for c in b.bottom) or "—"
        print(f"    TOP   [{len(b.top)}/3] : {top}")
        print(f"    MID   [{len(b.middle)}/5] : {mid}")
        print(f"    BOT   [{len(b.bottom)}/5] : {bot}")
        if i < len(state.players) - 1:
            print()
    print_separator()


def print_hand(state: GameState):
    hand = state.current_player.hand
    indexed = "  ".join(f"[{i}]{fmt(c)}" for i, c in enumerate(hand))
    print(f"손패 : {indexed}")


def slots_left(board: PlayerBoard) -> dict[str, int]:
    return {
        "top": 3 - len(board.top),
        "middle": 5 - len(board.middle),
        "bottom": 5 - len(board.bottom),
    }


def parse_placements_and_discard(
    line: str, hand: list[Card], need_discard: bool
) -> tuple[dict[str, list[Card]], Card | None]:
    """
    입력 파싱. 형식 예:
      top AS KC  middle 2D 3H 4S  bottom 5C 6D 7H 8S 9C   (첫 턴, discard 없음)
      top AS  middle 2D  discard 3H                        (일반 턴)
    """
    tokens = line.split()
    placements: dict[str, list[Card]] = {}
    discard: Card | None = None
    current: str | None = None

    hand_set = {fmt(c): c for c in hand}

    for t in tokens:
        tl = t.lower()
        if tl in ROW_ALIAS:
            current = ROW_ALIAS[tl]
            placements.setdefault(current, [])
        elif tl in ("discard", "d", "disc", "버림"):
            current = "_discard"
        else:
            c = parse_card(t)
            key = fmt(c)
            if key not in hand_set:
                raise ValueError(f"{key}는 손패에 없습니다.")
            if current == "_discard":
                discard = hand_set[key]
            elif current is not None:
                placements[current].append(hand_set[key])
            else:
                raise ValueError("행(top/mid/bot) 또는 discard를 먼저 입력하세요.")

    if need_discard and discard is None:
        raise ValueError("버릴 카드(discard)를 지정하세요.")

    return placements, discard


def prompt_first_turn(state: GameState) -> dict[str, list[Card]]:
    hand = state.current_player.hand
    sl = slots_left(state.current_player.board)
    slots_info = f"top:{sl['top']} mid:{sl['middle']} bot:{sl['bottom']}"
    print(f"첫 턴 — 5장 전부 배치  (빈 슬롯 {slots_info})")
    print("입력 예) top AS KC QS  mid 2D 3H  bot 4S 5C 6D")

    while True:
        try:
            line = input("> ").strip()
            if not line:
                continue
            placements, _ = parse_placements_and_discard(line, hand, need_discard=False)
            placed = [c for cs in placements.values() for c in cs]
            if len(placed) != 5:
                print(f"  5장을 모두 배치해야 합니다. (현재 {len(placed)}장)")
                continue
            return placements
        except ValueError as e:
            print(f"  오류: {e}")


def prompt_normal_turn(state: GameState) -> tuple[dict[str, list[Card]], Card]:
    hand = state.current_player.hand
    sl = slots_left(state.current_player.board)
    slots_info = f"top:{sl['top']} mid:{sl['middle']} bot:{sl['bottom']}"
    print(f"일반 턴 — 2장 배치 + 1장 버림  (빈 슬롯 {slots_info})")
    print("입력 예) mid AS  bot 2D  discard 3H")

    while True:
        try:
            line = input("> ").strip()
            if not line:
                continue
            placements, discard = parse_placements_and_discard(
                line, hand, need_discard=True
            )
            placed = [c for cs in placements.values() for c in cs]
            if len(placed) != 2:
                print(f"  정확히 2장을 배치해야 합니다. (현재 {len(placed)}장)")
                continue
            return placements, discard  # type: ignore[return-value]
        except ValueError as e:
            print(f"  오류: {e}")


def prompt_fantasy_turn(state: GameState) -> tuple[dict[str, list[Card]], list[Card]]:
    hand = state.current_player.hand
    n_discard = len(hand) - 13
    print(f"FantasyLand — {len(hand)}장 중 13장 배치 + {n_discard}장 버림")
    print("입력 예) top AS KC QS  mid 2D 3H 4S 5C 6D  bot 7H 8S 9C TC JD  discard KH")

    while True:
        try:
            line = input("> ").strip()
            if not line:
                continue
            need_disc = n_discard > 0
            placements, discard = parse_placements_and_discard(
                line, hand, need_discard=need_disc
            )
            placed = [c for cs in placements.values() for c in cs]
            if len(placed) != 13:
                print(f"  정확히 13장을 배치해야 합니다. (현재 {len(placed)}장)")
                continue
            discards = [discard] if discard else []
            if len(discards) != n_discard:
                print(f"  {n_discard}장을 버려야 합니다.")
                continue
            return placements, discards
        except ValueError as e:
            print(f"  오류: {e}")


def print_result(state: GameState):
    print("\n" + "=" * 52)
    print("  게임 종료")
    print("=" * 52)
    for p in state.players:
        b = p.board
        foul_str = "  [FOUL]" if b.is_foul else ""
        print(f"\n  {p.player_id}{foul_str}")
        if not b.is_foul:
            top_rank = evaluate(b.top).rank.name
            mid_rank = evaluate(b.middle).rank.name
            bot_rank = evaluate(b.bottom).rank.name
            rt = royalty_top(b)
            rm = royalty_middle(b)
            rb = royalty_bottom(b)
            print(
                f"    TOP   : {' '.join(fmt(c) for c in b.top)}"
                f"  → {top_rank}" + (f"  (+{rt})" if rt else "")
            )
            print(
                f"    MID   : {' '.join(fmt(c) for c in b.middle)}"
                f"  → {mid_rank}" + (f"  (+{rm})" if rm else "")
            )
            print(
                f"    BOT   : {' '.join(fmt(c) for c in b.bottom)}"
                f"  → {bot_rank}" + (f"  (+{rb})" if rb else "")
            )
        print(f"    최종 점수: {p.score:+d}")
        if p.next_fantasy_cards:
            print(f"    ★ 다음 라운드 FantasyLand ({p.next_fantasy_cards}장)!")
    print()


def main():
    print("=" * 52)
    print("  OFC Online — CLI 테스트")
    print("=" * 52)

    raw = input("플레이어 수 [2]: ").strip()
    n = int(raw) if raw in ("2", "3") else 2

    player_ids = []
    for i in range(n):
        raw = input(f"플레이어 {i + 1} 이름 [{f'P{i + 1}'}]: ").strip()
        player_ids.append(raw or f"P{i + 1}")

    state = create_game("cli", player_ids)

    while state.phase != Phase.DONE:
        print()
        print_board(state)
        cp = state.current_player
        print(f"  [{cp.player_id}의 차례]  phase={state.phase}")
        print()
        print_hand(state)
        print()

        if state.phase == Phase.FANTASY_TURN:
            placements, discards = prompt_fantasy_turn(state)
            state = place_fantasy_turn(state, placements, discards)
        elif state.phase == Phase.FIRST_TURN:
            placements = prompt_first_turn(state)
            state = place_first_turn(state, placements)
        elif state.phase == Phase.NORMAL_TURN:
            placements, discard = prompt_normal_turn(state)
            state = place_normal_turn(state, placements, discard)

    print_board(state)
    print_result(state)


if __name__ == "__main__":
    main()
