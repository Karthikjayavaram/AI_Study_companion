from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ConceptBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None


class ConceptCreate(ConceptBase):
    project_id: str


class ConceptRead(ConceptBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConceptMasteryRead(BaseModel):
    id: str
    concept_id: str
    project_id: str
    user_id: str
    score: float
    status: str  # improving, stable, requiring_attention
    total_attempts: int = 0
    correct_attempts: int = 0
    last_assessed_at: Optional[datetime] = None
    concept: Optional[ConceptRead] = None

    model_config = ConfigDict(from_attributes=True)


class GrowthSummary(BaseModel):
    """Aggregate growth summary for a user in a project."""
    overall_mastery: float = 0.0  # 0-100 average across all concepts
    total_concepts: int = 0
    mastered_count: int = 0      # score >= 80
    improving_count: int = 0     # 50 <= score < 80
    needs_attention_count: int = 0  # score < 50
    masteries: List[ConceptMasteryRead] = []

    model_config = ConfigDict(from_attributes=True)
