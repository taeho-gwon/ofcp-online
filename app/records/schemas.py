import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class GameListItem(BaseModel):
    game_id: str
    room_code: str | None
    ruleset: str
    started_at: datetime
    ended_at: datetime | None
    round_count: int


class GameListResponse(BaseModel):
    entries: list[GameListItem]
    limit: int
    offset: int


class GamePlayerOut(BaseModel):
    user_id: uuid.UUID
    nickname: str
    seat_idx: int
    final_score: int | None
    fouled_rounds: int
    fantasy_rounds: int


class GameDetailResponse(BaseModel):
    game_id: str
    room_code: str | None
    ruleset: str
    started_at: datetime
    ended_at: datetime | None
    round_count: int
    players: list[GamePlayerOut]


class GameEventOut(BaseModel):
    seq: int
    ts: datetime
    event_type: str
    actor_id: uuid.UUID | None
    payload: dict[str, Any]


class GameEventsResponse(BaseModel):
    game_id: str
    events: list[GameEventOut]
