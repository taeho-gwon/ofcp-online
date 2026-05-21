# 코스메틱 카탈로그 + Inventory + Loadout 구현 plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2.5단계 sub-project #1 — `cosmetics` / `user_cosmetic_inventory` / `user_cosmetic_loadout` 3 테이블 + REST 3 endpoint + 신규/기존 user 자동 부여 + 게임 ws 메시지에 상대 코스메틱 노출 + 프론트 마이페이지 슬롯 변경 UI까지 e2e로 동작.

**Architecture:** 공통 Item + JSONB metadata + Slot 기반 Loadout. `app/cosmetics/` 신규 도메인 모듈(6파일 표준). 신규 가입은 `app/auth/router.py`의 signup·dev_login 양쪽에서 `service.grant_defaults` 호출. 게임 시작 노출은 `app/api/ws.py`에서 `service.get_loadouts_for_users` 결과를 `display_names`와 같은 패턴으로 broadcast에 전달.

**Tech Stack:** FastAPI + SQLAlchemy 2.x async + Alembic + PostgreSQL ENUM/JSONB + Pydantic v2 + pytest-asyncio + React/Vite/TS + Zustand.

**Spec:** `docs/superpowers/specs/2026-05-21-cosmetics-catalog-loadout-design.md`

---

## File Structure

### 신규 백엔드
- `app/cosmetics/__init__.py` — 빈 패키지 마커
- `app/cosmetics/models.py` — `Cosmetic`, `UserCosmeticInventory`, `UserCosmeticLoadout` ORM
- `app/cosmetics/schemas.py` — Pydantic `CosmeticOut`, `MyCosmeticsOut`, `LoadoutUpdateIn`, `LoadoutOut`
- `app/cosmetics/repository.py` — 쿼리 함수만
- `app/cosmetics/service.py` — `grant_defaults`, `update_loadout`, `get_loadouts_for_users`
- `app/cosmetics/router.py` — 3 endpoint

### 신규 마이그레이션 (4 파일, alembic이 자동 생성)
1. cosmetic_category ENUM + `cosmetics` 테이블 + 시드 8 row
2. `user_cosmetic_inventory`
3. `user_cosmetic_loadout` (composite FK 포함)
4. 기존 user backfill (데이터 마이그레이션)

### 신규 테스트
- `tests/test_cosmetics_service.py` — 3 service 함수 강제 TDD
- `tests/test_cosmetics_api.py` — 라우터 통합
- `tests/test_ws_cosmetics.py` — ws 통합 (게임 메시지에 cosmetics 포함)

### 신규 프론트
- `frontend/src/api/cosmetics.ts`
- `frontend/src/store/cosmeticsStore.ts`
- `frontend/src/components/MyPage/CosmeticsSection.tsx`

### 수정 파일
- `app/api/router.py` — `cosmetics.router` include
- `app/auth/router.py` — signup() 분기 + dev_login() 분기에 `grant_defaults` 호출
- `app/api/ws.py` — `cosmetics_by_user` fetch + `broadcast` 인자 추가
- `tests/conftest.py` — `cosmetics.models` import + TRUNCATE 목록에 cosmetics 테이블 3개 추가
- `frontend/src/pages/MyPage.tsx` — "추가 예정" 섹션에서 "카드 스킨·코스메틱" 제거, `CosmeticsSection` 삽입

---

## Task 1: 모듈 골격 + conftest import + 라우터 등록

**Files:**
- Create: `app/cosmetics/__init__.py`
- Create: `app/cosmetics/models.py`
- Create: `app/cosmetics/schemas.py`
- Create: `app/cosmetics/repository.py`
- Create: `app/cosmetics/service.py`
- Create: `app/cosmetics/router.py`
- Modify: `app/api/router.py`
- Modify: `tests/conftest.py`

- [ ] **Step 1: 빈 모듈 골격 6파일 생성**

`app/cosmetics/__init__.py`:
```python
```

`app/cosmetics/models.py`:
```python
# Cosmetic, UserCosmeticInventory, UserCosmeticLoadout — Task 2에서 정의
```

`app/cosmetics/schemas.py`:
```python
# Pydantic schemas — Task 6에서 정의
```

`app/cosmetics/repository.py`:
```python
# 쿼리 함수 — Task 7에서 정의
```

`app/cosmetics/service.py`:
```python
# grant_defaults, update_loadout, get_loadouts_for_users — Task 8-10에서 정의
```

`app/cosmetics/router.py`:
```python
from fastapi import APIRouter

router = APIRouter(tags=["cosmetics"])
```

- [ ] **Step 2: api/router.py에 cosmetics 라우터 등록**

`app/api/router.py`:
```python
from fastapi import APIRouter

from app.api import games
from app.auth.router import router as auth_router
from app.cosmetics.router import router as cosmetics_router
from app.records.router import router as records_router
from app.rooms.router import rest_router as rooms_router
from app.users.router import router as users_router

router = APIRouter()
router.include_router(games.router)
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(rooms_router)
router.include_router(records_router)
router.include_router(cosmetics_router)
```

- [ ] **Step 3: conftest.py에 cosmetics models import + TRUNCATE 목록 확장**

`tests/conftest.py`의 import 블록 (`from app.records import models as _records_models` 다음 줄):
```python
from app.cosmetics import models as _cosmetics_models  # noqa: F401
from app.records import models as _records_models  # noqa: F401
from app.users import models as _users_models  # noqa: F401
```

`db_engine` fixture의 TRUNCATE 문을 다음으로 교체:
```python
await conn.execute(
    text(
        "TRUNCATE TABLE "
        "user_cosmetic_loadout, user_cosmetic_inventory, cosmetics, "
        "game_events, game_players, games, users "
        "RESTART IDENTITY CASCADE"
    )
)
```

- [ ] **Step 4: 앱이 import 가능한지 검증**

Run: `uv run python -c "from app.main import app; print('ok')"`
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add app/cosmetics/ app/api/router.py tests/conftest.py
git commit -m "feat(cosmetics): 모듈 골격 + 라우터 등록 + conftest TRUNCATE 확장"
```

---

## Task 2: ORM 모델 정의

**Files:**
- Modify: `app/cosmetics/models.py`

- [ ] **Step 1: 모델 3개 정의**

`app/cosmetics/models.py`:
```python
import uuid
from datetime import datetime

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

COSMETIC_CATEGORIES = ("card_back", "card_face", "table_theme", "title")
cosmetic_category_enum = Enum(
    *COSMETIC_CATEGORIES, name="cosmetic_category", create_type=False
)


