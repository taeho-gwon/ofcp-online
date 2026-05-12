import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    nickname: str
    created_at: datetime

    model_config = {"from_attributes": True}


class NicknameUpdate(BaseModel):
    nickname: str = Field(min_length=2, max_length=16)


class NicknameAvailability(BaseModel):
    available: bool
