from sqlalchemy import String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from uuid import uuid4, UUID
from datetime import datetime

from db.database import Base


class Assessment(Base):
    """评估量表"""
    __tablename__ = "assessments"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    department: Mapped[str | None] = mapped_column(String(100))

    # 题目结构 JSON：
    # [{id, text, options:[{value, score, label}], auto_fill_field}]
    # auto_fill_field: 可以从患者上下文自动填充的字段名
    questions: Mapped[list] = mapped_column(JSON, default=list)

    # 评分规则 JSON：
    # [{range_min, range_max, level, interpretation, recommendation}]
    scoring_rules: Mapped[list] = mapped_column(JSON, default=list)

    is_published: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
