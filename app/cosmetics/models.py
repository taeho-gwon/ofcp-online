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
    __table_args__ = (
        UniqueConstraint("category", "code", name="uq_cosmetics_cat_code"),
    )

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
