"""stage2_risk_audit_tables

Revision ID: 007
Revises: 006
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 创建 risk_assessments 表
    op.create_table('risk_assessments',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assessment_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('assessment_name', sa.String(255), nullable=False),
        sa.Column('answers', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('score', sa.Numeric(10, 2), nullable=True),
        sa.Column('result_level', sa.String(32), nullable=True),
        sa.Column('result_label', sa.String(255), nullable=True),
        sa.Column('interpretation', sa.Text(), nullable=True),
        sa.Column('assessed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('assessed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.ForeignKeyConstraint(['visit_id'], ['patient_visits.id']),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id']),
        sa.ForeignKeyConstraint(['assessed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_risk_assessments_patient', 'risk_assessments', ['patient_id'])
    op.create_index('idx_risk_assessments_visit', 'risk_assessments', ['visit_id'])

    # 2. 创建 audit_alerts 表
    op.create_table('audit_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('alert_no', sa.String(100), nullable=False),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('rule_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('alert_type', sa.String(64), nullable=True),
        sa.Column('alert_level', sa.String(32), nullable=True),
        sa.Column('alert_title', sa.String(255), nullable=True),
        sa.Column('alert_message', sa.Text(), nullable=True),
        sa.Column('suggestion', sa.Text(), nullable=True),
        sa.Column('trigger_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('triggered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('status', sa.String(32), server_default='pending'),
        sa.Column('handled_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('handled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('handle_remark', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.ForeignKeyConstraint(['visit_id'], ['patient_visits.id']),
        sa.ForeignKeyConstraint(['handled_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('alert_no')
    )
    op.create_index('idx_audit_alerts_patient', 'audit_alerts', ['patient_id'])
    op.create_index('idx_audit_alerts_visit', 'audit_alerts', ['visit_id'])
    op.create_index('idx_audit_alerts_status', 'audit_alerts', ['status'])


def downgrade() -> None:
    op.drop_index('idx_audit_alerts_status', 'audit_alerts')
    op.drop_index('idx_audit_alerts_visit', 'audit_alerts')
    op.drop_index('idx_audit_alerts_patient', 'audit_alerts')
    op.drop_table('audit_alerts')
    op.drop_index('idx_risk_assessments_visit', 'risk_assessments')
    op.drop_index('idx_risk_assessments_patient', 'risk_assessments')
    op.drop_table('risk_assessments')
