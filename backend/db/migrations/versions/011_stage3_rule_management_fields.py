"""stage3_rule_management_fields

Revision ID: 011
Revises: 010
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("audit_rules", sa.Column("category", sa.String(64), nullable=True))
    op.add_column("audit_rules", sa.Column("module_name", sa.String(64), nullable=True))
    op.add_column("audit_rules", sa.Column("clinical_scene", sa.String(32), nullable=True))
    op.add_column("audit_rules", sa.Column("trigger_timing", sa.String(64), nullable=True))
    op.add_column("audit_rules", sa.Column("action_type", sa.String(64), nullable=True))
    op.add_column("audit_rules", sa.Column("writeback_target", sa.String(128), nullable=True))
    op.add_column("audit_rules", sa.Column("source_type", sa.String(64), nullable=True))
    op.add_column("audit_rules", sa.Column("source_name", sa.String(255), nullable=True))
    op.add_column("audit_rules", sa.Column("maintainer", sa.String(64), nullable=True))


def downgrade() -> None:
    op.drop_column("audit_rules", "maintainer")
    op.drop_column("audit_rules", "source_name")
    op.drop_column("audit_rules", "source_type")
    op.drop_column("audit_rules", "writeback_target")
    op.drop_column("audit_rules", "action_type")
    op.drop_column("audit_rules", "trigger_timing")
    op.drop_column("audit_rules", "clinical_scene")
    op.drop_column("audit_rules", "module_name")
    op.drop_column("audit_rules", "category")
