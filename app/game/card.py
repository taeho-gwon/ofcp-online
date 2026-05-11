import random
from enum import IntEnum


class Rank(IntEnum):
    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5
    SIX = 6
    SEVEN = 7
    EIGHT = 8
    NINE = 9
    TEN = 10
    JACK = 11
    QUEEN = 12
    KING = 13
    ACE = 14


class Suit(IntEnum):
    CLUBS = 1
    DIAMONDS = 2
    HEARTS = 3
    SPADES = 4


class Card:
    __slots__ = ("rank", "suit")

    def __init__(self, rank: Rank, suit: Suit) -> None:
        self.rank = rank
        self.suit = suit

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Card):
            return NotImplemented
        return self.rank == other.rank and self.suit == other.suit

    def __hash__(self) -> int:
        return hash((self.rank, self.suit))

    def __repr__(self) -> str:
        r = self.rank.name[0] if self.rank < Rank.TEN else self.rank.value
        return f"{r}{self.suit.name[0]}"

    def to_dict(self) -> dict:
        return {"rank": self.rank.value, "suit": self.suit.value}

    @classmethod
    def from_dict(cls, data: dict) -> "Card":
        return cls(Rank(data["rank"]), Suit(data["suit"]))


class Deck:
    def __init__(self) -> None:
        self._cards: list[Card] = [Card(rank, suit) for suit in Suit for rank in Rank]
        random.shuffle(self._cards)

    def deal(self, n: int) -> list[Card]:
        if len(self._cards) < n:
            raise ValueError("Not enough cards in deck")
        dealt, self._cards = self._cards[:n], self._cards[n:]
        return dealt

    def to_dict(self) -> dict:
        return {"cards": [c.to_dict() for c in self._cards]}

    @classmethod
    def from_dict(cls, data: dict) -> "Deck":
        deck = cls.__new__(cls)
        deck._cards = [Card.from_dict(c) for c in data["cards"]]
        return deck
