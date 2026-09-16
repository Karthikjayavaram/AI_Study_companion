from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class Citation(BaseModel):
    source_title: str
    page_number: Optional[int] = None
    snippet: str
    material_id: Optional[str] = None


class MessageCreate(BaseModel):
    content: str


class MessageRead(BaseModel):
    id: str
    conversation_id: str
    sender: str
    content: str
    citations: Optional[List[Citation]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationRead(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[MessageRead]] = None

    model_config = ConfigDict(from_attributes=True)


class TutorQueryRequest(BaseModel):
    conversation_id: Optional[str] = None
    project_id: str
    question: str
    mode: Optional[str] = "socratic"  # socratic, simplify, deep_dive, test_understanding


class TutorResponse(BaseModel):
    conversation_id: str
    message: str
    has_sufficient_evidence: bool
    citations: List[Citation] = []
    suggested_followups: List[str] = []
