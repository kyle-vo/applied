"""add api_keys

Revision ID: d5a3b1e9f2c6
Revises: c4f2e1d3b7a8
Create Date: 2026-06-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd5a3b1e9f2c6'
down_revision = 'c4f2e1d3b7a8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('key_hash', sa.String(length=64), nullable=False),
        sa.Column('prefix', sa.String(length=12), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_hash'),
    )
    op.create_index(op.f('ix_api_keys_user_id'), 'api_keys', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_api_keys_user_id'), table_name='api_keys')
    op.drop_table('api_keys')
