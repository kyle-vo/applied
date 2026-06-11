"""add user_profiles

Revision ID: b3e1f2a4c8d9
Revises: 7b479c8541e5
Create Date: 2026-06-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b3e1f2a4c8d9'
down_revision = '7b479c8541e5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('resume_text', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_user_profiles_user_id'),
        'user_profiles',
        ['user_id'],
        unique=True,
    )


def downgrade():
    op.drop_index(op.f('ix_user_profiles_user_id'), table_name='user_profiles')
    op.drop_table('user_profiles')
