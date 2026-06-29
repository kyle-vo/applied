"""add analysis_hash and tailor_hash to applications

Revision ID: a1b2c3d4e5f6
Revises: f7c5d3e2b1a0
Create Date: 2026-06-29

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'f7c5d3e2b1a0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('applications', sa.Column('analysis_hash', sa.String(64), nullable=True))
    op.add_column('applications', sa.Column('tailor_hash', sa.String(64), nullable=True))


def downgrade():
    op.drop_column('applications', 'tailor_hash')
    op.drop_column('applications', 'analysis_hash')
