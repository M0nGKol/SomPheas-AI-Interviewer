"""add sandbox_sessions table

Revision ID: a1b2c3d4e5f6
Revises: 1af3e796db89
Create Date: 2026-05-29 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '1af3e796db89'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'sandbox_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_uuid', sa.String(length=36), nullable=False),
        sa.Column('interview_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('language', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_sandbox_sessions_id'), 'sandbox_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_sandbox_sessions_session_uuid'), 'sandbox_sessions', ['session_uuid'], unique=True)
    op.create_index(op.f('ix_sandbox_sessions_interview_id'), 'sandbox_sessions', ['interview_id'], unique=False)
    op.create_index(op.f('ix_sandbox_sessions_user_id'), 'sandbox_sessions', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_sandbox_sessions_user_id'), table_name='sandbox_sessions')
    op.drop_index(op.f('ix_sandbox_sessions_interview_id'), table_name='sandbox_sessions')
    op.drop_index(op.f('ix_sandbox_sessions_session_uuid'), table_name='sandbox_sessions')
    op.drop_index(op.f('ix_sandbox_sessions_id'), table_name='sandbox_sessions')
    op.drop_table('sandbox_sessions')
