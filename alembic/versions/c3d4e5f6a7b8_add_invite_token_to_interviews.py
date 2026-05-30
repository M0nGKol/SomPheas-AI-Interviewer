"""add invite_token to interviews

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-30

"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'interviews',
        sa.Column('invite_token', sa.String(64), nullable=True, unique=True),
    )
    op.create_index('ix_interviews_invite_token', 'interviews', ['invite_token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_interviews_invite_token', table_name='interviews')
    op.drop_column('interviews', 'invite_token')
