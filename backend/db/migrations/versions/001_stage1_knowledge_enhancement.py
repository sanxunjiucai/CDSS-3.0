"""stage1_knowledge_enhancement

Revision ID: 001
Revises:
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 优化 diseases 表 - 新增字段（version_no已存在，跳过）
    op.add_column('diseases', sa.Column('pinyin', sa.String(255), nullable=True))
    op.add_column('diseases', sa.Column('pinyin_abbr', sa.String(64), nullable=True))
    op.add_column('diseases', sa.Column('is_common', sa.Boolean(), server_default='false'))
    op.add_column('diseases', sa.Column('is_chronic', sa.Boolean(), server_default='false'))
    op.add_column('diseases', sa.Column('is_infectious', sa.Boolean(), server_default='false'))
    op.add_column('diseases', sa.Column('severity_level', sa.String(32), nullable=True))

    # 2. 创建 disease_aliases 表
    op.create_table('disease_aliases',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('disease_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('alias_name', sa.String(255), nullable=False),
        sa.Column('alias_type', sa.String(64), nullable=True),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['disease_id'], ['diseases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_disease_aliases_disease_id', 'disease_aliases', ['disease_id'])
    op.create_index('idx_disease_aliases_name', 'disease_aliases', ['alias_name'])

    # 3. 创建 disease_categories 表
    op.create_table('disease_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('category_code', sa.String(64), nullable=False),
        sa.Column('category_name', sa.String(255), nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('level_no', sa.Integer(), server_default='1'),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
        sa.Column('status', sa.String(32), server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['parent_id'], ['disease_categories.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category_code')
    )
    op.create_index('idx_disease_categories_parent', 'disease_categories', ['parent_id'])


def downgrade() -> None:
    op.drop_index('idx_disease_categories_parent', 'disease_categories')
    op.drop_table('disease_categories')
    op.drop_index('idx_disease_aliases_name', 'disease_aliases')
    op.drop_index('idx_disease_aliases_disease_id', 'disease_aliases')
    op.drop_table('disease_aliases')
    op.drop_column('diseases', 'severity_level')
    op.drop_column('diseases', 'is_infectious')
    op.drop_column('diseases', 'is_chronic')
    op.drop_column('diseases', 'is_common')
    op.drop_column('diseases', 'pinyin_abbr')
    op.drop_column('diseases', 'pinyin')
