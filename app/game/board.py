from app.game.card import Card
from app.game.hand import HandValue, evaluate


class PlayerBoard:
    TOP_SIZE = 3
    MIDDLE_SIZE = 5
    BOTTOM_SIZE = 5

    def __init__(self) -> None:
        self.top: list[Card] = []
        self.middle: list[Card] = []
        self.bottom: list[Card] = []

    @property
    def is_complete(self) -> bool:
        return (
            len(self.top) == self.TOP_SIZE
            and len(self.middle) == self.MIDDLE_SIZE
            and len(self.bottom) == self.BOTTOM_SIZE
        )

    @property
    def is_empty(self) -> bool:
        return not (self.top or self.middle or self.bottom)

    @property
    def is_foul(self) -> bool:
        if not self.is_complete:
            return False
        # bottom >= middle >= top (강도 기준)
        return not (
            evaluate(self.bottom) >= evaluate(self.middle) >= evaluate(self.top)
        )

    def place(self, cards: list[Card], row: str) -> None:
        slot = self._slot(row)
        limit = getattr(self, f"{row.upper()}_SIZE")
        if len(slot) + len(cards) > limit:
            raise ValueError(f"Row '{row}' cannot hold {len(slot) + len(cards)} cards")
        slot.extend(cards)

    def top_value(self) -> HandValue:
        return evaluate(self.top)

    def middle_value(self) -> HandValue:
        return evaluate(self.middle)

    def bottom_value(self) -> HandValue:
        return evaluate(self.bottom)

    def _slot(self, row: str) -> list[Card]:
        match row:
            case "top":
                return self.top
            case "middle":
                return self.middle
            case "bottom":
                return self.bottom
            case _:
                raise ValueError(f"Invalid row: {row}")

    def to_dict(self) -> dict:
        return {
            "top": [c.to_dict() for c in self.top],
            "middle": [c.to_dict() for c in self.middle],
            "bottom": [c.to_dict() for c in self.bottom],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "PlayerBoard":
        board = cls()
        board.top = [Card.from_dict(c) for c in data["top"]]
        board.middle = [Card.from_dict(c) for c in data["middle"]]
        board.bottom = [Card.from_dict(c) for c in data["bottom"]]
        return board
