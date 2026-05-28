"""add interview code fields

Revision ID: e1a2b3c4d5e6
Revises: cd594ccab40f
Create Date: 2026-05-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, None] = 'cd594ccab40f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add problem_id FK to interviews
    op.add_column('interviews',
        sa.Column('problem_id', sa.Integer(), nullable=True)
    )
    op.create_index(op.f('ix_interviews_problem_id'), 'interviews', ['problem_id'], unique=False)
    op.create_foreign_key(
        'fk_interviews_problem_id',
        'interviews', 'problems',
        ['problem_id'], ['id'],
        ondelete='SET NULL',
    )

    # Add interviewer_id FK to interviews
    op.add_column('interviews',
        sa.Column('interviewer_id', sa.Integer(), nullable=True)
    )
    op.create_index(op.f('ix_interviews_interviewer_id'), 'interviews', ['interviewer_id'], unique=False)
    op.create_foreign_key(
        'fk_interviews_interviewer_id',
        'interviews', 'users',
        ['interviewer_id'], ['id'],
        ondelete='SET NULL',
    )

    # Add language column
    op.add_column('interviews',
        sa.Column('language', sa.String(length=50), server_default='python', nullable=False)
    )

    # Add current_code column
    op.add_column('interviews',
        sa.Column('current_code', sa.Text(), nullable=True)
    )

    # Update existing status values from old values to new uppercase format
    op.execute("""
        UPDATE interviews
        SET status = CASE status
            WHEN 'pending'     THEN 'CREATED'
            WHEN 'in_progress' THEN 'IN_PROGRESS'
            WHEN 'completed'   THEN 'COMPLETED'
            WHEN 'cancelled'   THEN 'CANCELLED'
            ELSE status
        END
    """)


def downgrade() -> None:
    op.drop_constraint('fk_interviews_interviewer_id', 'interviews', type_='foreignkey')
    op.drop_index(op.f('ix_interviews_interviewer_id'), table_name='interviews')
    op.drop_column('interviews', 'interviewer_id')

    op.drop_constraint('fk_interviews_problem_id', 'interviews', type_='foreignkey')
    op.drop_index(op.f('ix_interviews_problem_id'), table_name='interviews')
    op.drop_column('interviews', 'problem_id')

    op.drop_column('interviews', 'language')
    op.drop_column('interviews', 'current_code')
