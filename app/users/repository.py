import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.models import User


async def get_by_id(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await session.get(User, user_id)


async def get_by_google_sub(session: AsyncSession, google_sub: str) -> User | None:
    stmt = select(User).where(User.google_sub == google_sub)
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_by_nickname(session: AsyncSession, nickname: str) -> User | None:
    stmt = select(User).where(User.nickname == nickname)
    return (await session.execute(stmt)).scalar_one_or_none()


async def create(
    session: AsyncSession, *, google_sub: str, email: str, nickname: str
) -> User:
    user = User(google_sub=google_sub, email=email, nickname=nickname)
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


async def update_nickname(session: AsyncSession, user: User, nickname: str) -> User:
    user.nickname = nickname
    await session.flush()
    await session.refresh(user)
    return user
