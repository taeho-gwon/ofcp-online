import uuid
from datetime import UTC, datetime, timedelta

import jwt as pyjwt
import pytest

from app.auth import jwt as jwt_lib
from app.config import settings


def test_access_token_roundtrip():
    uid = uuid.uuid4()
    token = jwt_lib.issue_access(uid)
    claims = jwt_lib.verify_access(token)
    assert claims.sub == uid
    assert claims.typ == "access"


def test_refresh_token_roundtrip():
    uid = uuid.uuid4()
    token = jwt_lib.issue_refresh(uid)
    claims = jwt_lib.verify_refresh(token)
    assert claims.sub == uid
    assert claims.typ == "refresh"


def test_signup_token_roundtrip():
    token = jwt_lib.issue_signup(google_sub="g-123", email="a@b.com")
    claims = jwt_lib.verify_signup(token)
    assert claims.google_sub == "g-123"
    assert claims.email == "a@b.com"
    assert claims.typ == "signup"


def test_access_rejects_refresh_token():
    uid = uuid.uuid4()
    refresh = jwt_lib.issue_refresh(uid)
    with pytest.raises(jwt_lib.InvalidTokenError):
        jwt_lib.verify_access(refresh)


def test_refresh_rejects_access_token():
    uid = uuid.uuid4()
    access = jwt_lib.issue_access(uid)
    with pytest.raises(jwt_lib.InvalidTokenError):
        jwt_lib.verify_refresh(access)


def test_invalid_signature_rejected():
    uid = uuid.uuid4()
    token = jwt_lib.issue_access(uid)
    # 서명 부분의 절반을 잘라 확실히 invalid하게 만듦
    head, _, sig = token.rpartition(".")
    tampered = head + "." + sig[: len(sig) // 2]
    with pytest.raises(jwt_lib.InvalidTokenError):
        jwt_lib.verify_access(tampered)


def test_expired_token_rejected():
    expired = pyjwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "typ": "access",
            "iat": int((datetime.now(UTC) - timedelta(hours=2)).timestamp()),
            "exp": int((datetime.now(UTC) - timedelta(hours=1)).timestamp()),
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(jwt_lib.InvalidTokenError):
        jwt_lib.verify_access(expired)
