import logging
import uuid
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.games import load_display_names
from app.auth.jwt import InvalidTokenError, verify_access
from app.config import settings
from app.core.db import get_engine
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
from app.game.state import GameState, Phase
from app.records import service as records_service
from app.users import repository as users_repo

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """game_id → user_id → WebSocket. 동일 user 재접속 시 이전 WS 교체."""

    def __init__(self) -> None:
        self._conns: dict[str, dict[str, WebSocket]] = defaultdict(dict)

    async def connect(self, game_id: str, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        prev = self._conns[game_id].get(user_id)
        if prev is not None and prev is not ws:
            try:
                await prev.close(code=1000, reason="replaced by new connection")
            except Exception:
                pass
        self._conns[game_id][user_id] = ws

    def disconnect(self, game_id: str, user_id: str, ws: WebSocket) -> None:
        # 이미 교체된 경우(다른 WS가 등록됨)는 건드리지 않음
        if self._conns.get(game_id, {}).get(user_id) is ws:
            del self._conns[game_id][user_id]
            if not self._conns[game_id]:
                del self._conns[game_id]

    async def broadcast(
        self, game_id: str, state: GameState, display_names: dict[str, str]
    ) -> None:
        dead: list[tuple[str, WebSocket]] = []
        for user_id, ws in list(self._conns.get(game_id, {}).items()):
            try:
                payload = serialize_state(
                    state, viewer_id=user_id, display_names=display_names
                ).model_dump()
                await ws.send_json({"type": "state", "data": payload})
            except Exception as e:
                logger.warning("WS send failed for %s: %s", user_id, e)
                dead.append((user_id, ws))
        for user_id, ws in dead:
            self.disconnect(game_id, user_id, ws)


manager = ConnectionManager()


def _make_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False, autoflush=False)


async def _auth_ws(token: str | None) -> uuid.UUID | None:
    if not token:
        return None
    try:
        claims = verify_access(token)
    except InvalidTokenError:
        return None
    return claims.sub


@router.websocket("/ws/games/{game_id}")
async def game_socket(
    websocket: WebSocket,
    game_id: str,
    token: Annotated[str | None, Query()] = None,
    redis: Annotated[Redis, Depends(get_redis)] = None,
) -> None:
    user_id = await _auth_ws(token)
    if user_id is None:
        await websocket.close(code=4401, reason="unauthorized")
        return

    svc = GameService(GameRepository(redis, ttl_seconds=settings.game_ttl_seconds))

    # 게임 존재 + 본인이 player인지 검증
    try:
        state = await svc.get_state(game_id)
    except GameNotFoundError:
        await websocket.close(code=4404, reason="game not found")
        return
    user_id_str = str(user_id)
    if not any(p.player_id == user_id_str for p in state.players):
        await websocket.close(code=4403, reason="not a player")
        return

    # DB에서 닉네임 매핑 확보
    sm = _make_sessionmaker()
    async with sm() as session:
        # user_id가 DB에 실제 존재해야 보안상 안전
        if await users_repo.get_by_id(session, user_id) is None:
            await websocket.close(code=4401, reason="user not found")
            return
        display_names = await load_display_names(session, state)

    await manager.connect(game_id, user_id_str, websocket)

    payload = serialize_state(
        state, viewer_id=user_id_str, display_names=display_names
    ).model_dump()
    await websocket.send_json({"type": "state", "data": payload})

    try:
        while True:
            msg = await websocket.receive_json()
            await _handle_action(
                svc, sm, game_id, user_id_str, msg, websocket, display_names
            )
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(game_id, user_id_str, websocket)


async def _handle_action(
    svc: GameService,
    sm: async_sessionmaker[AsyncSession],
    game_id: str,
    user_id_str: str,
    msg: dict,
    sender: WebSocket,
    display_names: dict[str, str],
) -> None:
    action = msg.get("action")
    # 모든 액션은 본인 명의로만 전송 가능. payload.player_id를 강제 user_id로 덮어쓴다.
    msg = {**msg, "player_id": user_id_str}

    hand_before: list[dict] = []
    payload_extra: dict = {}
    try:
        if action == "first_turn":
            req = FirstTurnMoveRequest.model_validate(msg)
            hand_before = await _capture_hand(svc, game_id, user_id_str)
            payload_extra = {
                "placements": _placements_to_payload(req.placements),
            }
            state = await svc.place_first_turn(
                game_id, req.player_id, to_placements(req.placements)
            )
        elif action == "normal_turn":
            req = NormalTurnMoveRequest.model_validate(msg)
            hand_before = await _capture_hand(svc, game_id, user_id_str)
            payload_extra = {
                "placements": _placements_to_payload(req.placements),
                "discard": req.discard.model_dump(),
            }
            state = await svc.place_normal_turn(
                game_id,
                req.player_id,
                to_placements(req.placements),
                req.discard.to_card(),
            )
        elif action == "fantasy_turn":
            req = FantasyTurnMoveRequest.model_validate(msg)
            hand_before = await _capture_hand(svc, game_id, user_id_str)
            payload_extra = {
                "placements": _placements_to_payload(req.placements),
                "discards": [c.model_dump() for c in req.discards],
            }
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

    if action in ("first_turn", "normal_turn", "fantasy_turn"):
        try:
            async with sm() as session:
                await records_service.append_action_event(
                    session,
                    game_id=game_id,
                    actor_id=user_id_str,
                    action=action,
                    hand_before=hand_before,
                    payload_extra=payload_extra,
                )
                await session.commit()
        except Exception as e:
            logger.warning("append_action_event failed for %s: %s", game_id, e)

    await manager.broadcast(game_id, state, display_names)

    if state.phase in (Phase.DONE, Phase.GAME_OVER):
        try:
            async with sm() as session:
                await records_service.append_round_end(session, state=state)
                if state.phase == Phase.GAME_OVER:
                    await records_service.append_game_end(session, state=state)
                await session.commit()
        except Exception as e:
            logger.warning("records round/game end failed for %s: %s", game_id, e)

    if state.phase == Phase.DONE:
        try:
            advanced = await svc.advance_round(game_id)
        except (GameNotFoundError, GameLockError, ValueError) as e:
            logger.warning("auto-advance failed for %s: %s", game_id, e)
            return
        await manager.broadcast(game_id, advanced, display_names)


async def _capture_hand(svc: GameService, game_id: str, user_id_str: str) -> list[dict]:
    try:
        state = await svc.get_state(game_id)
    except GameNotFoundError:
        return []
    player = next((p for p in state.players if p.player_id == user_id_str), None)
    if player is None:
        return []
    return [c.to_dict() for c in player.hand]


def _placements_to_payload(placements: dict) -> dict[str, list[dict]]:
    return {row: [c.model_dump() for c in cards] for row, cards in placements.items()}
