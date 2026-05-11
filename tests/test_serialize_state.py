from app.game.board import PlayerBoard
from app.game.card import Card, Deck, Rank, Suit
from app.game.schemas import serialize_state
from app.game.state import GameState, Phase, PlayerState


def card(rank: int, suit: int) -> Card:
    return Card(Rank(rank), Suit(suit))


def _full_board() -> PlayerBoard:
    b = PlayerBoard()
    b.top = [card(14, 1), card(14, 2), card(2, 3)]
    b.middle = [card(8, 1), card(8, 2), card(8, 3), card(3, 1), card(4, 2)]
    b.bottom = [card(13, 1), card(13, 2), card(13, 3), card(9, 1), card(9, 2)]
    return b


def _make_state(phase: Phase, *, b_top: list[Card] | None = None) -> GameState:
    fl = PlayerState(player_id="A", board=_full_board(), is_fantasy=True)
    nb = PlayerState(player_id="B", board=PlayerBoard(), is_fantasy=False)
    if b_top:
        nb.board.top = b_top
    return GameState(
        game_id="g1",
        players=[fl, nb],
        deck=Deck(),
        phase=phase,
    )


class TestFantasyLandBoardVisibility:
    def test_hidden_from_other_in_first_turn(self):
        s = _make_state(Phase.FIRST_TURN)
        resp = serialize_state(s, viewer_id="B")
        a = resp.players[0]
        assert a.player_id == "A"
        assert a.board.top == []
        assert a.board.middle == []
        assert a.board.bottom == []
        assert a.board.top_count == 3
        assert a.board.middle_count == 5
        assert a.board.bottom_count == 5

    def test_hidden_from_other_in_normal_turn(self):
        s = _make_state(Phase.NORMAL_TURN)
        resp = serialize_state(s, viewer_id="B")
        a = resp.players[0]
        assert a.board.top == []
        assert a.board.top_count == 3

    def test_hidden_from_other_in_fantasy_turn(self):
        s = _make_state(Phase.FANTASY_TURN)
        resp = serialize_state(s, viewer_id="B")
        a = resp.players[0]
        assert a.board.top == []
        assert a.board.bottom_count == 5

    def test_visible_to_self(self):
        s = _make_state(Phase.FIRST_TURN)
        resp = serialize_state(s, viewer_id="A")
        a = resp.players[0]
        assert len(a.board.top) == 3
        assert len(a.board.middle) == 5
        assert len(a.board.bottom) == 5

    def test_revealed_in_scoring(self):
        s = _make_state(Phase.SCORING)
        resp = serialize_state(s, viewer_id="B")
        a = resp.players[0]
        assert len(a.board.top) == 3
        assert len(a.board.middle) == 5
        assert len(a.board.bottom) == 5

    def test_non_fl_player_board_not_hidden(self):
        # 비FL 플레이어 B의 보드는 다른 시점에서도 일반 공개.
        s = _make_state(Phase.FIRST_TURN, b_top=[card(5, 1)])
        resp = serialize_state(s, viewer_id="A")
        b = resp.players[1]
        assert len(b.board.top) == 1
        assert b.board.top_count == 1

    def test_no_viewer_shows_all(self):
        # viewer_id=None은 서버 내부용. 모든 보드/손패 공개.
        s = _make_state(Phase.FIRST_TURN)
        resp = serialize_state(s)
        a = resp.players[0]
        assert len(a.board.top) == 3
        assert a.board.top_count == 3
