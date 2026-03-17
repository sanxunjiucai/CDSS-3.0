"""stage2_prescription_risk_tables

Revision ID: 006
Revises: 005
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 创建 prescriptions 表
    op.create_table('prescriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('prescription_no', sa.String(100), nullable=False),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('prescription_type', sa.String(32), nullable=True),
        sa.Column('status', sa.String(32), server_default='draft'),
        sa.Column('prescribed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('prescribed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('remark', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['visit_id'], ['patient_visits.id']),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.ForeignKeyConstraint(['prescribed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('prescription_no')
    )
    op.create_index('idx_prescriptions_visit', 'prescriptions', ['visit_id'])
    op.create_index('idx_prescriptions_patient', 'prescriptions', ['patient_id'])

    # 2. 创建 prescription_items 表
    op.create_table('prescription_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('prescription_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('drug_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('drug_code', sa.String(64), nullable=True),
        sa.Column('drug_name', sa.String(255), nullable=False),
        sa.Column('dosage', sa.String(100), nullable=True),
        sa.Column('frequency', sa.String(100), nullable=True),
        sa.Column('administration_route', sa.String(100), nullable=True),
        sa.Column('duration', sa.String(100), nullable=True),
        sa.Column('quantity', sa.Numeric(10, 2), nullable=True),
        sa.Column('unit', sa.String(50), nullable=True),
        sa.Column('remark', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['prescription_id'], ['prescriptions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['drug_id'], ['drugs.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_prescription_items_prescription', 'prescription_items', ['prescription_id'])
    op.create_index('idx_prescription_items_drug', 'prescription_items', ['drug_id'])


def downgrade() -> None:
    op.drop_index('idx_prescription_items_drug', 'prescription_items')
    op.drop_index('idx_prescription_items_prescription', 'prescription_items')
    op.drop_table('prescription_items')
    op.drop_index('idx_prescriptions_patient', 'prescriptions')
    op.drop_index('idx_prescriptions_visit', 'prescriptions')
    op.drop_table('prescriptions')
