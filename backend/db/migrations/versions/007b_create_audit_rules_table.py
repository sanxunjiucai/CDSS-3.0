"""create_audit_rules_table

Revision ID: 007b
Revises: 007
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '007b'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('audit_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('scenario', sa.String(50), nullable=False, server_default='diagnosis_consistency'),
        sa.Column('level', sa.String(20), nullable=False, server_default='warning'),
        sa.Column('code', sa.String(100), nullable=False, server_default='CUSTOM_RULE'),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('suggestion', sa.Text(), nullable=True),
        sa.Column('condition', postgresql.JSON(astext_type=sa.Text()), server_default='{}'),
        sa.Column('enabled', sa.Boolean(), server_default='true'),
        sa.Column('is_published', sa.Boolean(), server_default='false'),
        sa.Column('version', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_audit_rules_name', 'audit_rules', ['name'])
    op.create_index('idx_audit_rules_scenario', 'audit_rules', ['scenario'])
    op.create_index('idx_audit_rules_enabled', 'audit_rules', ['enabled'])


def downgrade() -> None:
    op.drop_index('idx_audit_rules_enabled', 'audit_rules')
    op.drop_index('idx_audit_rules_scenario', 'audit_rules')
    op.drop_index('idx_audit_rules_name', 'audit_rules')
    op.drop_table('audit_rules')
