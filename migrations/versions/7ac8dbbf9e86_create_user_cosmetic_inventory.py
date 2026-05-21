"""create user_cosmetic_inventory

Revision ID: 7ac8dbbf9e86
Revises: 3bd3c6d62dc9
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7ac8dbbf9e86"
down_revision: str | Sequence[str] | None = "3bd3c6d62dc9"
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
