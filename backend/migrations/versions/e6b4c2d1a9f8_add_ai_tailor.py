"""add ai_tailor to applications

Revision ID: e6b4c2d1a9f8
Revises: d5a3b1e9f2c6
Create Date: 2026-06-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'e6b4c2d1a9f8'
down_revision = 'd5a3b1e9f2c6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('applications', sa.Column('ai_tailor', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('applications', 'ai_tailor')
