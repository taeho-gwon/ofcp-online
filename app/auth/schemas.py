from typing import Literal

from pydantic import BaseModel, Field

from app.users.schemas import UserOut


class GoogleLoginRequest(BaseModel):
    id_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"


class GoogleLoginResponse(BaseModel):
    """기존 유저면 tokens+user, 신규면 signup_token만 반환."""

    needs_signup: bool
    tokens: TokenPair | None = None
    user: UserOut | None = None
    signup_token: str | None = None
    email: str | None = None  # 신규 가입 화면에서 이메일 노출용


class SignupRequest(BaseModel):
    signup_token: str
    nickname: str = Field(min_length=2, max_length=16)


class SignupResponse(BaseModel):
    tokens: TokenPair
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str
