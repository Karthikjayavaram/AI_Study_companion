"""add conversations and messages indexes

Revision ID: 004_add_conversations_messages_indexes
Revises: 003_add_material_chunks_and_vectors
Create Date: 2026-09-16 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004_add_conversations_messages_indexes"
down_revision: Union[str, None] = "003_add_material_chunks_and_vectors"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure index on conversations.user_id exists
    try:
        op.create_index("ix_conversations_user_id", "conversations", ["user_id"])
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_index("ix_conversations_user_id", table_name="conversations")
    except Exception:
        pass
