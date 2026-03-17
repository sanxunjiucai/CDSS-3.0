"""stage3_rule_scopes

Revision ID: 010
Revises: 009
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 创建 rule_scopes 表
    op.create_table('rule_scopes',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('rule_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('hospital_scope', sa.String(255), nullable=True),
        sa.Column('department_scope', sa.String(255), nullable=True),
        sa.Column('doctor_scope', sa.String(255), nullable=True),
        sa.Column('patient_type_scope', sa.String(255), nullable=True),
        sa.Column('age_min', sa.Integer(), nullable=True),
        sa.Column('age_max', sa.Integer(), nullable=True),
        sa.Column('gender_scope', sa.String(32), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_rule_scopes_rule', 'rule_scopes', ['rule_id'])


def downgrade() -> None:
    op.drop_index('idx_rule_scopes_rule', 'rule_scopes')
    op.drop_table('rule_scopes')
