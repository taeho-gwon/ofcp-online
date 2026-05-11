from dataclasses import dataclass, field
from enum import StrEnum

from app.game.board import PlayerBoard
from app.game.card import Card, Deck


class Phase(StrEnum):
    FIRST_TURN = "first_turn"
    NORMAL_TURN = "normal_turn"
    SCORING = "scoring"
    DONE = "done"


@dataclass
class PlayerState:
    player_id: str
    board: PlayerBoard = field(default_factory=PlayerBoard)
    hand: list[Card] = field(default_factory=list)  # 현재 받은 카드
    score: int = 0
    in_fantasy: bool = False  # 다음 라운드 FantasyLand 진입 여부

    def to_dict(self) -> dict:
        return {
            "player_id": self.player_id,
            "board": self.board.to_dict(),
            "hand": [c.to_dict() for c in self.hand],
            "score": self.score,
            "in_fantasy": self.in_fantasy,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "PlayerState":
        ps = cls(player_id=data["player_id"])
        ps.board = PlayerBoard.from_dict(data["board"])
        ps.hand = [Card.from_dict(c) for c in data["hand"]]
        ps.score = data["score"]
        ps.in_fantasy = data["in_fantasy"]
        return ps


@dataclass
class GameState:
    game_id: str
    players: list[PlayerState]
    deck: Deck = field(default_factory=Deck)
    dealer_idx: int = 0
    current_player_idx: int = 0
    phase: Phase = Phase.FIRST_TURN

    @property
    def current_player(self) -> PlayerState:
        return self.players[self.current_player_idx]

    @property
    def player_count(self) -> int:
        return len(self.players)

    def next_player_idx(self) -> int:
        return (self.current_player_idx + 1) % self.player_count

    def to_dict(self) -> dict:
        return {
            "game_id": self.game_id,
            "players": [p.to_dict() for p in self.players],
            "deck": self.deck.to_dict(),
            "dealer_idx": self.dealer_idx,
            "current_player_idx": self.current_player_idx,
            "phase": self.phase,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "GameState":
        gs = cls.__new__(cls)
        gs.game_id = data["game_id"]
        gs.players = [PlayerState.from_dict(p) for p in data["players"]]
        gs.deck = Deck.from_dict(data["deck"])
        gs.dealer_idx = data["dealer_idx"]
        gs.current_player_idx = data["current_player_idx"]
        gs.phase = Phase(data["phase"])
        return gs
