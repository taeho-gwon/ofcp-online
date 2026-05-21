"""rename face cosmetics to color variants

Revision ID: 0fa21afd2195
Revises: 8c179659e179
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0fa21afd2195"
down_revision: str | Sequence[str] | None = "8c179659e179"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # face.classic → face.2color, face.modern → face.4color
    # UUID는 유지되므로 기존 inventory/loadout 참조는 그대로 동작.
    op.execute(
        "UPDATE cosmetics SET code = 'face.2color', name = '2색 덱' "
        "WHERE code = 'face.classic'"
    )
    op.execute(
        "UPDATE cosmetics SET code = 'face.4color', name = '4색 덱' "
        "WHERE code = 'face.modern'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE cosmetics SET code = 'face.classic', name = '클래식' "
        "WHERE code = 'face.2color'"
    )
    op.execute(
        "UPDATE cosmetics SET code = 'face.modern', name = '모던' "
        "WHERE code = 'face.4color'"
    )
