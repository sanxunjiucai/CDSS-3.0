from sqlalchemy import String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from uuid import uuid4, UUID
from datetime import datetime

from db.database import Base


class Disease(Base):
    __tablename__ = "diseases"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    icd_code: Mapped[str | None] = mapped_column(String(20), index=True)
    alias: Mapped[list] = mapped_column(JSON, default=list)
    department: Mapped[str | None] = mapped_column(String(100))
    system: Mapped[str | None] = mapped_column(String(100))

    overview: Mapped[str | None] = mapped_column(Text)
    etiology: Mapped[str | None] = mapped_column(Text)
    symptoms: Mapped[str | None] = mapped_column(Text)
    diagnosis_criteria: Mapped[str | None] = mapped_column(Text)
    treatment: Mapped[str | None] = mapped_column(Text)
    prognosis: Mapped[str | None] = mapped_column(Text)

    # 关联（存储 UUID 列表）
    related_drug_ids: Mapped[list] = mapped_column(JSON, default=list)
    related_exam_ids: Mapped[list] = mapped_column(JSON, default=list)
    related_guideline_ids: Mapped[list] = mapped_column(JSON, default=list)

    is_published: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
