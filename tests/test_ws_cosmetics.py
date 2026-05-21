"""ws.py 코스메틱 통합 — 풀 WS round-trip 대신 핵심 통합 로직을 단위로 검증.

- `_attach_cosmetics`: serialize_state payload에 cosmetics 키를 합쳐 넣는지
- `cosmetics_service.get_loadouts_for_users`: ws에서 사용할 형태로 반환되는지

풀 ws 통합은 수동 e2e(Task 19 step 4)에서 검증.
"""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.ws import _attach_cosmetics
from app.cosmetics import service as cosmetics_service
from app.cosmetics.models import Cosmetic
from app.users import service as users_service


async def _seed_catalog(session: AsyncSession):
    seed = [
        ("card_back", "back.navy", "네이비", True),
        ("card_back", "back.ocean", "오션", False),
        ("card_face", "face.classic", "클래식", True),
        ("card_face", "face.modern", "모던", False),
        ("table_theme", "table.green", "그린", True),
        ("table_theme", "table.walnut", "월넛", False),
        ("title", "title.beginner", "초보자", True),
        ("title", "title.fl_demon", "FL악마", False),
    ]
    for cat, code, name, is_default in seed:
        session.add(Cosmetic(category=cat, code=code, name=name, is_default=is_default))
    await session.flush()


def test_attach_cosmetics_adds_key_to_each_player():
    """serialize_state payload.players[i]에 cosmetics 키가 합쳐져야 함."""
    uid1, uid2 = str(uuid.uuid4()), str(uuid.uuid4())
    payload = {
        "players": [
            {"player_id": uid1, "nickname": "alice"},
            {"player_id": uid2, "nickname": "bob"},
        ]
    }
    cosmetics_by_user = {
        uid1: {
            "card_back": "back.ocean",
            "card_face": "face.classic",
            "table_theme": "table.green",
            "title": "title.fl_demon",
        },
        uid2: {
            "card_back": "back.navy",
            "card_face": "face.modern",
            "table_theme": "table.walnut",
            "title": "title.beginner",
        },
    }

    _attach_cosmetics(payload, cosmetics_by_user)

    assert payload["players"][0]["cosmetics"]["card_back"] == "back.ocean"
    assert payload["players"][1]["cosmetics"]["title"] == "title.beginner"
    assert set(payload["players"][0]["cosmetics"].keys()) == {
        "card_back",
        "card_face",
        "table_theme",
        "title",
    }


def test_attach_cosmetics_skips_when_user_missing_in_map():
    """cosmetics_by_user에 없는 user는 cosmetics 키를 안 붙임."""
    uid = str(uuid.uuid4())
    payload = {"players": [{"player_id": uid, "nickname": "alice"}]}
    _attach_cosmetics(payload, {})
    assert "cosmetics" not in payload["players"][0]


@pytest.mark.asyncio
async def test_get_loadouts_for_users_returns_dict_for_ws(
    db_session: AsyncSession,
):
    """ws에서 호출하는 형태(dict[UUID, dict[str, str]])로 반환되는지 확인."""
    await _seed_catalog(db_session)
    u1 = await users_service.create_user(
        db_session, google_sub="ws:1", email="1@t.local", nickname="wsuser1"
    )
    u2 = await users_service.create_user(
        db_session, google_sub="ws:2", email="2@t.local", nickname="wsuser2"
    )
    await cosmetics_service.grant_defaults(db_session, u1.id)
    await cosmetics_service.grant_defaults(db_session, u2.id)
    await db_session.flush()

    result = await cosmetics_service.get_loadouts_for_users(db_session, [u1.id, u2.id])
    # ws.py에서는 str key로 변환해서 _attach_cosmetics에 전달
    result_str = {str(k): v for k, v in result.items()}
    assert set(result_str.keys()) == {str(u1.id), str(u2.id)}
    assert set(result_str[str(u1.id)].keys()) == {
        "card_back",
        "card_face",
        "table_theme",
        "title",
    }
    assert result_str[str(u1.id)]["card_back"] == "back.navy"
