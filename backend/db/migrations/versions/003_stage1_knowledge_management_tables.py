"""stage1_knowledge_management_tables

Revision ID: 003
Revises: 002
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 创建 knowledge_sources 表
    op.create_table('knowledge_sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('source_code', sa.String(64), nullable=False),
        sa.Column('source_name', sa.String(255), nullable=False),
        sa.Column('source_type', sa.String(64), nullable=True),
        sa.Column('organization', sa.String(255), nullable=True),
        sa.Column('publish_date', sa.Date(), nullable=True),
        sa.Column('effective_date', sa.Date(), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('version_no', sa.String(64), nullable=True),
        sa.Column('file_url', sa.String(500), nullable=True),
        sa.Column('status', sa.String(32), server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_code')
    )

    # 2. 创建 import_batches 表
    op.create_table('import_batches',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('batch_no', sa.String(64), nullable=False),
        sa.Column('import_type', sa.String(64), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('total_count', sa.Integer(), server_default='0'),
        sa.Column('success_count', sa.Integer(), server_default='0'),
        sa.Column('fail_count', sa.Integer(), server_default='0'),
        sa.Column('import_status', sa.String(32), server_default='pending'),
        sa.Column('operator_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('operator_name', sa.String(128), nullable=True),
        sa.Column('imported_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('remark', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['operator_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('batch_no')
    )

    # 3. 创建 import_error_logs 表
    op.create_table('import_error_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('row_no', sa.Integer(), nullable=True),
        sa.Column('field_name', sa.String(128), nullable=True),
        sa.Column('field_value', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['batch_id'], ['import_batches.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_import_error_logs_batch', 'import_error_logs', ['batch_id'])


def downgrade() -> None:
    op.drop_index('idx_import_error_logs_batch', 'import_error_logs')
    op.drop_table('import_error_logs')
    op.drop_table('import_batches')
    op.drop_table('knowledge_sources')
