import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

import jwt
from pydantic import BaseModel

from app.config import settings

TokenType = Literal["access", "refresh", "signup"]


class InvalidTokenError(Exception):
    pass


class AccessClaims(BaseModel):
    sub: uuid.UUID  # user_id
    typ: Literal["access"]
    exp: int
    iat: int


class RefreshClaims(BaseModel):
    sub: uuid.UUID  # user_id
    typ: Literal["refresh"]
    exp: int
    iat: int


class SignupClaims(BaseModel):
    google_sub: str
    email: str
    typ: Literal["signup"]
    exp: int
    iat: int


def _now() -> datetime:
    return datetime.now(UTC)


def _encode(payload: dict) -> str:
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc


def issue_access(user_id: uuid.UUID) -> str:
    now = _now()
    payload = {
        "sub": str(user_id),
        "typ": "access",
        "iat": int(now.timestamp()),
        "exp": int(
            (now + timedelta(seconds=settings.jwt_access_ttl_seconds)).timestamp()
        ),
    }
    return _encode(payload)


def issue_refresh(user_id: uuid.UUID) -> str:
    now = _now()
    payload = {
        "sub": str(user_id),
        "typ": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(
            (now + timedelta(seconds=settings.jwt_refresh_ttl_seconds)).timestamp()
        ),
    }
    return _encode(payload)


def issue_signup(*, google_sub: str, email: str) -> str:
    now = _now()
    payload = {
        "google_sub": google_sub,
        "email": email,
        "typ": "signup",
        "iat": int(now.timestamp()),
        "exp": int(
            (now + timedelta(seconds=settings.jwt_signup_ttl_seconds)).timestamp()
        ),
    }
    return _encode(payload)


def verify_access(token: str) -> AccessClaims:
    data = _decode(token)
    if data.get("typ") != "access":
        raise InvalidTokenError("토큰 타입이 access가 아닙니다.")
    return AccessClaims.model_validate(data)


def verify_refresh(token: str) -> RefreshClaims:
    data = _decode(token)
    if data.get("typ") != "refresh":
        raise InvalidTokenError("토큰 타입이 refresh가 아닙니다.")
    return RefreshClaims.model_validate(data)


def verify_signup(token: str) -> SignupClaims:
    data = _decode(token)
    if data.get("typ") != "signup":
        raise InvalidTokenError("토큰 타입이 signup이 아닙니다.")
    return SignupClaims.model_validate(data)
