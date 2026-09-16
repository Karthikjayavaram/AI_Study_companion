"""add material_type and extracted_text to materials

Revision ID: 002_add_material_fields
Revises: 001_initial
Create Date: 2026-09-16 11:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_add_material_fields"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("materials") as batch_op:
        batch_op.add_column(sa.Column("material_type", sa.String(length=32), nullable=False, server_default="document"))
        batch_op.add_column(sa.Column("extracted_text", sa.Text(), nullable=True))
        batch_op.alter_column("file_name", existing_type=sa.String(length=255), nullable=True)
        batch_op.alter_column("file_path", existing_type=sa.String(length=512), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("materials") as batch_op:
        batch_op.drop_column("extracted_text")
        batch_op.drop_column("material_type")
        batch_op.alter_column("file_name", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("file_path", existing_type=sa.String(length=512), nullable=False)
