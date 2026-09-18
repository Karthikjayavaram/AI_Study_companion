from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# Request to generate a new quiz
class QuizGenerateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    difficulty: Optional[str] = Field(default="adaptive")  # easy, medium, hard, mixed, adaptive
    question_count: int = Field(default=5, ge=1, le=20)
    material_ids: Optional[List[str]] = None


# Sanitized question schema exposed to learners while taking the quiz
# (CRITICAL: correct_answer, explanation, and source chunks are intentionally omitted)
class QuestionSanitizedRead(BaseModel):
    id: str
    quiz_id: str
    concept_id: Optional[str] = None
    question_order: int = 1
    question_text: str
    question_type: str = "mcq"  # mcq
    options: Optional[List[str]] = None
    difficulty: str

    model_config = ConfigDict(from_attributes=True)


# Detailed question schema (internal or for assessment review)
class QuestionRead(BaseModel):
    id: str
    quiz_id: str
    concept_id: Optional[str] = None
    question_order: int = 1
    question_text: str
    question_type: str  # mcq, open_ended
    options: Optional[List[str]] = None
    difficulty: str
    source_material_id: Optional[str] = None
    source_chunk_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Quiz list / detail schema
class QuizRead(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    description: Optional[str] = None
    quiz_type: str
    difficulty: str
    question_count: int = 0
    status: str = "ready"
    created_at: datetime
    questions: Optional[List[QuestionSanitizedRead]] = None

    model_config = ConfigDict(from_attributes=True)


# Schema when starting a quiz attempt
class QuizAttemptStartResponse(BaseModel):
    id: str
    quiz_id: str
    quiz_title: str
    user_id: str
    started_at: datetime
    status: str
    total_questions: int
    questions: List[QuestionSanitizedRead]

    model_config = ConfigDict(from_attributes=True)


# Submission payload
class QuizSubmitAnswer(BaseModel):
    question_id: str
    user_answer: str


class QuizSubmitRequest(BaseModel):
    answers: List[QuizSubmitAnswer]


# Evaluation result per question
class QuestionResultDetail(BaseModel):
    question_id: str
    question_order: int
    question_text: str
    options: Optional[List[str]] = None
    user_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str] = None
    source_material_id: Optional[str] = None
    source_material_title: Optional[str] = None
    source_chunk_id: Optional[str] = None
    source_chunk_text: Optional[str] = None
    source_page_number: Optional[int] = None
    source_citation: Optional[str] = None


# Completed attempt result response
class QuizAttemptResultResponse(BaseModel):
    id: str
    quiz_id: str
    quiz_title: str
    user_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    score: float  # 0.0 - 100.0 percentage
    total_questions: int
    correct_answers: int
    status: str
    results: List[QuestionResultDetail]

    model_config = ConfigDict(from_attributes=True)


# Legacy / backward-compatibility schemas
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
    total_questions: int = 0
    correct_answers: int = 0
    status: str
    assessments: Optional[List[AssessmentRead]] = None

    model_config = ConfigDict(from_attributes=True)
