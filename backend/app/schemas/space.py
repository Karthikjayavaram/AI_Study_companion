from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SpaceBase(BaseModel):
    name: str
    description: Optional[str] = None
    color_code: Optional[str] = "#4f46e5"
    icon: Optional[str] = "book-open"


class SpaceCreate(SpaceBase):
    pass


class SpaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color_code: Optional[str] = None
    icon: Optional[str] = None


class SpaceRead(SpaceBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
