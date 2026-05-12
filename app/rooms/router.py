import logging
from collections import defaultdict
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.auth.deps import get_current_user
from app.auth.jwt import InvalidTokenError, verify_access
from app.config import settings
from app.core.db import get_engine
from app.core.redis import get_redis
from app.game.repository import GameRepository
from app.game.service import GameService
from app.records import service as records_service
from app.rooms.repository import RoomLockError, RoomRepository
from app.rooms.schemas import (
    CreateRoomRequest,
    Room,
    RoomResponse,
    WsLeave,
    WsSetReady,
    serialize_room,
)
from app.rooms.service import RoomError, RoomNotFoundError, RoomService
from app.users import repository as users_repo
from app.users.models import User

logger = logging.getLogger(__name__)

rest_router = APIRouter(prefix="/rooms", tags=["rooms"])
ws_router = APIRouter()


def get_room_service(redis: Annotated[Redis, Depends(get_redis)]) -> RoomService:
    return RoomService(
        repo=RoomRepository(redis),
        game_service=GameService(
            GameRepository(redis, ttl_seconds=settings.game_ttl_seconds)
        ),
    )


ServiceDep = Annotated[RoomService, Depends(get_room_service)]


@rest_router.post("", response_model=RoomResponse, status_code=201)
async def create_room(
    req: CreateRoomRequest,
    svc: ServiceDep,
    user: Annotated[User, Depends(get_current_user)],
) -> RoomResponse:
    try:
        room = await svc.create(
            host_user_id=str(user.id),
            host_nickname=user.nickname,
            ruleset_name=req.ruleset_name,
            max_seats=req.max_seats,
        )
    except RoomError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return serialize_room(room)


@rest_router.get("/{code}", response_model=RoomResponse)
async def get_room(
    code: str,
    svc: ServiceDep,
    user: Annotated[User, Depends(get_current_user)],
) -> RoomResponse:
    try:
        room = await svc.get(code)
    except RoomNotFoundError as e:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다.") from e
    return serialize_room(room)


# ── WebSocket ───────────────────────────────────────────────────────────────


class RoomConnectionManager:
    def __init__(self) -> None:
        self._conns: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, code: str, ws: WebSocket) -> None:
        await ws.accept()
        self._conns[code].add(ws)

    def disconnect(self, code: str, ws: WebSocket) -> None:
        self._conns[code].discard(ws)
        if not self._conns[code]:
            del self._conns[code]

    async def broadcast(self, code: str, payload: dict) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._conns.get(code, set())):
            try:
                await ws.send_json(payload)
            except Exception as e:
                logger.warning("Room WS send failed: %s", e)
                dead.append(ws)
        for ws in dead:
            self.disconnect(code, ws)

    async def close_all(self, code: str, payload: dict) -> None:
        for ws in list(self._conns.get(code, set())):
            try:
                await ws.send_json(payload)
                await ws.close()
            except Exception:
                pass
        self._conns.pop(code, None)


room_manager = RoomConnectionManager()


def _room_payload(room: Room) -> dict:
    return {"type": "room", "data": serialize_room(room).model_dump(mode="json")}


@ws_router.websocket("/ws/rooms/{code}")
async def room_socket(
    websocket: WebSocket,
    code: str,
    token: Annotated[str | None, Query()] = None,
    redis: Annotated[Redis, Depends(get_redis)] = None,
) -> None:
    if not token:
        await websocket.close(code=4401, reason="unauthorized")
        return
    try:
        claims = verify_access(token)
    except InvalidTokenError:
        await websocket.close(code=4401, reason="unauthorized")
        return

    sm = async_sessionmaker(get_engine(), expire_on_commit=False, autoflush=False)
    async with sm() as session:
        user = await users_repo.get_by_id(session, claims.sub)
    if user is None:
        await websocket.close(code=4401, reason="user not found")
        return

    game_svc = GameService(GameRepository(redis, ttl_seconds=settings.game_ttl_seconds))
    svc = RoomService(repo=RoomRepository(redis), game_service=game_svc)

    # 자동 join
    try:
        room = await svc.join(code, user_id=str(user.id), nickname=user.nickname)
    except RoomNotFoundError:
        await websocket.close(code=4404, reason="room not found")
        return
    except (RoomError, RoomLockError) as e:
        await websocket.accept()
        await websocket.send_json({"type": "error", "data": {"message": str(e)}})
        await websocket.close()
        return

    await room_manager.connect(code, websocket)
    await room_manager.broadcast(code, _room_payload(room))

    try:
        while True:
            msg = await websocket.receive_json()
            await _handle_room_action(
                svc, game_svc, sm, code, str(user.id), msg, websocket
            )
    except WebSocketDisconnect:
        pass
    finally:
        room_manager.disconnect(code, websocket)


async def _handle_room_action(
    svc: RoomService,
    game_svc: GameService,
    sm: async_sessionmaker,
    code: str,
    user_id: str,
    msg: dict,
    sender: WebSocket,
) -> None:
    action = msg.get("action")
    try:
        if action == "set_ready":
            req = WsSetReady.model_validate(msg)
            room = await svc.set_ready(code, user_id=user_id, ready=req.ready)
            await room_manager.broadcast(code, _room_payload(room))
            started = await svc.try_start_game(code)
            if started is not None and started.game_id is not None:
                state = await game_svc.get_state(started.game_id)
                async with sm() as session:
                    await records_service.start_game(
                        session, state=state, room_code=code
                    )
                    await session.commit()
                await room_manager.broadcast(
                    code, {"type": "start", "data": {"game_id": started.game_id}}
                )
        elif action == "leave":
            WsLeave.model_validate(msg)
            room, closed = await svc.leave(code, user_id=user_id)
            if closed:
                await room_manager.close_all(
                    code, {"type": "closed", "data": {"reason": "host_left"}}
                )
            elif room is not None:
                await room_manager.broadcast(code, _room_payload(room))
        else:
            await sender.send_json(
                {"type": "error", "data": {"message": f"unknown action: {action}"}}
            )
    except (RoomError, RoomNotFoundError, RoomLockError) as e:
        await sender.send_json({"type": "error", "data": {"message": str(e)}})
