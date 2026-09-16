"""update vector dimension for material_chunks to match Hugging Face embedding model

Revision ID: 007_update_vector_dimension
Revises: 006_add_concept_mastery_counters
Create Date: 2026-09-16 21:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.core.config import settings

revision: str = "007_update_vector_dimension"
down_revision: Union[str, None] = "006_add_concept_mastery_counters"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dim = getattr(settings, "EMBEDDING_DIMENSION", 384)
    if bind.dialect.name == "postgresql":
        # In PostgreSQL with pgvector, alter the column type to the configured dimension.
        # Existing embeddings from previous provider (1536) are incompatible with 384,
        # so nullify any incompatible vectors before altering the column type.
        op.execute("UPDATE material_chunks SET embedding = NULL;")
        op.execute(f"ALTER TABLE material_chunks ALTER COLUMN embedding TYPE vector({dim});")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("UPDATE material_chunks SET embedding = NULL;")
        op.execute("ALTER TABLE material_chunks ALTER COLUMN embedding TYPE vector(1536);")
