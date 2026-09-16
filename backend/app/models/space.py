from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin, generate_uuid


class Space(Base, TimestampMixin):
    __tablename__ = "spaces"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color_code = Column(String(32), default="#4f46e5", nullable=False)
    icon = Column(String(64), default="book-open", nullable=False)

    # Relationships
    user = relationship("User", back_populates="spaces")
    projects = relationship("Project", back_populates="space", cascade="all, delete-orphan")
