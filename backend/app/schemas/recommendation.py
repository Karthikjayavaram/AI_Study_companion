from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RecommendationRead(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    content: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    priority: str
    is_completed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
