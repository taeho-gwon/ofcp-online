import re

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.users import repository
from app.users.models import User

# 한글/영문/숫자/언더스코어, 2~16자
_NICKNAME_PATTERN = re.compile(r"^[\w가-힣]{2,16}$", re.UNICODE)


class NicknameError(ValueError):
    """닉네임 검증/충돌 예외."""


def validate_nickname_format(nickname: str) -> None:
    if not _NICKNAME_PATTERN.match(nickname):
        raise NicknameError("닉네임은 2~16자의 한글/영문/숫자/_ 조합이어야 합니다.")


async def is_nickname_available(session: AsyncSession, nickname: str) -> bool:
    return await repository.get_by_nickname(session, nickname) is None


async def create_user(
    session: AsyncSession, *, google_sub: str, email: str, nickname: str
) -> User:
    """닉네임 검증 + 충돌 시 NicknameError. 호출자가 트랜잭션 커밋 책임."""
    validate_nickname_format(nickname)
    try:
        user = await repository.create(
            session, google_sub=google_sub, email=email, nickname=nickname
        )
    except IntegrityError as exc:
        await session.rollback()
        raise NicknameError("이미 사용 중인 닉네임입니다.") from exc
    return user


async def change_nickname(session: AsyncSession, user: User, nickname: str) -> User:
    validate_nickname_format(nickname)
    if nickname == user.nickname:
        return user
    try:
        user = await repository.update_nickname(session, user, nickname)
    except IntegrityError as exc:
        await session.rollback()
        raise NicknameError("이미 사용 중인 닉네임입니다.") from exc
    return user
