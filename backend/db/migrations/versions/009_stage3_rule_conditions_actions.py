"""stage3_rule_conditions_actions

Revision ID: 009
Revises: 008
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 创建 rule_conditions 表
    op.create_table('rule_conditions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('rule_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('condition_group_no', sa.Integer(), server_default='1'),
        sa.Column('field_name', sa.String(128), nullable=False),
        sa.Column('operator', sa.String(32), nullable=False),
        sa.Column('field_value', sa.String(255), nullable=True),
        sa.Column('value_type', sa.String(32), nullable=True),
        sa.Column('logic_type', sa.String(16), server_default='AND'),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_rule_conditions_rule', 'rule_conditions', ['rule_id'])

    # 2. 创建 rule_actions 表
    op.create_table('rule_actions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('rule_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action_type', sa.String(64), nullable=False),
        sa.Column('action_title', sa.String(255), nullable=True),
        sa.Column('action_content', sa.Text(), nullable=True),
        sa.Column('action_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('recommendation_level', sa.String(32), nullable=True),
        sa.Column('allow_apply', sa.Boolean(), server_default='true'),
        sa.Column('allow_ignore', sa.Boolean(), server_default='true'),
        sa.Column('ignore_reason_required', sa.Boolean(), server_default='false'),
        sa.Column('sort_order', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_rule_actions_rule', 'rule_actions', ['rule_id'])


def downgrade() -> None:
    op.drop_index('idx_rule_actions_rule', 'rule_actions')
    op.drop_table('rule_actions')
    op.drop_index('idx_rule_conditions_rule', 'rule_conditions')
    op.drop_table('rule_conditions')
