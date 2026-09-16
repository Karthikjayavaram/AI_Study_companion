from datetime import datetime
from typing import Optional
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
    last_assessed_at: Optional[datetime] = None
    concept: Optional[ConceptRead] = None

    model_config = ConfigDict(from_attributes=True)
