from sqlalchemy import String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from uuid import uuid4, UUID
from datetime import datetime

from db.database import Base


class Guideline(Base):
    __tablename__ = "guidelines"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    organization: Mapped[str | None] = mapped_column(String(200))  # 发布机构
    publish_year: Mapped[int | None] = mapped_column()
    department: Mapped[str | None] = mapped_column(String(100))
    disease_tags: Mapped[list] = mapped_column(JSON, default=list)  # 关联疾病标签

    summary: Mapped[str | None] = mapped_column(Text)
    content: Mapped[str | None] = mapped_column(Text)   # 全文（富文本）
    file_url: Mapped[str | None] = mapped_column(String(500))  # MinIO PDF 地址

    is_published: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
