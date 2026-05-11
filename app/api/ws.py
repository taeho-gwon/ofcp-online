import logging
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from redis.asyncio import Redis

from app.core.redis import get_redis
from app.game.repository import GameLockError, GameRepository
from app.game.schemas import (
    FantasyTurnMoveRequest,
    FirstTurnMoveRequest,
    NormalTurnMoveRequest,
    serialize_state,
    to_placements,
)
from app.game.service import GameNotFoundError, GameService, WrongPlayerError
from app.game.state import GameState

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """단일 프로세스 내 game_id → {(player_id, ws), ...} 매핑."""

    def __init__(self) -> None:
        self._conns: dict[str, set[tuple[str, WebSocket]]] = defaultdict(set)

    async def connect(self, game_id: str, player_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._conns[game_id].add((player_id, ws))

    def disconnect(self, game_id: str, player_id: str, ws: WebSocket) -> None:
        self._conns[game_id].discard((player_id, ws))
        if not self._conns[game_id]:
            del self._conns[game_id]

    async def broadcast(self, game_id: str, state: GameState) -> None:
        """각 구독자에게 본인 perspective로 직렬화한 상태 전송."""
        dead: list[tuple[str, WebSocket]] = []
        for player_id, ws in list(self._conns.get(game_id, set())):
            try:
                payload = serialize_state(state, viewer_id=player_id).model_dump()
                await ws.send_json({"type": "state", "data": payload})
            except Exception as e:
                logger.warning("WS send failed for %s: %s", player_id, e)
                dead.append((player_id, ws))
        for player_id, ws in dead:
            self.disconnect(game_id, player_id, ws)


manager = ConnectionManager()


@router.websocket("/ws/games/{game_id}")
async def game_socket(
    websocket: WebSocket,
    game_id: str,
    player_id: Annotated[str, Query()],
    redis: Annotated[Redis, Depends(get_redis)],
) -> None:
    svc = GameService(GameRepository(redis))
    await manager.connect(game_id, player_id, websocket)

    # 입장 시 현재 상태 즉시 전송
    try:
        state = await svc.get_state(game_id)
        payload = serialize_state(state, viewer_id=player_id).model_dump()
        await websocket.send_json({"type": "state", "data": payload})
    except GameNotFoundError:
        await websocket.send_json(
            {"type": "error", "data": {"message": "game not found"}}
        )
        await websocket.close()
        manager.disconnect(game_id, player_id, websocket)
        return

    try:
        while True:
            msg = await websocket.receive_json()
            await _handle_action(svc, game_id, msg, websocket)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(game_id, player_id, websocket)


async def _handle_action(
    svc: GameService, game_id: str, msg: dict, sender: WebSocket
) -> None:
    action = msg.get("action")
    try:
        if action == "first_turn":
            req = FirstTurnMoveRequest.model_validate(msg)
            state = await svc.place_first_turn(
                game_id, req.player_id, to_placements(req.placements)
            )
        elif action == "normal_turn":
            req = NormalTurnMoveRequest.model_validate(msg)
            state = await svc.place_normal_turn(
                game_id,
                req.player_id,
                to_placements(req.placements),
                req.discard.to_card(),
            )
        elif action == "fantasy_turn":
            req = FantasyTurnMoveRequest.model_validate(msg)
            state = await svc.place_fantasy_turn(
                game_id,
                req.player_id,
                to_placements(req.placements),
                [c.to_card() for c in req.discards],
            )
        elif action == "next_round":
            state = await svc.advance_round(game_id)
        else:
            await sender.send_json(
                {"type": "error", "data": {"message": f"unknown action: {action}"}}
            )
            return
    except (GameNotFoundError, WrongPlayerError, GameLockError, ValueError) as e:
        await sender.send_json({"type": "error", "data": {"message": str(e)}})
        return

    await manager.broadcast(game_id, state)
