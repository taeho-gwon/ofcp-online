from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import jwt as jwt_lib
from app.auth.oauth import GoogleAuthError, verify_google_id_token
from app.auth.schemas import (
    DevLoginRequest,
    DevLoginResponse,
    GoogleLoginRequest,
    GoogleLoginResponse,
    RefreshRequest,
    SignupRequest,
    SignupResponse,
    TokenPair,
)
from app.config import settings
from app.core.db import get_session
from app.cosmetics import service as cosmetics_service
from app.users import repository as users_repo
from app.users import service as users_service
from app.users.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_pair(user_id) -> TokenPair:
    return TokenPair(
        access_token=jwt_lib.issue_access(user_id),
        refresh_token=jwt_lib.issue_refresh(user_id),
    )


@router.post("/google", response_model=GoogleLoginResponse)
async def google_login(
    payload: GoogleLoginRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GoogleLoginResponse:
    try:
        identity = verify_google_id_token(payload.id_token)
    except GoogleAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc

    user = await users_repo.get_by_google_sub(session, identity.sub)
    if user is None:
        signup_token = jwt_lib.issue_signup(
            google_sub=identity.sub, email=identity.email
        )
        return GoogleLoginResponse(
            needs_signup=True, signup_token=signup_token, email=identity.email
        )

    return GoogleLoginResponse(
        needs_signup=False,
        tokens=_issue_pair(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/signup", response_model=SignupResponse)
async def signup(
    payload: SignupRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SignupResponse:
    try:
        claims = jwt_lib.verify_signup(payload.signup_token)
    except jwt_lib.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc

    # 동일 google_sub로 이미 가입했는지 확인 (signup_token 재사용 방지)
    existing = await users_repo.get_by_google_sub(session, claims.google_sub)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="이미 가입된 계정입니다."
        )

    try:
        user = await users_service.create_user(
            session,
            google_sub=claims.google_sub,
            email=claims.email,
            nickname=payload.nickname,
        )
    except users_service.NicknameError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    await cosmetics_service.grant_defaults(session, user.id)
    await session.commit()
    return SignupResponse(
        tokens=_issue_pair(user.id), user=UserOut.model_validate(user)
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    payload: RefreshRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenPair:
    try:
        claims = jwt_lib.verify_refresh(payload.refresh_token)
    except jwt_lib.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    user = await users_repo.get_by_id(session, claims.sub)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="유저를 찾을 수 없습니다."
        )
    return _issue_pair(user.id)


@router.post("/dev-login", response_model=DevLoginResponse)
async def dev_login(
    payload: DevLoginRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DevLoginResponse:
    """dev 환경에서 닉네임만으로 user 생성/재로그인. dev_auth_enabled 가드."""
    if not settings.dev_auth_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    existing = await users_repo.get_by_nickname(session, payload.nickname)
    if existing is not None:
        return DevLoginResponse(
            tokens=_issue_pair(existing.id), user=UserOut.model_validate(existing)
        )

    try:
        user = await users_service.create_user(
            session,
            google_sub=f"dev:{payload.nickname}",
            email=f"{payload.nickname}@dev.local",
            nickname=payload.nickname,
        )
    except users_service.NicknameError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    await cosmetics_service.grant_defaults(session, user.id)
    await session.commit()
    return DevLoginResponse(
        tokens=_issue_pair(user.id), user=UserOut.model_validate(user)
    )
