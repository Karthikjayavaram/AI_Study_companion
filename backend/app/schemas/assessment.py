from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict


class QuestionRead(BaseModel):
    id: str
    quiz_id: str
    concept_id: Optional[str] = None
    question_text: str
    question_type: str  # mcq, open_ended
    options: Optional[List[str]] = None
    difficulty: str

    model_config = ConfigDict(from_attributes=True)


class QuizRead(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    quiz_type: str
    difficulty: str
    created_at: datetime
    questions: Optional[List[QuestionRead]] = None

    model_config = ConfigDict(from_attributes=True)


class QuizSubmitAnswer(BaseModel):
    question_id: str
    user_answer: str


class QuizSubmitRequest(BaseModel):
    quiz_id: str
    answers: List[QuizSubmitAnswer]


class AssessmentRead(BaseModel):
    id: str
    quiz_attempt_id: str
    question_id: str
    user_answer: str
    is_correct: Optional[bool] = None
    ai_score: Optional[float] = None
    feedback: Optional[str] = None
    key_concepts_covered: Optional[List[str]] = None
    missing_concepts: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True)


class QuizAttemptRead(BaseModel):
    id: str
    quiz_id: str
    user_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[float] = None
    status: str
    assessments: Optional[List[AssessmentRead]] = None

    model_config = ConfigDict(from_attributes=True)
