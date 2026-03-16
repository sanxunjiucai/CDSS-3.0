from sqlalchemy import String, Text, DateTime, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from uuid import uuid4, UUID
from datetime import datetime

from db.database import Base


class Formula(Base):
    """医学公式"""
    __tablename__ = "formulas"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(100))      # 肾功能/心血管/营养...
    description: Mapped[str | None] = mapped_column(Text)
    formula_expr: Mapped[str | None] = mapped_column(Text)          # 公式表达式字符串
    reference: Mapped[str | None] = mapped_column(Text)             # 文献来源
    department: Mapped[str | None] = mapped_column(String(100))     # 常用科室

    # 参数定义 JSON：
    # [{"name": "weight", "label": "体重", "unit": "kg", "type": "number",
    #   "min": 0, "max": 500, "placeholder": "请输入体重"}]
    parameters: Mapped[list] = mapped_column(JSON, default=list)

    # 结果解读规则 JSON：
    # [{"min": 0, "max": 18.5, "level": "偏瘦",
    #   "interpretation": "体重偏低，建议营养支持", "color": "warning"}]
    interpretation_rules: Mapped[list] = mapped_column(JSON, default=list)

    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
