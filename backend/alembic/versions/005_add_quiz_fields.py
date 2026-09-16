"""add quiz fields and source citations

Revision ID: 005_add_quiz_fields
Revises: 004_add_conversations_messages_indexes
Create Date: 2026-09-16 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005_add_quiz_fields"
down_revision: Union[str, None] = "004_add_conversations_messages_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # 1. Update quizzes table
    quiz_cols = [c["name"] for c in insp.get_columns("quizzes")]
    with op.batch_alter_table("quizzes") as batch_op:
        if "description" not in quiz_cols:
            batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        if "question_count" not in quiz_cols:
            batch_op.add_column(sa.Column("question_count", sa.Integer(), nullable=False, server_default="0"))
        if "status" not in quiz_cols:
            batch_op.add_column(sa.Column("status", sa.String(length=32), nullable=False, server_default="ready"))

    # 2. Update questions table
    question_cols = [c["name"] for c in insp.get_columns("questions")]
    with op.batch_alter_table("questions") as batch_op:
        if "source_material_id" not in question_cols:
            batch_op.add_column(sa.Column("source_material_id", sa.String(length=36), nullable=True))
        if "source_chunk_id" not in question_cols:
            batch_op.add_column(sa.Column("source_chunk_id", sa.String(length=36), nullable=True))
        if "question_order" not in question_cols:
            batch_op.add_column(sa.Column("question_order", sa.Integer(), nullable=False, server_default="1"))

    question_indexes = [ix["name"] for ix in insp.get_indexes("questions")]
    with op.batch_alter_table("questions") as batch_op:
        if "ix_questions_source_material_id" not in question_indexes:
            batch_op.create_index("ix_questions_source_material_id", ["source_material_id"])
        if "ix_questions_source_chunk_id" not in question_indexes:
            batch_op.create_index("ix_questions_source_chunk_id", ["source_chunk_id"])

    # 3. Update quiz_attempts table
    attempt_cols = [c["name"] for c in insp.get_columns("quiz_attempts")]
    with op.batch_alter_table("quiz_attempts") as batch_op:
        if "total_questions" not in attempt_cols:
            batch_op.add_column(sa.Column("total_questions", sa.Integer(), nullable=False, server_default="0"))
        if "correct_answers" not in attempt_cols:
            batch_op.add_column(sa.Column("correct_answers", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    attempt_cols = [c["name"] for c in insp.get_columns("quiz_attempts")]
    with op.batch_alter_table("quiz_attempts") as batch_op:
        if "correct_answers" in attempt_cols:
            batch_op.drop_column("correct_answers")
        if "total_questions" in attempt_cols:
            batch_op.drop_column("total_questions")

    question_cols = [c["name"] for c in insp.get_columns("questions")]
    question_indexes = [ix["name"] for ix in insp.get_indexes("questions")]
    with op.batch_alter_table("questions") as batch_op:
        if "ix_questions_source_chunk_id" in question_indexes:
            batch_op.drop_index("ix_questions_source_chunk_id")
        if "ix_questions_source_material_id" in question_indexes:
            batch_op.drop_index("ix_questions_source_material_id")
        if "question_order" in question_cols:
            batch_op.drop_column("question_order")
        if "source_chunk_id" in question_cols:
            batch_op.drop_column("source_chunk_id")
        if "source_material_id" in question_cols:
            batch_op.drop_column("source_material_id")

    quiz_cols = [c["name"] for c in insp.get_columns("quizzes")]
    with op.batch_alter_table("quizzes") as batch_op:
        if "status" in quiz_cols:
            batch_op.drop_column("status")
        if "question_count" in quiz_cols:
            batch_op.drop_column("question_count")
        if "description" in quiz_cols:
            batch_op.drop_column("description")
