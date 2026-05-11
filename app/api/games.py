from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis

from app.core.redis import get_redis
from app.game.repository import GameRepository
from app.game.schemas import (
    CreateGameRequest,
    GameStateResponse,
    serialize_state,
)
from app.game.service import GameNotFoundError, GameService

router = APIRouter(prefix="/games", tags=["games"])


def get_game_service(redis: Annotated[Redis, Depends(get_redis)]) -> GameService:
    return GameService(GameRepository(redis))


ServiceDep = Annotated[GameService, Depends(get_game_service)]


@router.post("", response_model=GameStateResponse, status_code=201)
async def create_game(req: CreateGameRequest, svc: ServiceDep) -> GameStateResponse:
    try:
        state = await svc.create_game(
            player_ids=req.player_ids,
            dealer_idx=req.dealer_idx,
            fantasy_players=req.fantasy_players,
            ruleset_name=req.ruleset_name,
        )
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Unknown ruleset: {e}") from e
    return serialize_state(state)


@router.get("/{game_id}", response_model=GameStateResponse)
async def get_game(
    game_id: str,
    svc: ServiceDep,
    viewer_id: Annotated[str | None, Query()] = None,
) -> GameStateResponse:
    try:
        state = await svc.get_state(game_id)
    except GameNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Game {e} not found") from e
    return serialize_state(state, viewer_id=viewer_id)


@router.post("/{game_id}/advance", response_model=GameStateResponse)
async def advance_round(game_id: str, svc: ServiceDep) -> GameStateResponse:
    try:
        state = await svc.advance_round(game_id)
    except GameNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Game {e} not found") from e
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    return serialize_state(state)
