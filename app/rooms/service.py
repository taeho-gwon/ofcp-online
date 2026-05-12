import secrets

from app.game.rules import RULESETS
from app.game.service import GameService
from app.rooms.repository import RoomRepository
from app.rooms.schemas import Room, RoomMember

# ambiguous(0/O, 1/I/L) 제외한 26+10-5 = 31자
_ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_ROOM_CODE_LENGTH = 6
_CREATE_MAX_RETRIES = 5


class RoomError(Exception):
    pass


class RoomNotFoundError(RoomError):
    pass


def _generate_code() -> str:
    return "".join(
        secrets.choice(_ROOM_CODE_ALPHABET) for _ in range(_ROOM_CODE_LENGTH)
    )


class RoomService:
    def __init__(self, repo: RoomRepository, game_service: GameService) -> None:
        self._repo = repo
        self._games = game_service

    async def create(
        self,
        *,
        host_user_id: str,
        host_nickname: str,
        ruleset_name: str,
        max_seats: int,
    ) -> Room:
        if ruleset_name not in RULESETS:
            raise RoomError(f"unknown ruleset: {ruleset_name}")
        if max_seats not in (2, 3):
            raise RoomError("max_seats must be 2 or 3")

        # 방장은 별도 ready 토글 없이 "게임 시작" 버튼으로 출발시킨다.
        host = RoomMember(user_id=host_user_id, nickname=host_nickname, ready=True)
        for _ in range(_CREATE_MAX_RETRIES):
            code = _generate_code()
            room = Room(
                code=code,
                host_user_id=host_user_id,
                ruleset_name=ruleset_name,
                max_seats=max_seats,
                members=[host],
            )
            if await self._repo.create_if_absent(room):
                return room
        raise RoomError("방 코드 발급에 실패했습니다. 잠시 후 다시 시도하세요.")

    async def get(self, code: str) -> Room:
        room = await self._repo.load(code)
        if room is None:
            raise RoomNotFoundError(code)
        return room

    async def join(self, code: str, *, user_id: str, nickname: str) -> Room:
        async with self._repo.acquire_lock(code):
            room = await self._repo.load(code)
            if room is None:
                raise RoomNotFoundError(code)
            if room.game_id is not None:
                raise RoomError("이미 게임이 시작된 방입니다.")
            existing = room.find_member(user_id)
            if existing is not None:
                # 재접속 — 닉네임 변경 시 갱신.
                existing.nickname = nickname
            else:
                if len(room.members) >= room.max_seats:
                    raise RoomError("정원이 가득 찼습니다.")
                room.members.append(
                    RoomMember(user_id=user_id, nickname=nickname, ready=False)
                )
            await self._repo.save(room)
            return room

    async def leave(self, code: str, *, user_id: str) -> tuple[Room | None, bool]:
        """반환: (변경된 방, 방이 해체되었는지). 방이 해체되면 첫 항목은 None."""
        async with self._repo.acquire_lock(code):
            room = await self._repo.load(code)
            if room is None:
                raise RoomNotFoundError(code)
            member = room.find_member(user_id)
            if member is None:
                return room, False
            is_host = user_id == room.host_user_id
            if is_host:
                await self._repo.delete(code)
                return None, True
            room.members = [m for m in room.members if m.user_id != user_id]
            if not room.members:
                await self._repo.delete(code)
                return None, True
            await self._repo.save(room)
            return room, False

    async def set_ready(self, code: str, *, user_id: str, ready: bool) -> Room:
        async with self._repo.acquire_lock(code):
            room = await self._repo.load(code)
            if room is None:
                raise RoomNotFoundError(code)
            if room.game_id is not None:
                raise RoomError("이미 게임이 시작된 방입니다.")
            # 방장은 ready 토글 대상 아님 — 항상 ready 상태.
            if user_id == room.host_user_id:
                return room
            member = room.find_member(user_id)
            if member is None:
                raise RoomError("방의 멤버가 아닙니다.")
            member.ready = ready
            await self._repo.save(room)
            return room

    async def start_game(self, code: str, *, user_id: str) -> Room:
        """방장 명시적 호출. 인원 2+ 전원 ready 조건 충족 시 game 생성."""
        async with self._repo.acquire_lock(code):
            room = await self._repo.load(code)
            if room is None:
                raise RoomNotFoundError(code)
            if user_id != room.host_user_id:
                raise RoomError("방장만 게임을 시작할 수 있습니다.")
            if room.game_id is not None:
                raise RoomError("이미 게임이 시작된 방입니다.")
            if len(room.members) < 2:
                raise RoomError("최소 2명이 필요합니다.")
            if not all(m.ready for m in room.members):
                raise RoomError("아직 준비하지 않은 참가자가 있습니다.")
            state = await self._games.create_game(
                player_ids=[m.user_id for m in room.members],
                ruleset_name=room.ruleset_name,
            )
            room.game_id = state.game_id
            await self._repo.save(room)
            return room
