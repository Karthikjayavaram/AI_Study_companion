from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class ActivityEventCreate(BaseModel):
    project_id: Optional[str] = None
    event_type: str
    details: Optional[Dict[str, Any]] = None


class ActivityEventRead(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    event_type: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
