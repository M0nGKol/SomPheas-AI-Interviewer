"""add yjs_state to interviews

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-29 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Store the serialised Y.Doc state (binary) so late joiners can catch up
    op.add_column(
        'interviews',
        sa.Column('yjs_state', sa.LargeBinary(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('interviews', 'yjs_state')
