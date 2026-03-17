"""stage2_diagnosis_lab_tables

Revision ID: 005
Revises: 004
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 创建 patient_diagnoses 表
    op.create_table('patient_diagnoses',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('disease_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('diagnosis_code', sa.String(50), nullable=True),
        sa.Column('diagnosis_name', sa.String(255), nullable=False),
        sa.Column('diagnosis_type', sa.String(32), nullable=True),
        sa.Column('diagnosis_order', sa.Integer(), nullable=True),
        sa.Column('diagnosed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('diagnosed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('remark', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['visit_id'], ['patient_visits.id']),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.ForeignKeyConstraint(['disease_id'], ['diseases.id']),
        sa.ForeignKeyConstraint(['diagnosed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_patient_diagnoses_visit', 'patient_diagnoses', ['visit_id'])
    op.create_index('idx_patient_diagnoses_patient', 'patient_diagnoses', ['patient_id'])
    op.create_index('idx_patient_diagnoses_disease', 'patient_diagnoses', ['disease_id'])

    # 2. 创建 lab_results 表
    op.create_table('lab_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('result_no', sa.String(100), nullable=False),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('exam_code', sa.String(64), nullable=True),
        sa.Column('exam_name', sa.String(255), nullable=False),
        sa.Column('result_value', sa.String(255), nullable=True),
        sa.Column('result_unit', sa.String(50), nullable=True),
        sa.Column('reference_min', sa.Numeric(10, 2), nullable=True),
        sa.Column('reference_max', sa.Numeric(10, 2), nullable=True),
        sa.Column('reference_text', sa.String(255), nullable=True),
        sa.Column('is_abnormal', sa.Boolean(), server_default='false'),
        sa.Column('abnormal_flag', sa.String(10), nullable=True),
        sa.Column('sample_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('report_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('interpretation', sa.Text(), nullable=True),
        sa.Column('clinical_significance', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.ForeignKeyConstraint(['visit_id'], ['patient_visits.id']),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('result_no')
    )
    op.create_index('idx_lab_results_patient', 'lab_results', ['patient_id'])
    op.create_index('idx_lab_results_visit', 'lab_results', ['visit_id'])
    op.create_index('idx_lab_results_exam', 'lab_results', ['exam_id'])


def downgrade() -> None:
    op.drop_index('idx_lab_results_exam', 'lab_results')
    op.drop_index('idx_lab_results_visit', 'lab_results')
    op.drop_index('idx_lab_results_patient', 'lab_results')
    op.drop_table('lab_results')
    op.drop_index('idx_patient_diagnoses_disease', 'patient_diagnoses')
    op.drop_index('idx_patient_diagnoses_patient', 'patient_diagnoses')
    op.drop_index('idx_patient_diagnoses_visit', 'patient_diagnoses')
    op.drop_table('patient_diagnoses')
