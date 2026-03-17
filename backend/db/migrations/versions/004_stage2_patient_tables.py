"""stage2_patient_tables

Revision ID: 004
Revises: 003
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 创建 patients 表
    op.create_table('patients',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_no', sa.String(100), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('gender', sa.String(10), nullable=True),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('id_card', sa.String(50), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('blood_type', sa.String(10), nullable=True),
        sa.Column('allergies', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('past_history', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('family_history', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('source', sa.String(50), server_default='his'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('patient_no')
    )
    op.create_index('idx_patients_no', 'patients', ['patient_no'])
    op.create_index('idx_patients_name', 'patients', ['name'])

    # 2. 创建 patient_visits 表
    op.create_table('patient_visits',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('visit_no', sa.String(100), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('visit_type', sa.String(32), nullable=True),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('doctor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('doctor_name', sa.String(100), nullable=True),
        sa.Column('visit_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('chief_complaint', sa.Text(), nullable=True),
        sa.Column('present_illness', sa.Text(), nullable=True),
        sa.Column('status', sa.String(32), server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.ForeignKeyConstraint(['doctor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('visit_no')
    )
    op.create_index('idx_patient_visits_patient', 'patient_visits', ['patient_id'])
    op.create_index('idx_patient_visits_no', 'patient_visits', ['visit_no'])


def downgrade() -> None:
    op.drop_index('idx_patient_visits_no', 'patient_visits')
    op.drop_index('idx_patient_visits_patient', 'patient_visits')
    op.drop_table('patient_visits')
    op.drop_index('idx_patients_name', 'patients')
    op.drop_index('idx_patients_no', 'patients')
    op.drop_table('patients')
