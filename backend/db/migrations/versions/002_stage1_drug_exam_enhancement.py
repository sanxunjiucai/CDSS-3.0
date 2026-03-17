"""stage1_drug_exam_enhancement

Revision ID: 002
Revises: 001
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 优化 drugs 表
    op.add_column('drugs', sa.Column('pinyin', sa.String(255), nullable=True))
    op.add_column('drugs', sa.Column('pinyin_abbr', sa.String(64), nullable=True))
    op.add_column('drugs', sa.Column('drug_type', sa.String(50), nullable=True))
    op.add_column('drugs', sa.Column('prescription_type', sa.String(32), nullable=True))
    op.add_column('drugs', sa.Column('administration_route', sa.String(100), nullable=True))
    op.add_column('drugs', sa.Column('is_high_risk', sa.Boolean(), server_default='false'))
    op.add_column('drugs', sa.Column('is_antibiotic', sa.Boolean(), server_default='false'))
    op.add_column('drugs', sa.Column('pregnancy_category', sa.String(10), nullable=True))

    # 2. 优化 exams 表（reference_ranges已存在，跳过）
    op.add_column('exams', sa.Column('pinyin', sa.String(255), nullable=True))
    op.add_column('exams', sa.Column('pinyin_abbr', sa.String(64), nullable=True))
    op.add_column('exams', sa.Column('exam_category', sa.String(50), nullable=True))
    op.add_column('exams', sa.Column('sample_type', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('exams', 'sample_type')
    op.drop_column('exams', 'exam_category')
    op.drop_column('exams', 'pinyin_abbr')
    op.drop_column('exams', 'pinyin')
    op.drop_column('drugs', 'pregnancy_category')
    op.drop_column('drugs', 'is_antibiotic')
    op.drop_column('drugs', 'is_high_risk')
    op.drop_column('drugs', 'administration_route')
    op.drop_column('drugs', 'prescription_type')
    op.drop_column('drugs', 'drug_type')
    op.drop_column('drugs', 'pinyin_abbr')
    op.drop_column('drugs', 'pinyin')
