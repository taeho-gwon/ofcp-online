import fakeredis.aioredis
import pytest

from app.game.repository import GameRepository
from app.game.service import GameService
from app.rooms.repository import RoomRepository
from app.rooms.service import RoomError, RoomNotFoundError, RoomService


@pytest.fixture
def redis():
    return fakeredis.aioredis.FakeRedis(decode_responses=True)


@pytest.fixture
def svc(redis):
    return RoomService(
        repo=RoomRepository(redis),
        game_service=GameService(GameRepository(redis)),
    )


async def test_create_room_basic(svc: RoomService):
    room = await svc.create(
        host_user_id="u1",
        host_nickname="alice",
        ruleset_name="pineapple",
        max_seats=2,
    )
    assert len(room.code) == 6
    assert room.host_user_id == "u1"
    assert len(room.members) == 1
    assert room.members[0].user_id == "u1"
    assert room.members[0].nickname == "alice"
    # 방장은 ready 토글 없이 자동 ready=True.
    assert room.members[0].ready is True
    assert room.game_id is None


async def test_create_room_rejects_invalid_ruleset(svc: RoomService):
    with pytest.raises(RoomError):
        await svc.create(
            host_user_id="u1",
            host_nickname="alice",
            ruleset_name="nope",
            max_seats=2,
        )


async def test_create_room_rejects_invalid_seats(svc: RoomService):
    with pytest.raises(RoomError):
        await svc.create(
            host_user_id="u1",
            host_nickname="alice",
            ruleset_name="pineapple",
            max_seats=4,
        )


async def test_join_adds_member(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=3
    )
    room = await svc.join(room.code, user_id="u2", nickname="bob")
    assert len(room.members) == 2
    assert room.members[1].user_id == "u2"


async def test_join_existing_member_is_idempotent(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=2
    )
    room = await svc.join(room.code, user_id="u1", nickname="alice-renamed")
    assert len(room.members) == 1
    assert room.members[0].nickname == "alice-renamed"


async def test_join_full_room_rejected(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=2
    )
    await svc.join(room.code, user_id="u2", nickname="bob")
    with pytest.raises(RoomError):
        await svc.join(room.code, user_id="u3", nickname="carol")


async def test_get_missing_room_raises(svc: RoomService):
    with pytest.raises(RoomNotFoundError):
        await svc.get("ZZZZZZ")


async def test_leave_guest_keeps_room(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=3
    )
    await svc.join(room.code, user_id="u2", nickname="bob")
    after, closed = await svc.leave(room.code, user_id="u2")
    assert closed is False
    assert after is not None
    assert [m.user_id for m in after.members] == ["u1"]


async def test_leave_host_closes_room(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=3
    )
    await svc.join(room.code, user_id="u2", nickname="bob")
    after, closed = await svc.leave(room.code, user_id="u1")
    assert closed is True
    assert after is None
    with pytest.raises(RoomNotFoundError):
        await svc.get(room.code)


async def test_set_ready_toggles_for_guest(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=2
    )
    await svc.join(room.code, user_id="u2", nickname="bob")
    room = await svc.set_ready(room.code, user_id="u2", ready=True)
    bob = room.find_member("u2")
    assert bob is not None and bob.ready is True


async def test_set_ready_host_is_noop(svc: RoomService):
    """방장은 자동 ready 상태 유지 — set_ready 토글 영향 X."""
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=2
    )
    room = await svc.set_ready(room.code, user_id="u1", ready=False)
    assert room.members[0].ready is True


async def test_set_ready_non_member_rejected(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=2
    )
    with pytest.raises(RoomError):
        await svc.set_ready(room.code, user_id="u3", ready=True)


async def test_leave_does_not_reset_other_ready(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=3
    )
    await svc.join(room.code, user_id="u2", nickname="bob")
    await svc.join(room.code, user_id="u3", nickname="carol")
    await svc.set_ready(room.code, user_id="u2", ready=True)
    after, _ = await svc.leave(room.code, user_id="u3")
    bob = after.find_member("u2")
    assert bob is not None and bob.ready is True


async def test_start_game_by_host_all_ready(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=2
    )
    await svc.join(room.code, user_id="u2", nickname="bob")
    await svc.set_ready(room.code, user_id="u2", ready=True)
    started = await svc.start_game(room.code, user_id="u1")
    assert started.game_id is not None


async def test_start_game_non_host_rejected(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=2
    )
    await svc.join(room.code, user_id="u2", nickname="bob")
    await svc.set_ready(room.code, user_id="u2", ready=True)
    with pytest.raises(RoomError):
        await svc.start_game(room.code, user_id="u2")


async def test_start_game_partial_ready_rejected(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=2
    )
    await svc.join(room.code, user_id="u2", nickname="bob")
    with pytest.raises(RoomError):
        await svc.start_game(room.code, user_id="u1")


async def test_start_game_single_member_rejected(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=2
    )
    with pytest.raises(RoomError):
        await svc.start_game(room.code, user_id="u1")


async def test_join_after_game_started_rejected(svc: RoomService):
    room = await svc.create(
        host_user_id="u1", host_nickname="alice", ruleset_name="pineapple", max_seats=3
    )
    await svc.join(room.code, user_id="u2", nickname="bob")
    await svc.set_ready(room.code, user_id="u2", ready=True)
    await svc.start_game(room.code, user_id="u1")
    with pytest.raises(RoomError):
        await svc.join(room.code, user_id="u3", nickname="carol")
