"""stage3_rule_engine_enhancement

Revision ID: 008
Revises: 007
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '008'
down_revision = '007b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 优化 audit_rules 表 - 新增字段
    op.add_column('audit_rules', sa.Column('rule_type', sa.String(64), nullable=True))
    op.add_column('audit_rules', sa.Column('trigger_scene', sa.String(64), nullable=True))
    op.add_column('audit_rules', sa.Column('priority_level', sa.Integer(), server_default='0'))
    op.add_column('audit_rules', sa.Column('disease_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('audit_rules', sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('audit_rules', sa.Column('evidence_text', sa.Text(), nullable=True))

    op.create_foreign_key('fk_audit_rules_disease', 'audit_rules', 'diseases', ['disease_id'], ['id'])
    op.create_foreign_key('fk_audit_rules_source', 'audit_rules', 'knowledge_sources', ['source_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_audit_rules_source', 'audit_rules', type_='foreignkey')
    op.drop_constraint('fk_audit_rules_disease', 'audit_rules', type_='foreignkey')
    op.drop_column('audit_rules', 'evidence_text')
    op.drop_column('audit_rules', 'source_id')
    op.drop_column('audit_rules', 'disease_id')
    op.drop_column('audit_rules', 'priority_level')
    op.drop_column('audit_rules', 'trigger_scene')
    op.drop_column('audit_rules', 'rule_type')
