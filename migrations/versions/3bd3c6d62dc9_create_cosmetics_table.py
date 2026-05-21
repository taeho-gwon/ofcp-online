"""create cosmetics table

Revision ID: 3bd3c6d62dc9
Revises: faa1a0411c89
Create Date: 2026-05-21 19:00:44.650405

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "3bd3c6d62dc9"
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
            postgresql.ENUM(
                *COSMETIC_CATEGORIES, name="cosmetic_category", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "is_default", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
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
                "INSERT INTO cosmetics "
                "(id, category, code, name, is_default, sort_order) "
                "VALUES (gen_random_uuid(), CAST(:cat AS cosmetic_category), "
                ":code, :name, :is_default, :sort_order)"
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
