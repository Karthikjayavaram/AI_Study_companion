from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AIUsageRead(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    feature: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int
    estimated_cost: float
    success: bool
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
