from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin, generate_uuid


class Concept(Base, TimestampMixin):
    __tablename__ = "concepts"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(128), nullable=True)

    # Relationships
    project = relationship("Project", back_populates="concepts")
    masteries = relationship("ConceptMastery", back_populates="concept", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="concept")


class ConceptMastery(Base, TimestampMixin):
    __tablename__ = "concept_masteries"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    concept_id = Column(String(36), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, default=0.0, nullable=False)  # 0.0 - 1.0 (e.g., 0.72)
    status = Column(String(32), default="requiring_attention", nullable=False)  # improving, stable, requiring_attention
    last_assessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)

    # Relationships
    concept = relationship("Concept", back_populates="masteries")
    project = relationship("Project", back_populates="concept_masteries")
