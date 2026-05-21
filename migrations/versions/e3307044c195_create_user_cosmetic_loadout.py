"""create user_cosmetic_loadout

Revision ID: e3307044c195
Revises: 7ac8dbbf9e86
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e3307044c195"
down_revision: str | Sequence[str] | None = "7ac8dbbf9e86"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_cosmetic_loadout",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                "card_back",
                "card_face",
                "table_theme",
                "title",
                name="cosmetic_category",
                create_type=False,
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