class Cosmetic(Base):
    __tablename__ = "cosmetics"
    __table_args__ = (UniqueConstraint("category", "code", name="uq_cosmetics_cat_code"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category: Mapped[str] = mapped_column(cosmetic_category_enum, nullable=False)
    code: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )


class UserCosmeticInventory(Base):
    __tablename__ = "user_cosmetic_inventory"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    cosmetic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cosmetics.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    acquired_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    source: Mapped[str] = mapped_column(String, nullable=False, server_default="grant")


class UserCosmeticLoadout(Base):
    __tablename__ = "user_cosmetic_loadout"
    __table_args__ = (
        ForeignKeyConstraint(
            ("user_id", "cosmetic_id"),
            ("user_cosmetic_inventory.user_id", "user_cosmetic_inventory.cosmetic_id"),
            ondelete="CASCADE",
            name="fk_loadout_inventory",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    category: Mapped[str] = mapped_column(cosmetic_category_enum, primary_key=True)
    cosmetic_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
```

> `metadata_` 어트리뷰트 이름은 `metadata`가 SQLAlchemy의 reserved name이라 회피. 컬럼명은 그대로 `metadata`.
> `create_type=False`로 두는 이유: 마이그레이션이 ENUM을 명시적으로 만든다. 테스트 DB는 `Base.metadata.create_all`에서 자동 생성되도록 별도 처리 (Task 3 step에 conftest 보강 명시).

- [ ] **Step 2: 테스트 DB가 enum을 만들 수 있도록 conftest 보강**

`tests/conftest.py`의 `_setup_db` 안 `await conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))` 다음 줄에 ENUM DROP/CREATE 추가:
```python
await conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
await conn.execute(text("DROP TYPE IF EXISTS cosmetic_category"))
await conn.execute(
    text(
        "CREATE TYPE cosmetic_category AS ENUM "
        "('card_back', 'card_face', 'table_theme', 'title')"
    )
)
await conn.run_sync(Base.metadata.drop_all)
await conn.run_sync(Base.metadata.create_all)
```

- [ ] **Step 3: 앱이 여전히 import 가능한지 + 모델 메타데이터 검증**

Run:
```bash
uv run python -c "from app.cosmetics import models; print(sorted(t.name for t in models.Base.metadata.sorted_tables if 'cosmetic' in t.name))"
```
Expected: `['cosmetics', 'user_cosmetic_inventory', 'user_cosmetic_loadout']`

- [ ] **Step 4: Commit**

```bash
git add app/cosmetics/models.py tests/conftest.py
git commit -m "feat(cosmetics): ORM 모델 (Cosmetic, UserCosmeticInventory, UserCosmeticLoadout)"
```

---

## Task 3: 마이그레이션 1 — ENUM + cosmetics 테이블 + 시드 8 row

**Files:**
- Create: `migrations/versions/<rev1>_create_cosmetics_table.py`

- [ ] **Step 1: 빈 revision 생성**

Run: `uv run alembic revision -m "create cosmetics table"`
Expected: `Generating .../migrations/versions/<rev1>_create_cosmetics_table.py ... done`

방금 생성된 파일 경로를 기록.

- [ ] **Step 2: upgrade/downgrade 본문 작성**

생성된 파일 본문을 다음으로 교체 (revision id와 down_revision만 기존 값 유지):
```python
"""create cosmetics table

Revision ID: <rev1>
Revises: faa1a0411c89
Create Date: ...

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "<rev1>"
down_revision: str | Sequence[str] | None = "faa1a0411c89"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


COSMETIC_CATEGORIES = ("card_back", "card_face", "table_theme", "title")


SEED_ROWS = [
    ("card_back", "back.navy", "네이비", True, 0),
    ("card_back", "back.ocean", "오션", False, 1),
    ("card_face", "face.classic", "클래식", True, 0),
    ("card_face", "face.modern", "모던", False, 1),
    ("table_theme", "table.green", "그린 펠트", True, 0),
    ("table_theme", "table.walnut", "월넛", False, 1),
    ("title", "title.beginner", "초보자", True, 0),
    ("title", "title.fl_demon", "판타지랜드 악마", False, 1),
]


def upgrade() -> None:
    op.execute(
        "CREATE TYPE cosmetic_category AS ENUM "
        "('card_back', 'card_face', 'table_theme', 'title')"
    )
    op.create_table(
        "cosmetics",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(*COSMETIC_CATEGORIES, name="cosmetic_category", create_type=False),
            nullable=False,
        ),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("category", "code", name="uq_cosmetics_cat_code"),
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_cosmetics_default_per_category "
        "ON cosmetics (category) WHERE is_default"
    )
    for category, code, name, is_default, sort_order in SEED_ROWS:
        op.execute(
            sa.text(
                "INSERT INTO cosmetics (id, category, code, name, is_default, sort_order) "
                "VALUES (gen_random_uuid(), :cat, :code, :name, :is_default, :sort_order)"
            ).bindparams(
                cat=category,
                code=code,
                name=name,
                is_default=is_default,
                sort_order=sort_order,
            )
        )


def downgrade() -> None:
    op.drop_index("uq_cosmetics_default_per_category", table_name="cosmetics")
    op.drop_table("cosmetics")
    op.execute("DROP TYPE cosmetic_category")
```

> `gen_random_uuid()`는 pgcrypto 또는 PostgreSQL 13+ 내장. 만약 운영 PG 버전이 13 미만이면 `uuid-ossp` 확장 후 `uuid_generate_v4()`로 변경. (현 docker-compose의 postgres:16라면 내장이라 그대로 OK.)

- [ ] **Step 3: upgrade head 실행해 적용 확인**

Run: `uv run alembic upgrade head`
Expected: `Running upgrade faa1a0411c89 -> <rev1>, create cosmetics table`

- [ ] **Step 4: 시드 row 8개 확인**

Run:
```bash
docker compose exec -T postgres psql -U ofcp -d ofcp -c "SELECT category, code, name, is_default FROM cosmetics ORDER BY category, sort_order"
```
Expected: 8 row, card_back 2 / card_face 2 / table_theme 2 / title 2.

- [ ] **Step 5: downgrade 실행해 롤백 가능성 확인**

Run: `uv run alembic downgrade -1`
Expected: cosmetics 테이블·ENUM 모두 삭제됨. 다시 `alembic upgrade head`로 복구.

- [ ] **Step 6: Commit**

```bash
git add migrations/versions/<rev1>_create_cosmetics_table.py
git commit -m "feat(cosmetics): 마이그 1 — cosmetic_category ENUM + cosmetics 테이블 + 시드 8 row"
```

---

## Task 4: 마이그레이션 2 — user_cosmetic_inventory

**Files:**
- Create: `migrations/versions/<rev2>_create_user_cosmetic_inventory.py`

- [ ] **Step 1: revision 생성**

Run: `uv run alembic revision -m "create user_cosmetic_inventory"`
Expected: 파일 경로 출력. down_revision이 Task 3의 `<rev1>`인지 확인.

- [ ] **Step 2: upgrade/downgrade 작성**

생성된 파일 본문:
```python
"""create user_cosmetic_inventory

Revision ID: <rev2>
Revises: <rev1>
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "<rev2>"
down_revision: str | Sequence[str] | None = "<rev1>"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_cosmetic_inventory",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("cosmetic_id", sa.UUID(), nullable=False),
        sa.Column(
            "acquired_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("source", sa.String(), nullable=False, server_default="grant"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["cosmetic_id"], ["cosmetics.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("user_id", "cosmetic_id"),
    )


def downgrade() -> None:
    op.drop_table("user_cosmetic_inventory")
```

- [ ] **Step 3: 적용 + 롤백 사이클 검증**

Run: `uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head`
Expected: 마지막 출력에 `<rev2>` 적용 로그.

- [ ] **Step 4: Commit**

```bash
git add migrations/versions/<rev2>_create_user_cosmetic_inventory.py
git commit -m "feat(cosmetics): 마이그 2 — user_cosmetic_inventory"
```

---

## Task 5: 마이그레이션 3 — user_cosmetic_loadout (composite FK)

**Files:**
- Create: `migrations/versions/<rev3>_create_user_cosmetic_loadout.py`

- [ ] **Step 1: revision 생성**

Run: `uv run alembic revision -m "create user_cosmetic_loadout"`

- [ ] **Step 2: 본문 작성**

```python
"""create user_cosmetic_loadout

Revision ID: <rev3>
Revises: <rev2>
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "<rev3>"
down_revision: str | Sequence[str] | None = "<rev2>"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_cosmetic_loadout",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                "card_back", "card_face", "table_theme", "title",
                name="cosmetic_category", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("cosmetic_id", sa.UUID(), nullable=False),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["user_id", "cosmetic_id"],
            ["user_cosmetic_inventory.user_id", "user_cosmetic_inventory.cosmetic_id"],
            ondelete="CASCADE",
            name="fk_loadout_inventory",
        ),
        sa.PrimaryKeyConstraint("user_id", "category"),
    )


def downgrade() -> None:
    op.drop_table("user_cosmetic_loadout")
```

- [ ] **Step 3: 적용 + 롤백 검증**

Run: `uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head`

- [ ] **Step 4: Commit**

```bash
git add migrations/versions/<rev3>_create_user_cosmetic_loadout.py
git commit -m "feat(cosmetics): 마이그 3 — user_cosmetic_loadout (composite FK)"
```

---

## Task 6: Pydantic schemas

**Files:**
- Modify: `app/cosmetics/schemas.py`

- [ ] **Step 1: schemas 정의**

`app/cosmetics/schemas.py`:
```python
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

CosmeticCategory = Literal["card_back", "card_face", "table_theme", "title"]


class CosmeticOut(BaseModel):
    id: uuid.UUID
    category: CosmeticCategory
    code: str
    name: str
    is_default: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class LoadoutOut(BaseModel):
    card_back: uuid.UUID
    card_face: uuid.UUID
    table_theme: uuid.UUID
    title: uuid.UUID


class MyCosmeticsOut(BaseModel):
    owned: list[uuid.UUID] = Field(default_factory=list)
    loadout: LoadoutOut


class LoadoutUpdateIn(BaseModel):
    card_back: uuid.UUID
    card_face: uuid.UUID
    table_theme: uuid.UUID
    title: uuid.UUID
```

- [ ] **Step 2: import 검증**

Run: `uv run python -c "from app.cosmetics import schemas; print(schemas.LoadoutUpdateIn.model_fields.keys())"`
Expected: `dict_keys(['card_back', 'card_face', 'table_theme', 'title'])`

- [ ] **Step 3: Commit**

```bash
git add app/cosmetics/schemas.py
git commit -m "feat(cosmetics): Pydantic schemas (CosmeticOut, MyCosmeticsOut, LoadoutOut, LoadoutUpdateIn)"
```

---

## Task 7: repository.py

**Files:**
- Modify: `app/cosmetics/repository.py`

- [ ] **Step 1: 쿼리 함수 정의**

`app/cosmetics/repository.py`:
```python
import uuid
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.cosmetics.models import Cosmetic, UserCosmeticInventory, UserCosmeticLoadout


async def list_all_cosmetics(session: AsyncSession) -> list[Cosmetic]:
    stmt = select(Cosmetic).order_by(Cosmetic.category, Cosmetic.sort_order)
    return list((await session.execute(stmt)).scalars().all())


async def get_cosmetics_by_ids(
    session: AsyncSession, ids: Iterable[uuid.UUID]
) -> list[Cosmetic]:
    ids = list(ids)
    if not ids:
        return []
    stmt = select(Cosmetic).where(Cosmetic.id.in_(ids))
    return list((await session.execute(stmt)).scalars().all())


async def list_inventory_for_user(
    session: AsyncSession, user_id: uuid.UUID
) -> list[uuid.UUID]:
    stmt = select(UserCosmeticInventory.cosmetic_id).where(
        UserCosmeticInventory.user_id == user_id
    )
    return list((await session.execute(stmt)).scalars().all())


async def get_loadout_for_user(
    session: AsyncSession, user_id: uuid.UUID
) -> dict[str, uuid.UUID]:
    stmt = select(
        UserCosmeticLoadout.category, UserCosmeticLoadout.cosmetic_id
    ).where(UserCosmeticLoadout.user_id == user_id)
    return {cat: cid for cat, cid in (await session.execute(stmt)).all()}


async def insert_inventory_ignore_conflict(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    cosmetic_ids: Iterable[uuid.UUID],
    source: str = "grant",
) -> None:
    rows = [{"user_id": user_id, "cosmetic_id": cid, "source": source} for cid in cosmetic_ids]
    if not rows:
        return
    stmt = pg_insert(UserCosmeticInventory).values(rows).on_conflict_do_nothing(
        index_elements=[UserCosmeticInventory.user_id, UserCosmeticInventory.cosmetic_id]
    )
    await session.execute(stmt)


async def insert_loadout_ignore_conflict(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    items: dict[str, uuid.UUID],
) -> None:
    rows = [
        {"user_id": user_id, "category": cat, "cosmetic_id": cid}
        for cat, cid in items.items()
    ]
    if not rows:
        return
    stmt = pg_insert(UserCosmeticLoadout).values(rows).on_conflict_do_nothing(
        index_elements=[UserCosmeticLoadout.user_id, UserCosmeticLoadout.category]
    )
    await session.execute(stmt)


async def upsert_loadout(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    items: dict[str, uuid.UUID],
) -> None:
    rows = [
        {"user_id": user_id, "category": cat, "cosmetic_id": cid}
        for cat, cid in items.items()
    ]
    stmt = pg_insert(UserCosmeticLoadout).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=[UserCosmeticLoadout.user_id, UserCosmeticLoadout.category],
        set_={"cosmetic_id": stmt.excluded.cosmetic_id},
    )
    await session.execute(stmt)


async def get_loadouts_with_codes(
    session: AsyncSession, user_ids: Iterable[uuid.UUID]
) -> list[tuple[uuid.UUID, str, str]]:
    """user_id, category, code 튜플 list — 단일 쿼리.

    Loadout row가 없는 user는 비어있어 fallback을 호출자가 처리.
    """
    user_ids = list(user_ids)
    if not user_ids:
        return []
    stmt = (
        select(
            UserCosmeticLoadout.user_id,
            UserCosmeticLoadout.category,
            Cosmetic.code,
        )
        .join(Cosmetic, Cosmetic.id == UserCosmeticLoadout.cosmetic_id)
        .where(UserCosmeticLoadout.user_id.in_(user_ids))
    )
    return list((await session.execute(stmt)).all())


async def get_default_codes_by_category(session: AsyncSession) -> dict[str, str]:
    """category별 default cosmetic의 code — fallback용."""
    stmt = select(Cosmetic.category, Cosmetic.code).where(Cosmetic.is_default.is_(True))
    return {cat: code for cat, code in (await session.execute(stmt)).all()}
```

- [ ] **Step 2: import 검증**

Run: `uv run python -c "from app.cosmetics import repository; print([f for f in dir(repository) if not f.startswith('_')][:10])"`
Expected: 정의된 함수들이 출력.

- [ ] **Step 3: Commit**

```bash
git add app/cosmetics/repository.py
git commit -m "feat(cosmetics): repository — list/get/insert/upsert + JOIN 쿼리"
```

---

## Task 8: service.grant_defaults — TDD

**Files:**
- Create: `tests/test_cosmetics_service.py`
- Modify: `app/cosmetics/service.py`

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_cosmetics_service.py`:
```python
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cosmetics import repository as cosmetics_repo
from app.cosmetics import service as cosmetics_service
from app.cosmetics.models import Cosmetic, UserCosmeticInventory, UserCosmeticLoadout
from app.users import service as users_service


async def _make_user(session: AsyncSession, nickname: str):
    user = await users_service.create_user(
        session,
        google_sub=f"sub:{nickname}",
        email=f"{nickname}@t.local",
        nickname=nickname,
    )
    await session.flush()
    return user


@pytest.fixture
async def _seed_catalog(db_session: AsyncSession):
    """카탈로그 8 row를 직접 INSERT — 테스트 DB는 마이그레이션을 안 거치므로."""
    rows = [
        ("card_back", "back.navy", "네이비", True, 0),
        ("card_back", "back.ocean", "오션", False, 1),
        ("card_face", "face.classic", "클래식", True, 0),
        ("card_face", "face.modern", "모던", False, 1),
        ("table_theme", "table.green", "그린", True, 0),
        ("table_theme", "table.walnut", "월넛", False, 1),
        ("title", "title.beginner", "초보자", True, 0),
        ("title", "title.fl_demon", "FL악마", False, 1),
    ]
    for cat, code, name, is_default, sort_order in rows:
        db_session.add(
            Cosmetic(
                category=cat,
                code=code,
                name=name,
                is_default=is_default,
                sort_order=sort_order,
            )
        )
    await db_session.flush()
    return rows


@pytest.mark.asyncio
async def test_grant_defaults_new_user_inventory_and_loadout(
    db_session: AsyncSession, _seed_catalog
):
    user = await _make_user(db_session, "alice")

    await cosmetics_service.grant_defaults(db_session, user.id)
    await db_session.flush()

    inv_ids = await cosmetics_repo.list_inventory_for_user(db_session, user.id)
    assert len(inv_ids) == 8

    loadout = await cosmetics_repo.get_loadout_for_user(db_session, user.id)
    assert set(loadout.keys()) == {"card_back", "card_face", "table_theme", "title"}

    codes = (
        await db_session.execute(
            select(Cosmetic.category, Cosmetic.code, Cosmetic.id).where(
                Cosmetic.is_default.is_(True)
            )
        )
    ).all()
    default_by_cat = {cat: cid for cat, _code, cid in codes}
    for cat, cid in default_by_cat.items():
        assert loadout[cat] == cid


@pytest.mark.asyncio
async def test_grant_defaults_idempotent_preserves_user_selection(
    db_session: AsyncSession, _seed_catalog
):
    user = await _make_user(db_session, "bob")
    await cosmetics_service.grant_defaults(db_session, user.id)

    # 유저가 alt(card_back.ocean)로 변경
    ocean = (
        await db_session.execute(
            select(Cosmetic).where(Cosmetic.code == "back.ocean")
        )
    ).scalar_one()
    await cosmetics_repo.upsert_loadout(
        db_session, user_id=user.id, items={"card_back": ocean.id}
    )
    await db_session.flush()

    # 다시 grant_defaults 호출 — 사용자 선택 보존
    await cosmetics_service.grant_defaults(db_session, user.id)
    await db_session.flush()

    loadout = await cosmetics_repo.get_loadout_for_user(db_session, user.id)
    assert loadout["card_back"] == ocean.id
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `uv run pytest tests/test_cosmetics_service.py -v`
Expected: `AttributeError: module 'app.cosmetics.service' has no attribute 'grant_defaults'` 또는 동등 import 실패.

- [ ] **Step 3: grant_defaults 구현**

`app/cosmetics/service.py`:
```python
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cosmetics import repository as repo
from app.cosmetics.models import Cosmetic


async def grant_defaults(session: AsyncSession, user_id: uuid.UUID) -> None:
    """모든 카탈로그를 inventory에 ON CONFLICT DO NOTHING 부여 +
    category별 default를 loadout에 ON CONFLICT DO NOTHING 부여 (idempotent)."""
    cosmetics = await repo.list_all_cosmetics(session)
    await repo.insert_inventory_ignore_conflict(
        session,
        user_id=user_id,
        cosmetic_ids=[c.id for c in cosmetics],
    )
    defaults: dict[str, uuid.UUID] = {
        c.category: c.id for c in cosmetics if c.is_default
    }
    await repo.insert_loadout_ignore_conflict(
        session, user_id=user_id, items=defaults
    )
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `uv run pytest tests/test_cosmetics_service.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add app/cosmetics/service.py tests/test_cosmetics_service.py
git commit -m "feat(cosmetics): service.grant_defaults + 테스트 (신규/idempotent)"
```

---

## Task 9: service.update_loadout — TDD

**Files:**
- Modify: `tests/test_cosmetics_service.py`
- Modify: `app/cosmetics/service.py`

- [ ] **Step 1: 실패 테스트 추가**

`tests/test_cosmetics_service.py` 파일 끝에 추가:
```python
from app.cosmetics.schemas import LoadoutUpdateIn


@pytest.mark.asyncio
async def test_update_loadout_happy(db_session: AsyncSession, _seed_catalog):
    user = await _make_user(db_session, "carol")
    await cosmetics_service.grant_defaults(db_session, user.id)

    catalog = {(c.category, c.code): c.id for c in await cosmetics_repo.list_all_cosmetics(db_session)}
    payload = LoadoutUpdateIn(
        card_back=catalog[("card_back", "back.ocean")],
        card_face=catalog[("card_face", "face.modern")],
        table_theme=catalog[("table_theme", "table.walnut")],
        title=catalog[("title", "title.fl_demon")],
    )

    result = await cosmetics_service.update_loadout(db_session, user.id, payload)
    await db_session.flush()

    assert result.card_back == catalog[("card_back", "back.ocean")]
    loadout = await cosmetics_repo.get_loadout_for_user(db_session, user.id)
    assert loadout["card_back"] == catalog[("card_back", "back.ocean")]
    assert loadout["title"] == catalog[("title", "title.fl_demon")]


@pytest.mark.asyncio
async def test_update_loadout_not_owned(db_session: AsyncSession, _seed_catalog):
    """다른 user의 cosmetic을 owner 검사로 거부."""
    user = await _make_user(db_session, "dave")
    await cosmetics_service.grant_defaults(db_session, user.id)

    # owner 검사 시뮬레이션: 인벤토리에서 한 row 삭제 후 그걸 장착 시도
    catalog = {c.code: c for c in await cosmetics_repo.list_all_cosmetics(db_session)}
    ocean = catalog["back.ocean"]
    await db_session.execute(
        UserCosmeticInventory.__table__.delete().where(
            (UserCosmeticInventory.user_id == user.id)
            & (UserCosmeticInventory.cosmetic_id == ocean.id)
        )
    )
    await db_session.flush()

    payload = LoadoutUpdateIn(
        card_back=ocean.id,
        card_face=catalog["face.classic"].id,
        table_theme=catalog["table.green"].id,
        title=catalog["title.beginner"].id,
    )

    with pytest.raises(cosmetics_service.LoadoutValidationError):
        await cosmetics_service.update_loadout(db_session, user.id, payload)


@pytest.mark.asyncio
async def test_update_loadout_category_mismatch(db_session: AsyncSession, _seed_catalog):
    """title 슬롯에 card_back을 보내면 거부."""
    user = await _make_user(db_session, "eve")
    await cosmetics_service.grant_defaults(db_session, user.id)
    catalog = {c.code: c for c in await cosmetics_repo.list_all_cosmetics(db_session)}

    payload = LoadoutUpdateIn(
        card_back=catalog["back.navy"].id,
        card_face=catalog["face.classic"].id,
        table_theme=catalog["table.green"].id,
        title=catalog["back.ocean"].id,  # 카테고리 불일치
    )
    with pytest.raises(cosmetics_service.LoadoutValidationError):
        await cosmetics_service.update_loadout(db_session, user.id, payload)


@pytest.mark.asyncio
async def test_update_loadout_unknown_cosmetic(
    db_session: AsyncSession, _seed_catalog
):
    """존재하지 않는 cosmetic_id 거부."""
    user = await _make_user(db_session, "frank")
    await cosmetics_service.grant_defaults(db_session, user.id)
    catalog = {c.code: c for c in await cosmetics_repo.list_all_cosmetics(db_session)}

    payload = LoadoutUpdateIn(
        card_back=uuid.uuid4(),  # 존재하지 않음
        card_face=catalog["face.classic"].id,
        table_theme=catalog["table.green"].id,
        title=catalog["title.beginner"].id,
    )
    with pytest.raises(cosmetics_service.LoadoutValidationError):
        await cosmetics_service.update_loadout(db_session, user.id, payload)
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `uv run pytest tests/test_cosmetics_service.py::test_update_loadout_happy -v`
Expected: `AttributeError: module 'app.cosmetics.service' has no attribute 'update_loadout'`.

- [ ] **Step 3: update_loadout 구현**

`app/cosmetics/service.py` 파일 끝에 추가:
```python
from app.cosmetics.schemas import LoadoutOut, LoadoutUpdateIn

ALL_CATEGORIES = ("card_back", "card_face", "table_theme", "title")


class LoadoutValidationError(ValueError):
    """장착 검증 실패."""


async def update_loadout(
    session: AsyncSession,
    user_id: uuid.UUID,
    payload: LoadoutUpdateIn,
) -> LoadoutOut:
    """4 슬롯 묶음 갱신.
    1) 4 cosmetic_id를 한 쿼리로 fetch
    2) 모두 존재 확인
    3) category 일치 검증
    4) 모두 user inventory에 있는지 검증
    5) UPSERT 4 row
    실패 시 LoadoutValidationError.
    """
    requested: dict[str, uuid.UUID] = {
        "card_back": payload.card_back,
        "card_face": payload.card_face,
        "table_theme": payload.table_theme,
        "title": payload.title,
    }

    cosmetics = await repo.get_cosmetics_by_ids(session, requested.values())
    by_id = {c.id: c for c in cosmetics}

    for cat, cid in requested.items():
        c = by_id.get(cid)
        if c is None:
            raise LoadoutValidationError(f"cosmetic 없음: {cid}")
        if c.category != cat:
            raise LoadoutValidationError(
                f"슬롯 {cat}에 {c.category} 아이템 장착 불가"
            )

    inventory = set(await repo.list_inventory_for_user(session, user_id))
    for cat, cid in requested.items():
        if cid not in inventory:
            raise LoadoutValidationError(f"소유하지 않은 아이템: {cid}")

    await repo.upsert_loadout(session, user_id=user_id, items=requested)
    return LoadoutOut(**requested)
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `uv run pytest tests/test_cosmetics_service.py -v`
Expected: 6 passed (Task 8의 2개 + 본 task의 4개).

- [ ] **Step 5: Commit**

```bash
git add app/cosmetics/service.py tests/test_cosmetics_service.py
git commit -m "feat(cosmetics): service.update_loadout + 테스트 (happy/not-owned/cat-mismatch/unknown)"
```

---

## Task 10: service.get_loadouts_for_users + 단일 쿼리 보장 — TDD

**Files:**
- Modify: `tests/test_cosmetics_service.py`
- Modify: `app/cosmetics/service.py`

- [ ] **Step 1: 실패 테스트 추가**

`tests/test_cosmetics_service.py` 파일 끝에 추가:
```python
from sqlalchemy import event


@pytest.mark.asyncio
async def test_get_loadouts_for_users_multi(db_session: AsyncSession, _seed_catalog):
    u1 = await _make_user(db_session, "g1")
    u2 = await _make_user(db_session, "g2")
    await cosmetics_service.grant_defaults(db_session, u1.id)
    await cosmetics_service.grant_defaults(db_session, u2.id)
    await db_session.flush()

    result = await cosmetics_service.get_loadouts_for_users(
        db_session, [u1.id, u2.id]
    )
    assert set(result.keys()) == {u1.id, u2.id}
    assert result[u1.id]["card_back"] == "back.navy"
    assert result[u1.id]["title"] == "title.beginner"
    assert result[u2.id]["card_face"] == "face.classic"


@pytest.mark.asyncio
async def test_get_loadouts_for_users_empty(db_session: AsyncSession, _seed_catalog):
    result = await cosmetics_service.get_loadouts_for_users(db_session, [])
    assert result == {}


@pytest.mark.asyncio
async def test_get_loadouts_for_users_fallback_when_missing_row(
    db_session: AsyncSession, _seed_catalog
):
    """loadout row가 비어있는 user는 카테고리별 default code로 fallback."""
    user = await _make_user(db_session, "h1")
    await cosmetics_service.grant_defaults(db_session, user.id)
    # 일부 슬롯 삭제로 부분 누락 시뮬레이션
    await db_session.execute(
        UserCosmeticLoadout.__table__.delete().where(
            (UserCosmeticLoadout.user_id == user.id)
            & (UserCosmeticLoadout.category == "title")
        )
    )
    await db_session.flush()

    result = await cosmetics_service.get_loadouts_for_users(db_session, [user.id])
    assert result[user.id]["title"] == "title.beginner"  # default fallback


@pytest.mark.asyncio
async def test_get_loadouts_for_users_single_query(
    db_session: AsyncSession, _seed_catalog
):
    """N+1 회귀 방지: get_loadouts_for_users 호출 중 SELECT 2회 이하 (JOIN 1 + defaults 1)."""
    u1 = await _make_user(db_session, "q1")
    u2 = await _make_user(db_session, "q2")
    u3 = await _make_user(db_session, "q3")
    for u in (u1, u2, u3):
        await cosmetics_service.grant_defaults(db_session, u.id)
    await db_session.flush()

    select_count = 0
    bind = db_session.get_bind()

    def _counter(conn, cursor, statement, parameters, context, executemany):
        nonlocal select_count
        if statement.lstrip().upper().startswith("SELECT"):
            select_count += 1

    event.listen(bind.sync_engine, "before_cursor_execute", _counter)
    try:
        await cosmetics_service.get_loadouts_for_users(
            db_session, [u1.id, u2.id, u3.id]
        )
    finally:
        event.remove(bind.sync_engine, "before_cursor_execute", _counter)

    assert select_count <= 2, f"expected ≤2 SELECTs, got {select_count}"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `uv run pytest tests/test_cosmetics_service.py::test_get_loadouts_for_users_multi -v`
Expected: `AttributeError: ... no attribute 'get_loadouts_for_users'`.

- [ ] **Step 3: get_loadouts_for_users 구현**

`app/cosmetics/service.py` 파일 끝에 추가:
```python
async def get_loadouts_for_users(
    session: AsyncSession,
    user_ids: list[uuid.UUID],
) -> dict[uuid.UUID, dict[str, str]]:
    """게임 시작 시 N+1 없이 user별 loadout(code 문자열)을 가져온다.

    누락된 (user, category)는 카테고리별 default cosmetic의 code로 fallback.
    """
    if not user_ids:
        return {}

    rows = await repo.get_loadouts_with_codes(session, user_ids)
    defaults = await repo.get_default_codes_by_category(session)

    result: dict[uuid.UUID, dict[str, str]] = {
        uid: dict(defaults) for uid in user_ids
    }
    for uid, cat, code in rows:
        result[uid][cat] = code
    return result
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `uv run pytest tests/test_cosmetics_service.py -v`
Expected: 10 passed.

- [ ] **Step 5: Commit**

```bash
git add app/cosmetics/service.py tests/test_cosmetics_service.py
git commit -m "feat(cosmetics): service.get_loadouts_for_users + N+1 회귀 방지 테스트"
```

---

## Task 11: router.py + 통합 테스트

**Files:**
- Modify: `app/cosmetics/router.py`
- Create: `tests/test_cosmetics_api.py`

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_cosmetics_api.py`:
```python
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import jwt as jwt_lib
from app.cosmetics import repository as cosmetics_repo
from app.cosmetics import service as cosmetics_service
from app.cosmetics.models import Cosmetic
from app.users import service as users_service


async def _seed_8(session: AsyncSession):
    rows = [
        ("card_back", "back.navy", "네이비", True, 0),
        ("card_back", "back.ocean", "오션", False, 1),
        ("card_face", "face.classic", "클래식", True, 0),
        ("card_face", "face.modern", "모던", False, 1),
        ("table_theme", "table.green", "그린", True, 0),
        ("table_theme", "table.walnut", "월넛", False, 1),
        ("title", "title.beginner", "초보자", True, 0),
        ("title", "title.fl_demon", "FL악마", False, 1),
    ]
    for cat, code, name, is_default, sort_order in rows:
        session.add(
            Cosmetic(
                category=cat, code=code, name=name,
                is_default=is_default, sort_order=sort_order,
            )
        )
    await session.flush()


@pytest.mark.asyncio
async def test_get_catalog_returns_8_rows(client: AsyncClient, db_session: AsyncSession):
    await _seed_8(db_session)
    await db_session.commit()

    res = await client.get("/api/cosmetics/catalog")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 8
    cats = {item["category"] for item in body}
    assert cats == {"card_back", "card_face", "table_theme", "title"}


@pytest.mark.asyncio
async def test_get_me_cosmetics_requires_auth(client: AsyncClient):
    res = await client.get("/api/me/cosmetics")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_get_me_cosmetics_returns_owned_and_loadout(
    client: AsyncClient, db_session: AsyncSession
):
    await _seed_8(db_session)
    user = await users_service.create_user(
        db_session, google_sub="api:alice", email="a@t.local", nickname="alice_api"
    )
    await cosmetics_service.grant_defaults(db_session, user.id)
    await db_session.commit()
    token = jwt_lib.issue_access(user.id)

    res = await client.get(
        "/api/me/cosmetics", headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body["owned"]) == 8
    assert set(body["loadout"].keys()) == {"card_back", "card_face", "table_theme", "title"}


@pytest.mark.asyncio
async def test_put_loadout_happy(client: AsyncClient, db_session: AsyncSession):
    await _seed_8(db_session)
    user = await users_service.create_user(
        db_session, google_sub="api:bob", email="b@t.local", nickname="bob_api"
    )
    await cosmetics_service.grant_defaults(db_session, user.id)
    await db_session.commit()
    token = jwt_lib.issue_access(user.id)

    catalog = {c.code: c for c in await cosmetics_repo.list_all_cosmetics(db_session)}
    body = {
        "card_back": str(catalog["back.ocean"].id),
        "card_face": str(catalog["face.modern"].id),
        "table_theme": str(catalog["table.walnut"].id),
        "title": str(catalog["title.fl_demon"].id),
    }
    res = await client.put(
        "/api/me/cosmetics/loadout",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["card_back"] == body["card_back"]


@pytest.mark.asyncio
async def test_put_loadout_category_mismatch_returns_422(
    client: AsyncClient, db_session: AsyncSession
):
    await _seed_8(db_session)
    user = await users_service.create_user(
        db_session, google_sub="api:carol", email="c@t.local", nickname="carol_api"
    )
    await cosmetics_service.grant_defaults(db_session, user.id)
    await db_session.commit()
    token = jwt_lib.issue_access(user.id)

    catalog = {c.code: c for c in await cosmetics_repo.list_all_cosmetics(db_session)}
    body = {
        "card_back": str(catalog["back.navy"].id),
        "card_face": str(catalog["face.classic"].id),
        "table_theme": str(catalog["table.green"].id),
        "title": str(catalog["back.ocean"].id),  # 카테고리 불일치
    }
    res = await client.put(
        "/api/me/cosmetics/loadout",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `uv run pytest tests/test_cosmetics_api.py -v`
Expected: 5개 모두 fail (라우터 미구현으로 404 등).

- [ ] **Step 3: router.py 구현**

`app/cosmetics/router.py`:
```python
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.core.db import get_session
from app.cosmetics import repository as repo
from app.cosmetics import service
from app.cosmetics.schemas import (
    CosmeticOut,
    LoadoutOut,
    LoadoutUpdateIn,
    MyCosmeticsOut,
)
from app.users.models import User

router = APIRouter(tags=["cosmetics"])


@router.get("/cosmetics/catalog", response_model=list[CosmeticOut])
async def get_catalog(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[CosmeticOut]:
    items = await repo.list_all_cosmetics(session)
    return [CosmeticOut.model_validate(c) for c in items]


@router.get("/me/cosmetics", response_model=MyCosmeticsOut)
async def get_my_cosmetics(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MyCosmeticsOut:
    owned = await repo.list_inventory_for_user(session, user.id)
    loadout_map = await repo.get_loadout_for_user(session, user.id)

    # 부분 누락 시 default로 fallback (이론적으로 없지만 안전망)
    if set(loadout_map.keys()) != {"card_back", "card_face", "table_theme", "title"}:
        all_cos = await repo.list_all_cosmetics(session)
        defaults_id: dict[str, uuid.UUID] = {
            c.category: c.id for c in all_cos if c.is_default
        }
        for cat, cid in defaults_id.items():
            loadout_map.setdefault(cat, cid)

    return MyCosmeticsOut(
        owned=owned,
        loadout=LoadoutOut(**loadout_map),
    )


@router.put("/me/cosmetics/loadout", response_model=LoadoutOut)
async def put_loadout(
    payload: LoadoutUpdateIn,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LoadoutOut:
    try:
        result = await service.update_loadout(session, user.id, payload)
    except service.LoadoutValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    await session.commit()
    return result
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `uv run pytest tests/test_cosmetics_api.py -v`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add app/cosmetics/router.py tests/test_cosmetics_api.py
git commit -m "feat(cosmetics): REST 3 endpoint (catalog/me/PUT loadout) + 통합 테스트"
```

---

## Task 12: auth/router.py signup·dev_login에 grant_defaults 통합

**Files:**
- Modify: `app/auth/router.py`
- Modify: `tests/test_auth_flow.py` (또는 신규 검증 추가)

- [ ] **Step 1: 실패 테스트 추가**

`tests/test_auth_flow.py` 파일 끝에 추가:
```python
@pytest.mark.asyncio
async def test_signup_grants_default_cosmetics(
    client: AsyncClient, db_session: AsyncSession, monkeypatch
):
    """signup 직후 inventory·loadout이 default로 채워져야 함."""
    from app.cosmetics import service as cosmetics_service
    from app.cosmetics.models import Cosmetic

    # 카탈로그 시드
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
        db_session.add(
            Cosmetic(category=cat, code=code, name=name, is_default=is_default)
        )
    await db_session.commit()

    # dev_login으로 신규 가입
    res = await client.post("/api/auth/dev-login", json={"nickname": "newbie_x"})
    assert res.status_code == 200
    user_id_str = res.json()["user"]["id"]

    # 같은 user에 대해 inventory·loadout 검증
    import uuid

    from app.cosmetics import repository as cosmetics_repo

    user_id = uuid.UUID(user_id_str)
    inv = await cosmetics_repo.list_inventory_for_user(db_session, user_id)
    loadout = await cosmetics_repo.get_loadout_for_user(db_session, user_id)
    assert len(inv) == 8
    assert set(loadout.keys()) == {"card_back", "card_face", "table_theme", "title"}
```

> `dev_login`은 settings.dev_auth_enabled 가드. 테스트 환경에서 true여야 한다. `app/config.py`·테스트 fixture 확인 (현 test 환경에서 dev_auth_enabled=true로 보임 — `test_auth_flow.py`에 이미 dev-login 호출 테스트 존재).

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `uv run pytest tests/test_auth_flow.py::test_signup_grants_default_cosmetics -v`
Expected: `len(inv) == 8` 실패 (현재 0).

- [ ] **Step 3: auth/router.py 수정 — signup·dev_login에 grant_defaults 호출**

`app/auth/router.py` 상단 import에 추가:
```python
from app.cosmetics import service as cosmetics_service
```

`signup` 함수 안 `user = await users_service.create_user(...)` 뒤·`await session.commit()` 앞에 추가:
```python
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
```

`dev_login` 함수도 동일 — 신규 user 생성 분기에서 commit 직전:
```python
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
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `uv run pytest tests/test_auth_flow.py -v`
Expected: 모두 통과. 기존 다른 dev-login 테스트가 깨지지 않아야 함 (카탈로그 비어있으면 grant_defaults는 no-op이라 안전).

- [ ] **Step 5: Commit**

```bash
git add app/auth/router.py tests/test_auth_flow.py
git commit -m "feat(cosmetics): signup·dev_login에서 grant_defaults 호출 + 테스트"
```

---

## Task 13: ws.py — cosmetics fetch + broadcast 통합

**Files:**
- Modify: `app/api/ws.py`
- Create: `tests/test_ws_cosmetics.py`

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_ws_cosmetics.py`:
```python
import json
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import jwt as jwt_lib
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
        session.add(
            Cosmetic(category=cat, code=code, name=name, is_default=is_default)
        )
    await session.flush()


@pytest.mark.asyncio
async def test_ws_state_message_contains_cosmetics(
    client: AsyncClient, db_session: AsyncSession
):
    """2 user 게임 시작 시 ws state 메시지에 players[].cosmetics가 포함되어야 함."""
    await _seed_catalog(db_session)
    u1 = await users_service.create_user(
        db_session, google_sub="ws:1", email="1@t.local", nickname="wsuser1"
    )
    u2 = await users_service.create_user(
        db_session, google_sub="ws:2", email="2@t.local", nickname="wsuser2"
    )
    await cosmetics_service.grant_defaults(db_session, u1.id)
    await cosmetics_service.grant_defaults(db_session, u2.id)
    await db_session.commit()

    # 게임 생성 (POST /api/games)
    token1 = jwt_lib.issue_access(u1.id)
    res = await client.post(
        "/api/games",
        json={"player_ids": [str(u1.id), str(u2.id)], "ruleset": "pineapple"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert res.status_code in (200, 201)
    game = res.json()
    game_id = game["game_id"]

    # ws 연결해 첫 state 메시지 수신
    from httpx_ws import aconnect_ws  # type: ignore

    async with aconnect_ws(
        f"/ws/games/{game_id}?token={token1}", client=client
    ) as ws:
        msg = json.loads(await ws.receive_text())

    assert msg["type"] == "state"
    players = msg["data"]["players"]
    # 양쪽 player 모두 cosmetics 키를 가짐
    for p in players:
        assert "cosmetics" in p
        assert set(p["cosmetics"].keys()) == {
            "card_back", "card_face", "table_theme", "title"
        }
        assert p["cosmetics"]["card_back"] == "back.navy"
```

> `httpx_ws` 의존성 필요 — 기존 ws 테스트가 어떻게 작성됐는지 보고 동일 패턴 사용. 만약 의존성 없으면 `uv add --dev httpx-ws` 추가 단계 필요.

- [ ] **Step 2: 의존성 확인**

Run: `uv run python -c "import httpx_ws"`
Expected: 통과 또는 ImportError.

ImportError이면:
```bash
uv add --dev httpx-ws
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

Run: `uv run pytest tests/test_ws_cosmetics.py -v`
Expected: state 메시지에 cosmetics 키 없음으로 fail.

- [ ] **Step 4: ws.py 통합 — broadcast 시그니처 + state 메시지 합성**

`app/api/ws.py` 상단 import에 추가:
```python
from app.cosmetics import service as cosmetics_service
```

`ConnectionManager.broadcast` 시그니처를 `cosmetics_by_user` 인자 추가:
```python
    async def broadcast(
        self,
        game_id: str,
        state: GameState,
        display_names: dict[str, str],
        cosmetics_by_user: dict[str, dict[str, str]],
    ) -> None:
        dead: list[tuple[str, WebSocket]] = []
        for user_id, ws in list(self._conns.get(game_id, {}).items()):
            try:
                payload = serialize_state(
                    state, viewer_id=user_id, display_names=display_names
                ).model_dump()
                _attach_cosmetics(payload, cosmetics_by_user)
                await ws.send_json({"type": "state", "data": payload})
            except Exception as e:
                logger.warning("WS send failed for %s: %s", user_id, e)
                dead.append((user_id, ws))
        for user_id, ws in dead:
            self.disconnect(game_id, user_id, ws)
```

파일 끝(또는 `_placements_to_payload` 근처)에 helper 추가:
```python
def _attach_cosmetics(
    payload: dict, cosmetics_by_user: dict[str, dict[str, str]]
) -> None:
    """serialize_state의 payload.players[i]에 cosmetics 키 합치기."""
    for p in payload.get("players", []):
        uid = p.get("player_id") or p.get("user_id")
        if uid and uid in cosmetics_by_user:
            p["cosmetics"] = cosmetics_by_user[uid]
```

> `payload.players[i]`가 `player_id`인지 `user_id`인지는 `serialize_state` 정의를 보고 결정. 둘 중 어느 쪽이든 매핑되도록 setdefault 형태.

`game_socket` 안에서 user_id 매핑 fetch 직후 cosmetics도 fetch:
```python
    sm = _make_sessionmaker()
    async with sm() as session:
        if await users_repo.get_by_id(session, user_id) is None:
            await websocket.close(code=4401, reason="user not found")
            return
        display_names = await load_display_names(session, state)
        player_ids = [p.player_id for p in state.players]
        cosmetics_by_user_uuid = await cosmetics_service.get_loadouts_for_users(
            session, [uuid.UUID(pid) for pid in player_ids]
        )
        cosmetics_by_user: dict[str, dict[str, str]] = {
            str(k): v for k, v in cosmetics_by_user_uuid.items()
        }
```

`websocket.send_json` (첫 state) 부분도 cosmetics를 합쳐 보내기:
```python
    payload = serialize_state(
        state, viewer_id=user_id_str, display_names=display_names
    ).model_dump()
    _attach_cosmetics(payload, cosmetics_by_user)
    await websocket.send_json({"type": "state", "data": payload})
```

`_handle_action` 시그니처와 호출부도 `cosmetics_by_user` 인자 추가:
```python
            await _handle_action(
                svc, sm, game_id, user_id_str, msg, websocket,
                display_names, cosmetics_by_user,
            )
```

`_handle_action` 내부 `manager.broadcast` 호출 2곳 모두에 cosmetics_by_user 전달:
```python
    await manager.broadcast(game_id, state, display_names, cosmetics_by_user)
    ...
    await manager.broadcast(game_id, advanced, display_names, cosmetics_by_user)
```

`_handle_action` 시그니처:
```python
async def _handle_action(
    svc: GameService,
    sm: async_sessionmaker[AsyncSession],
    game_id: str,
    user_id_str: str,
    msg: dict,
    sender: WebSocket,
    display_names: dict[str, str],
    cosmetics_by_user: dict[str, dict[str, str]],
) -> None:
    ...
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

Run: `uv run pytest tests/test_ws_cosmetics.py tests/test_match.py -v`
Expected: cosmetics 테스트 통과 + 기존 ws/match 테스트 회귀 없음.

- [ ] **Step 6: Commit**

```bash
git add app/api/ws.py tests/test_ws_cosmetics.py
git commit -m "feat(cosmetics): ws state 메시지에 players[].cosmetics 포함"
```

---

## Task 14: 마이그레이션 4 — 기존 user backfill

**Files:**
- Create: `migrations/versions/<rev4>_backfill_user_cosmetics.py`

- [ ] **Step 1: revision 생성**

Run: `uv run alembic revision -m "backfill user cosmetics"`

- [ ] **Step 2: 본문 작성**

```python
"""backfill user cosmetics

