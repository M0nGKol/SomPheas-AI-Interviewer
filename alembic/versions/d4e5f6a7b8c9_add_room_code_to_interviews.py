"""add room_code to interviews

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-05-30

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'interviews',
        sa.Column('room_code', sa.String(16), nullable=True),
    )
    op.create_index('ix_interviews_room_code', 'interviews', ['room_code'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_interviews_room_code', table_name='interviews')
    op.drop_column('interviews', 'room_code')
