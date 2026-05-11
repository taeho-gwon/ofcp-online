from typing import Literal

from pydantic import BaseModel, Field

from app.game.board import PlayerBoard
from app.game.card import Card, Rank, Suit
from app.game.hand import HandValue, format_hand_value
from app.game.rules import PINEAPPLE_OFC, Ruleset
from app.game.scoring import (
    head_to_head_detail,
    royalty_bottom,
    royalty_middle,
    royalty_top,
    total_royalty,
)
from app.game.state import GameState, Phase

Row = Literal["top", "middle", "bottom"]


class CardSchema(BaseModel):
    rank: int = Field(ge=2, le=14)
    suit: int = Field(ge=1, le=4)

    def to_card(self) -> Card:
        return Card(Rank(self.rank), Suit(self.suit))

    @classmethod
    def from_card(cls, card: Card) -> "CardSchema":
        return cls(rank=card.rank.value, suit=card.suit.value)


class CreateGameRequest(BaseModel):
    player_ids: list[str] = Field(min_length=2, max_length=3)
    dealer_idx: int = 0
    fantasy_players: dict[str, int] | None = None


class FirstTurnMoveRequest(BaseModel):
    player_id: str
    placements: dict[Row, list[CardSchema]]


class NormalTurnMoveRequest(BaseModel):
    player_id: str
    placements: dict[Row, list[CardSchema]]
    discard: CardSchema


class FantasyTurnMoveRequest(BaseModel):
    player_id: str
    placements: dict[Row, list[CardSchema]]
    discards: list[CardSchema]


class BoardResponse(BaseModel):
    top: list[CardSchema]
    middle: list[CardSchema]
    bottom: list[CardSchema]


class HandEvaluationSchema(BaseModel):
    rank: int
    rank_label: str
    label: str
    royalty: int


class BoardEvaluationSchema(BaseModel):
    top: HandEvaluationSchema
    middle: HandEvaluationSchema
    bottom: HandEvaluationSchema
    is_foul: bool
    total_royalty: int


class MatchupSchema(BaseModel):
    a_id: str
    b_id: str
    top_line_a: int
    top_royalty_a: int
    top_royalty_b: int
    middle_line_a: int
    middle_royalty_a: int
    middle_royalty_b: int
    bottom_line_a: int
    bottom_royalty_a: int
    bottom_royalty_b: int
    scoop_a: int
    foul_a: bool
    foul_b: bool
    total_a: int


class PlayerStateResponse(BaseModel):
    player_id: str
    board: BoardResponse
    hand: list[CardSchema]  # 본인이 아니면 빈 리스트로 마스킹
    hand_count: int  # 마스킹과 무관하게 장수는 노출
    score: int
    is_fantasy: bool
    next_fantasy_cards: int | None
    evaluation: BoardEvaluationSchema | None = None
    last_round_delta: int | None = None


class GameStateResponse(BaseModel):
    game_id: str
    phase: str
    dealer_idx: int
    current_player_idx: int
    current_player_id: str
    round_number: int
    is_bonus_round: bool
    max_rounds: int
    is_game_over: bool
    players: list[PlayerStateResponse]
    matchups: list[MatchupSchema] | None = None


def to_placements(
    raw: dict[Row, list[CardSchema]],
) -> dict[str, list[Card]]:
    return {row: [c.to_card() for c in cards] for row, cards in raw.items()}


def _eval_row(hv: HandValue, royalty: int) -> HandEvaluationSchema:
    return HandEvaluationSchema(
        rank=int(hv.rank),
        rank_label=hv.rank.name,
        label=format_hand_value(hv),
        royalty=royalty,
    )


def _board_evaluation(
    board: PlayerBoard, rules: Ruleset = PINEAPPLE_OFC
) -> BoardEvaluationSchema:
    return BoardEvaluationSchema(
        top=_eval_row(board.top_value(), royalty_top(board, rules)),
        middle=_eval_row(board.middle_value(), royalty_middle(board, rules)),
        bottom=_eval_row(board.bottom_value(), royalty_bottom(board, rules)),
        is_foul=board.is_foul,
        total_royalty=total_royalty(board, rules),
    )


def _compute_done_extras(
    state: GameState, rules: Ruleset = PINEAPPLE_OFC
) -> tuple[list[MatchupSchema], dict[str, int]]:
    """라운드 채점 직후(DONE/GAME_OVER)에 매치업 분해와 플레이어별 라운드 델타 산출."""
    matchups: list[MatchupSchema] = []
    deltas: dict[str, int] = {p.player_id: 0 for p in state.players}
    n = len(state.players)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = state.players[i], state.players[j]
            d = head_to_head_detail(a.board, b.board, rules)
            matchups.append(
                MatchupSchema(
                    a_id=a.player_id,
                    b_id=b.player_id,
                    top_line_a=d.top_line,
                    top_royalty_a=d.top_royalty_a,
                    top_royalty_b=d.top_royalty_b,
                    middle_line_a=d.middle_line,
                    middle_royalty_a=d.middle_royalty_a,
                    middle_royalty_b=d.middle_royalty_b,
                    bottom_line_a=d.bottom_line,
                    bottom_royalty_a=d.bottom_royalty_a,
                    bottom_royalty_b=d.bottom_royalty_b,
                    scoop_a=d.scoop,
                    foul_a=d.foul_a,
                    foul_b=d.foul_b,
                    total_a=d.total,
                )
            )
            deltas[a.player_id] += d.total
            deltas[b.player_id] -= d.total
    return matchups, deltas


def serialize_state(
    state: GameState,
    viewer_id: str | None = None,
    rules: Ruleset = PINEAPPLE_OFC,
) -> GameStateResponse:
    """viewer_id가 None이면 모든 hand 노출(서버 내부용). 아니면 본인 hand만 노출."""
    show_result = state.phase in (Phase.DONE, Phase.GAME_OVER)
    matchups: list[MatchupSchema] | None = None
    deltas: dict[str, int] = {}
    if show_result:
        matchups, deltas = _compute_done_extras(state, rules)

    players = []
    for p in state.players:
        is_viewer = viewer_id is None or p.player_id == viewer_id
        evaluation = _board_evaluation(p.board, rules) if show_result else None
        last_delta = deltas.get(p.player_id) if show_result else None
        players.append(
            PlayerStateResponse(
                player_id=p.player_id,
                board=BoardResponse(
                    top=[CardSchema.from_card(c) for c in p.board.top],
                    middle=[CardSchema.from_card(c) for c in p.board.middle],
                    bottom=[CardSchema.from_card(c) for c in p.board.bottom],
                ),
                hand=[CardSchema.from_card(c) for c in p.hand] if is_viewer else [],
                hand_count=len(p.hand),
                score=p.score,
                is_fantasy=p.is_fantasy,
                next_fantasy_cards=p.next_fantasy_cards,
                evaluation=evaluation,
                last_round_delta=last_delta,
            )
        )

    return GameStateResponse(
        game_id=state.game_id,
        phase=state.phase.value,
        dealer_idx=state.dealer_idx,
        current_player_idx=state.current_player_idx,
        current_player_id=state.current_player.player_id,
        round_number=state.round_number,
        is_bonus_round=state.is_bonus_round,
        max_rounds=rules.max_rounds,
        is_game_over=state.phase == Phase.GAME_OVER,
        players=players,
        matchups=matchups,
    )
