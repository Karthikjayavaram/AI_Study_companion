"""ensure vector extension and material_chunks indexes

Revision ID: 003_add_material_chunks_and_vectors
Revises: 002_add_material_fields
Create Date: 2026-09-16 12:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003_add_material_chunks_and_vectors"
down_revision: Union[str, None] = "002_add_material_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")


def downgrade() -> None:
    pass
