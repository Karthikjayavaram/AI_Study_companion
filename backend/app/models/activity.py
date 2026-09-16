from sqlalchemy import Column, ForeignKey, String, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin, generate_uuid


class ActivityEvent(Base, TimestampMixin):
    """
    Event-driven learning activity log supporting analytics,
    growth analysis, and downstream workflows.
    """
    __tablename__ = "activity_events"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    # Event types: project_created, material_uploaded, material_processed,
    # tutor_question_asked, quiz_started, quiz_completed, mastery_updated, recommendation_generated
    event_type = Column(String(64), nullable=False, index=True)
    details = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="activities")
    project = relationship("Project", back_populates="activities")
