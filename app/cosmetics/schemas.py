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
