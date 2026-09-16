"""add concept mastery counters and unique constraint

Revision ID: 006_add_concept_mastery_counters
Revises: 005_add_quiz_fields
Create Date: 2026-09-16 20:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "006_add_concept_mastery_counters"
down_revision: Union[str, None] = "005_add_quiz_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    cols = [c["name"] for c in insp.get_columns("concept_masteries")]
    with op.batch_alter_table("concept_masteries") as batch_op:
        if "total_attempts" not in cols:
            batch_op.add_column(sa.Column("total_attempts", sa.Integer(), nullable=False, server_default="0"))
        if "correct_attempts" not in cols:
            batch_op.add_column(sa.Column("correct_attempts", sa.Integer(), nullable=False, server_default="0"))

    # Add unique constraint on (user_id, concept_id)
    indexes = [ix["name"] for ix in insp.get_indexes("concept_masteries")]
    unique_constraints = []
    try:
        unique_constraints = [uc["name"] for uc in insp.get_unique_constraints("concept_masteries")]
    except Exception:
        pass

    if "uq_user_concept_mastery" not in indexes and "uq_user_concept_mastery" not in unique_constraints:
        with op.batch_alter_table("concept_masteries") as batch_op:
            batch_op.create_unique_constraint("uq_user_concept_mastery", ["user_id", "concept_id"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    unique_constraints = []
    try:
        unique_constraints = [uc["name"] for uc in insp.get_unique_constraints("concept_masteries")]
    except Exception:
        pass

    if "uq_user_concept_mastery" in unique_constraints:
        with op.batch_alter_table("concept_masteries") as batch_op:
            batch_op.drop_constraint("uq_user_concept_mastery", type_="unique")

    cols = [c["name"] for c in insp.get_columns("concept_masteries")]
    with op.batch_alter_table("concept_masteries") as batch_op:
        if "correct_attempts" in cols:
            batch_op.drop_column("correct_attempts")
        if "total_attempts" in cols:
            batch_op.drop_column("total_attempts")
