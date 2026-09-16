from sqlalchemy import Boolean, Column, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin, generate_uuid


class Recommendation(Base, TimestampMixin):
    """
    Answers the core PRD question: 'What should I do next?'
    Generated based on weak concepts, mistakes, and learning goals.
    """
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    target_type = Column(String(64), nullable=True)  # concept, material, quiz, review
    target_id = Column(String(36), nullable=True)
    priority = Column(String(32), default="medium", nullable=False)  # high, medium, low
    is_completed = Column(Boolean, default=False, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="recommendations")
