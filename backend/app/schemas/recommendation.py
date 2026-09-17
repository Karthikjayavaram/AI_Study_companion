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


class NextActionResponse(BaseModel):
    """
    Project-level personalized next learning action response.
    Answers the core question: 'What should I do next?'
    """
    id: str
    project_id: str
    user_id: str
    recommendation_type: str  # practice_concept, review_concept, mixed_review, start_learning
    title: str
    reason: str
    target_concept_id: Optional[str] = None
    priority: int  # 1 (high/needs practice) to 4 (start learning)
    action_type: str  # quiz, materials
    action_url: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