Revision ID: <rev4>
Revises: <rev3>
"""

from collections.abc import Sequence

from alembic import op

revision: str = "<rev4>"
down_revision: str | Sequence[str] | None = "<rev3>"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 모든 user에 모든 cosmetic을 inventory로 부여 (idempotent)
    op.execute(
        """
        INSERT INTO user_cosmetic_inventory (user_id, cosmetic_id, source)
        SELECT u.id, c.id, 'grant'
        FROM users u
        CROSS JOIN cosmetics c
        ON CONFLICT (user_id, cosmetic_id) DO NOTHING
        """
    )
    # 모든 user에 카테고리별 default loadout 부여 (사용자가 이미 선택했으면 보존)
    op.execute(
        """
        INSERT INTO user_cosmetic_loadout (user_id, category, cosmetic_id)
        SELECT u.id, c.category, c.id
        FROM users u
        CROSS JOIN cosmetics c
        WHERE c.is_default = TRUE
        ON CONFLICT (user_id, category) DO NOTHING
        """
    )


def downgrade() -> None:
    # backfill 되돌리기: source='grant'인 inventory + loadout 전체 삭제
    op.execute("DELETE FROM user_cosmetic_loadout")
    op.execute("DELETE FROM user_cosmetic_inventory WHERE source = 'grant'")
```

- [ ] **Step 3: 적용 + 데이터 검증**

Run: `uv run alembic upgrade head`

Run:
```bash
docker compose exec -T postgres psql -U ofcp -d ofcp -c "
SELECT u.nickname,
       (SELECT count(*) FROM user_cosmetic_inventory i WHERE i.user_id = u.id) AS inv,
       (SELECT count(*) FROM user_cosmetic_loadout l WHERE l.user_id = u.id) AS loadout
FROM users u LIMIT 5"
```
Expected: 각 user에 inv=8, loadout=4.

- [ ] **Step 4: Commit**

```bash
git add migrations/versions/<rev4>_backfill_user_cosmetics.py
git commit -m "feat(cosmetics): 마이그 4 — 기존 user 데이터 backfill (idempotent)"
```

---

## Task 15: 프론트 — api/cosmetics.ts

**Files:**
- Create: `frontend/src/api/cosmetics.ts`

- [ ] **Step 1: 파일 생성**

`frontend/src/api/cosmetics.ts`:
```ts
import { apiFetch } from "./client";

export type CosmeticCategory = "card_back" | "card_face" | "table_theme" | "title";

export interface CosmeticOut {
  id: string;
  category: CosmeticCategory;
  code: string;
  name: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface LoadoutOut {
  card_back: string;
  card_face: string;
  table_theme: string;
  title: string;
}

export interface MyCosmeticsOut {
  owned: string[];
  loadout: LoadoutOut;
}

export interface LoadoutUpdateIn {
  card_back: string;
  card_face: string;
  table_theme: string;
  title: string;
}

export function getCatalog(): Promise<CosmeticOut[]> {
  return apiFetch<CosmeticOut[]>("/api/cosmetics/catalog", {}, { auth: false });
}

export function getMyCosmetics(): Promise<MyCosmeticsOut> {
  return apiFetch<MyCosmeticsOut>("/api/me/cosmetics");
}

export function updateLoadout(payload: LoadoutUpdateIn): Promise<LoadoutOut> {
  return apiFetch<LoadoutOut>("/api/me/cosmetics/loadout", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
```

- [ ] **Step 2: 타입체크 + 빌드 검증**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/cosmetics.ts
git commit -m "feat(cosmetics): frontend api 클라이언트"
```

---

## Task 16: 프론트 — store/cosmeticsStore.ts

**Files:**
- Create: `frontend/src/store/cosmeticsStore.ts`

- [ ] **Step 1: 스토어 작성**

`frontend/src/store/cosmeticsStore.ts`:
```ts
import { create } from "zustand";
import {
  CosmeticOut,
  LoadoutOut,
  MyCosmeticsOut,
  getCatalog,
  getMyCosmetics,
  updateLoadout as updateLoadoutApi,
  LoadoutUpdateIn,
} from "../api/cosmetics";

interface CosmeticsStore {
  catalog: CosmeticOut[];
  owned: string[];
  loadout: LoadoutOut | null;
  loaded: boolean;
  hydrate: () => Promise<void>;
  save: (payload: LoadoutUpdateIn) => Promise<void>;
}

export const useCosmeticsStore = create<CosmeticsStore>((set) => ({
  catalog: [],
  owned: [],
  loadout: null,
  loaded: false,

  hydrate: async () => {
    const [catalog, mine]: [CosmeticOut[], MyCosmeticsOut] = await Promise.all([
      getCatalog(),
      getMyCosmetics(),
    ]);
    set({
      catalog,
      owned: mine.owned,
      loadout: mine.loadout,
      loaded: true,
    });
  },

  save: async (payload) => {
    const loadout = await updateLoadoutApi(payload);
    set({ loadout });
  },
}));
```

- [ ] **Step 2: 타입체크**

Run: `cd frontend && pnpm tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/cosmeticsStore.ts
git commit -m "feat(cosmetics): frontend Zustand store"
```

---

## Task 17: 프론트 — CosmeticsSection 컴포넌트

**Files:**
- Create: `frontend/src/components/MyPage/CosmeticsSection.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`frontend/src/components/MyPage/CosmeticsSection.tsx`:
```tsx
import { useEffect, useMemo, useState } from "react";
import { CosmeticCategory } from "../../api/cosmetics";
import { Button } from "../ui";
import { useCosmeticsStore } from "../../store/cosmeticsStore";

const CATEGORIES: { key: CosmeticCategory; label: string }[] = [
  { key: "card_back", label: "카드 뒷면" },
  { key: "card_face", label: "카드 앞면" },
  { key: "table_theme", label: "테이블 테마" },
  { key: "title", label: "칭호" },
];

const sectionTitleStyle = {
  fontSize: "var(--fs-body-lg)",
  fontWeight: 600,
  margin: 0,
};

const categoryRowStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
};

const optionListStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
};

const labelStyle = {
  fontSize: "var(--fs-body-sm)",
  color: "var(--text-secondary)",
};

export function CosmeticsSection() {
  const { catalog, loadout, loaded, hydrate, save } = useCosmeticsStore();
  const [draft, setDraft] = useState<Record<CosmeticCategory, string>>({
    card_back: "",
    card_face: "",
    table_theme: "",
    title: "",
  });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!loaded) hydrate();
  }, [loaded, hydrate]);

  useEffect(() => {
    if (loadout) setDraft(loadout);
  }, [loadout]);

  const byCategory = useMemo(() => {
    const m: Record<CosmeticCategory, typeof catalog> = {
      card_back: [], card_face: [], table_theme: [], title: [],
    };
    for (const item of catalog) m[item.category].push(item);
    return m;
  }, [catalog]);

  const dirty = useMemo(() => {
    if (!loadout) return false;
    return CATEGORIES.some((c) => draft[c.key] !== loadout[c.key]);
  }, [draft, loadout]);

  if (!loaded) {
    return (
      <section className="card">
        <h2 style={sectionTitleStyle}>코스메틱</h2>
        <p style={labelStyle}>불러오는 중…</p>
      </section>
    );
  }

  async function onSave() {
    setSaving(true);
    try {
      await save(draft);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2 style={sectionTitleStyle}>코스메틱</h2>
      <div className="flex flex-col gap-3">
        {CATEGORIES.map(({ key, label }) => (
          <div key={key} style={categoryRowStyle}>
            <span style={labelStyle}>{label}</span>
            <div style={optionListStyle}>
              {byCategory[key].map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={draft[key] === item.id ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setDraft((d) => ({ ...d, [key]: item.id }))}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={onSave}
            disabled={!dirty || saving}
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
          {savedFlash && <span style={labelStyle}>저장됨</span>}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `cd frontend && pnpm tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/MyPage/CosmeticsSection.tsx
git commit -m "feat(cosmetics): MyPage CosmeticsSection 컴포넌트"
```

---

## Task 18: 프론트 — MyPage 통합

**Files:**
- Modify: `frontend/src/pages/MyPage.tsx`

- [ ] **Step 1: MyPage에 CosmeticsSection 삽입 + "카드 스킨·코스메틱" 안내 제거**

`frontend/src/pages/MyPage.tsx` 상단 import 추가:
```tsx
import { CosmeticsSection } from "../components/MyPage/CosmeticsSection";
```

`<section className="card"><h2 ...>추가 예정</h2><ul...>` 부분의 마지막 `<li>· 카드 스킨·코스메틱</li>` 한 줄을 삭제:
```tsx
          <section className="card">
            <h2 style={sectionTitleStyle}>추가 예정</h2>
            <ul style={upcomingListStyle}>
              <li>· 통계 (승률·평균 점수·FantasyLand 진입률)</li>
              <li>· 닉네임 변경</li>
            </ul>
          </section>
```

그 다음 줄에 `CosmeticsSection` 삽입 (프로필과 계정 사이 또는 추가 예정 다음):
```tsx
          <CosmeticsSection />

          <section className="card">
            <h2 style={sectionTitleStyle}>계정</h2>
            ...
```

- [ ] **Step 2: 빌드 + 시각 확인**

Run: `cd frontend && pnpm tsc --noEmit && pnpm build`
Expected: 에러 없음.

(개발 서버를 띄워 마이페이지에 4 카드가 보이고 "저장" 클릭 시 PUT 성공하는지 확인. 게스트는 접근 못 함이라 로그인 필요.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/MyPage.tsx
git commit -m "feat(cosmetics): MyPage에 CosmeticsSection 통합 + 안내 정리"
```

---

## Task 19: 최종 회귀 검증

**Files:** (수정 없음)

- [ ] **Step 1: 전체 백엔드 테스트 실행**

Run: `uv run pytest -v`
Expected: 모두 통과. 기존 테스트 회귀 없음.

- [ ] **Step 2: 마이그레이션 upgrade head 검증**

Run: `uv run alembic upgrade head`
Expected: `Running upgrade ... -> <rev4>` 마지막 출력.

- [ ] **Step 3: 프론트 빌드 검증**

Run: `cd frontend && pnpm tsc --noEmit && pnpm build`
Expected: 에러 없음.

- [ ] **Step 4: 수동 e2e 시나리오** (선택)

1. 백엔드 + 프론트 dev 서버 기동
2. dev-login으로 user 2명 로그인 (서로 다른 브라우저)
3. 각자 마이페이지에서 다른 alt 코스메틱 선택 → 저장
4. 방 생성 + 참가 → 게임 시작
5. ws 첫 state 메시지(브라우저 devtools Network) 안에 `players[i].cosmetics`에 각자 선택한 code가 들어있는지 확인

> 프론트가 실제 코스메틱을 시각으로 그리는 작업은 본 PR 비포함. payload 도착이 검증의 핵심.

---

## Self-Review 체크

**Spec 커버리지**:
- § 2 1차 PR 범위 → Task 1~18 전부 매핑됨
- § 4 데이터 모델 → Task 2 (ORM), Task 3·4·5 (마이그)
- § 6 REST API 3 endpoint → Task 11
- § 7 service 3 함수 → Task 8·9·10 (TDD)
- § 8 통합 지점 (auth, ws) → Task 12·13
- § 9 프론트 (api/store/CosmeticsSection/MyPage) → Task 15·16·17·18
- § 10 마이그레이션 4 파일 → Task 3·4·5·14
- § 11 테스트 강제/권장/면제 → Task 8·9·10 (강제), Task 11·13 (권장), 프론트 store/시각은 면제
- § 12 롤백 → 각 마이그 task에 downgrade 검증

**Placeholder 스캔**:
- `<rev1>`·`<rev2>`·`<rev3>`·`<rev4>`: alembic이 자동 생성하므로 실제 hash로 치환 — 의도된 placeholder, plan 실행자가 step 1의 출력에서 확인
- "기존 ws 테스트가 어떻게 작성됐는지 보고 동일 패턴": Task 13 step 2에서 의존성 확인 step으로 보강됨
- 그 외 TBD/TODO 없음

**Type 일관성**:
- `LoadoutUpdateIn`·`LoadoutOut`·`MyCosmeticsOut`·`CosmeticOut`: schemas.py(Task 6)에서 정의, service(Task 9)·router(Task 11) 모두 동일 이름 사용
- `grant_defaults`·`update_loadout`·`get_loadouts_for_users`: service.py에서 정의되고 router/auth/ws에서 호출되는 이름 일치
- 프론트 `CosmeticCategory`·`LoadoutOut` 등 백엔드와 키·필드명 일치 (4 카테고리)
- `LoadoutValidationError`: service.py에서 정의(Task 9), router에서 422 매핑(Task 11), 테스트에서 raise 검증(Task 9 step 1)
