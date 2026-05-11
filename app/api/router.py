from fastapi import APIRouter

from app.api import games

router = APIRouter()
router.include_router(games.router)
