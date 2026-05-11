import uuid

from app.game.card import Card
from app.game.engine import (
    create_game as engine_create_game,
)
from app.game.engine import (
    place_fantasy_turn as engine_place_fantasy,
)
from app.game.engine import (
    place_first_turn as engine_place_first,
)
from app.game.engine import (
    place_normal_turn as engine_place_normal,
)
from app.game.engine import (
    start_next_round as engine_start_next_round,
)
from app.game.repository import GameRepository
from app.game.rules import RULESETS, Ruleset
from app.game.state import GameState, Phase


class GameNotFoundError(LookupError):
    pass


class WrongPlayerError(PermissionError):
    """current_player가 아닌 플레이어가 수를 두려고 시도."""


class GameService:
    def __init__(
        self,
        repo: GameRepository,
        default_ruleset_name: str = "pineapple",
    ) -> None:
        self._repo = repo
        self._default_ruleset_name = default_ruleset_name

    @staticmethod
    def _rules_of(state: GameState) -> Ruleset:
        return RULESETS[state.ruleset_name]

    async def create_game(
        self,
        player_ids: list[str],
        dealer_idx: int = 0,
        fantasy_players: dict[str, int] | None = None,
        ruleset_name: str | None = None,
    ) -> GameState:
        game_id = uuid.uuid4().hex[:12]
        rules = RULESETS[ruleset_name or self._default_ruleset_name]
        state = engine_create_game(
            game_id=game_id,
            player_ids=player_ids,
            dealer_idx=dealer_idx,
            fantasy_players=fantasy_players,
            rules=rules,
        )
        await self._repo.save(state)
        return state

    async def get_state(self, game_id: str) -> GameState:
        state = await self._repo.load(game_id)
        if state is None:
            raise GameNotFoundError(game_id)
        return state

    async def place_first_turn(
        self,
        game_id: str,
        player_id: str,
        placements: dict[str, list[Card]],
    ) -> GameState:
        async with self._repo.acquire_lock(game_id):
            state = await self._load_and_check(game_id, player_id)
            new_state = engine_place_first(
                state, placements, rules=self._rules_of(state)
            )
            await self._repo.save(new_state)
            return new_state

    async def place_normal_turn(
        self,
        game_id: str,
        player_id: str,
        placements: dict[str, list[Card]],
        discard: Card,
    ) -> GameState:
        async with self._repo.acquire_lock(game_id):
            state = await self._load_and_check(game_id, player_id)
            new_state = engine_place_normal(
                state, placements, discard, rules=self._rules_of(state)
            )
            await self._repo.save(new_state)
            return new_state

    async def place_fantasy_turn(
        self,
        game_id: str,
        player_id: str,
        placements: dict[str, list[Card]],
        discards: list[Card],
    ) -> GameState:
        async with self._repo.acquire_lock(game_id):
            state = await self._repo.load(game_id)
            if state is None:
                raise GameNotFoundError(game_id)
            # FL은 동시 진행이므로 current_player 강제 대신 FL+미완 여부만 확인한다.
            player = next((p for p in state.players if p.player_id == player_id), None)
            if player is None or not player.is_fantasy or player.board.is_complete:
                raise WrongPlayerError(
                    f"Player {player_id} is not an eligible FL player"
                )
            new_state = engine_place_fantasy(
                state, player_id, placements, discards, rules=self._rules_of(state)
            )
            await self._repo.save(new_state)
            return new_state

    async def advance_round(self, game_id: str) -> GameState:
        async with self._repo.acquire_lock(game_id):
            state = await self._repo.load(game_id)
            if state is None:
                raise GameNotFoundError(game_id)
            # 동시 발송 / 재발송에 안전하도록 phase != DONE이면 현재 state 그대로 반환.
            if state.phase != Phase.DONE:
                return state
            new_state = engine_start_next_round(state, rules=self._rules_of(state))
            await self._repo.save(new_state)
            return new_state

    async def _load_and_check(self, game_id: str, player_id: str) -> GameState:
        state = await self._repo.load(game_id)
        if state is None:
            raise GameNotFoundError(game_id)
        current = state.current_player.player_id
        if current != player_id:
            raise WrongPlayerError(
                f"Player {player_id} is not current player ({current})"
            )
        return state
