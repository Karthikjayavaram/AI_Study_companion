from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin, generate_uuid


class Quiz(Base, TimestampMixin):
    __tablename__ = "quizzes"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    quiz_type = Column(String(32), default="adaptive", nullable=False)  # adaptive, targeted, diagnostic
    difficulty = Column(String(32), default="medium", nullable=False)  # easy, medium, hard

    # Relationships
    project = relationship("Project", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    quiz_id = Column(String(36), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    concept_id = Column(String(36), ForeignKey("concepts.id", ondelete="SET NULL"), nullable=True, index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(32), default="mcq", nullable=False)  # mcq, open_ended
    options = Column(JSON, nullable=True)  # List of strings: ["Option A", "Option B", ...]
    correct_answer = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    difficulty = Column(String(32), default="medium", nullable=False)

    # Relationships
    quiz = relationship("Quiz", back_populates="questions")
    concept = relationship("Concept", back_populates="questions")
    assessments = relationship("Assessment", back_populates="question", cascade="all, delete-orphan")


class QuizAttempt(Base, TimestampMixin):
    __tablename__ = "quiz_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    quiz_id = Column(String(36), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)
    status = Column(String(32), default="in_progress", nullable=False)  # in_progress, completed, abandoned

    # Relationships
    quiz = relationship("Quiz", back_populates="attempts")
    assessments = relationship("Assessment", back_populates="attempt", cascade="all, delete-orphan")


class Assessment(Base, TimestampMixin):
    __tablename__ = "assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    quiz_attempt_id = Column(String(36), ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=True)
    ai_score = Column(Float, nullable=True)  # 0.0 - 1.0
    feedback = Column(Text, nullable=True)  # What learner understood and what is missing
    key_concepts_covered = Column(JSON, nullable=True)
    missing_concepts = Column(JSON, nullable=True)

    # Relationships
    attempt = relationship("QuizAttempt", back_populates="assessments")
    question = relationship("Question", back_populates="assessments")
