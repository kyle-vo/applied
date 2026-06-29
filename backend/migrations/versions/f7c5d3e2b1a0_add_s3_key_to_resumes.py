"""add s3_key to resumes

Revision ID: f7c5d3e2b1a0
Revises: e6b4c2d1a9f8
Create Date: 2026-06-29

"""
from alembic import op
import sqlalchemy as sa

revision = 'f7c5d3e2b1a0'
down_revision = 'e6b4c2d1a9f8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('resumes', sa.Column('s3_key', sa.String(512), nullable=True))


def downgrade():
    op.drop_column('resumes', 's3_key')
