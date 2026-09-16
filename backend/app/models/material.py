from sqlalchemy import Column, ForeignKey, Integer, String, Text, BigInteger
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin, VectorType, generate_uuid


class Material(Base, TimestampMixin):
    __tablename__ = "materials"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(BigInteger, nullable=False, default=0)
    mime_type = Column(String(128), default="application/pdf", nullable=False)
    # Status lifecycle: queued -> processing -> ready -> failed
    status = Column(String(32), default="queued", nullable=False, index=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="materials")
    chunks = relationship("MaterialChunk", back_populates="material", cascade="all, delete-orphan")


class MaterialChunk(Base, TimestampMixin):
    __tablename__ = "material_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    material_id = Column(String(36), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    token_count = Column(Integer, nullable=True)
    # Embedding vector column (1536 dims standard for OpenAI text-embedding-3-small)
    embedding = Column(VectorType(1536), nullable=True)

    # Relationships
    material = relationship("Material", back_populates="chunks")
