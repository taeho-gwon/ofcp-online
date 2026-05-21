"""backfill user cosmetics

Revision ID: 8c179659e179
Revises: e3307044c195
"""

from collections.abc import Sequence

from alembic import op

revision: str = "8c179659e179"
down_revision: str | Sequence[str] | None = "e3307044c195"
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
    # backfill 되돌리기: loadout 전체 + source='grant'인 inventory 삭제
    op.execute("DELETE FROM user_cosmetic_loadout")
    op.execute("DELETE FROM user_cosmetic_inventory WHERE source = 'grant'")
