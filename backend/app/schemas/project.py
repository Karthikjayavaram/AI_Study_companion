from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    learning_goal: Optional[str] = None
    status: Optional[str] = "active"


class ProjectCreate(ProjectBase):
    space_id: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    learning_goal: Optional[str] = None
    status: Optional[str] = None


class ProjectRead(ProjectBase):
    id: str
    space_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
