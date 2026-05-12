import uuid
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field


@dataclass
class RoomMember:
    user_id: str  # UUID 문자열
    nickname: str  # 입장 시점 스냅샷
    ready: bool = False

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "RoomMember":
        return cls(**data)


@dataclass
class Room:
    code: str
    host_user_id: str
    ruleset_name: str  # RULESETS 키
    max_seats: int  # 2 또는 3
    members: list[RoomMember] = field(default_factory=list)
    game_id: str | None = None
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "host_user_id": self.host_user_id,
            "ruleset_name": self.ruleset_name,
            "max_seats": self.max_seats,
            "members": [m.to_dict() for m in self.members],
            "game_id": self.game_id,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Room":
        return cls(
            code=data["code"],
            host_user_id=data["host_user_id"],
            ruleset_name=data["ruleset_name"],
            max_seats=data["max_seats"],
            members=[RoomMember.from_dict(m) for m in data["members"]],
            game_id=data.get("game_id"),
            created_at=data["created_at"],
        )

    def find_member(self, user_id: str) -> RoomMember | None:
        return next((m for m in self.members if m.user_id == user_id), None)


# ── REST schemas ────────────────────────────────────────────────────────────


class CreateRoomRequest(BaseModel):
    ruleset_name: str = "pineapple"
    max_seats: int = Field(ge=2, le=3)


class RoomMemberResponse(BaseModel):
    user_id: uuid.UUID
    nickname: str
    ready: bool


class RoomResponse(BaseModel):
    code: str
    host_user_id: uuid.UUID
    ruleset_name: str
    max_seats: int
    members: list[RoomMemberResponse]
    game_id: str | None
    created_at: str


def serialize_room(room: Room) -> RoomResponse:
    return RoomResponse(
        code=room.code,
        host_user_id=uuid.UUID(room.host_user_id),
        ruleset_name=room.ruleset_name,
        max_seats=room.max_seats,
        members=[
            RoomMemberResponse(
                user_id=uuid.UUID(m.user_id), nickname=m.nickname, ready=m.ready
            )
            for m in room.members
        ],
        game_id=room.game_id,
        created_at=room.created_at,
    )


# ── WS messages ─────────────────────────────────────────────────────────────


class WsSetReady(BaseModel):
    action: Literal["set_ready"]
    ready: bool


class WsLeave(BaseModel):
    action: Literal["leave"]
