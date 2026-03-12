from sqlalchemy import String, Text, DateTime, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from uuid import uuid4, UUID
from datetime import datetime

from db.database import Base


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    code: Mapped[str | None] = mapped_column(String(50), index=True)
    type: Mapped[str] = mapped_column(String(10), default="lab")  # lab | exam

    description: Mapped[str | None] = mapped_column(Text)
    # JSON 格式：[{gender, age_min, age_max, unit, low, high, condition}]
    reference_ranges: Mapped[list] = mapped_column(JSON, default=list)
    clinical_significance: Mapped[str | None] = mapped_column(Text)
    indications: Mapped[str | None] = mapped_column(Text)
    preparation: Mapped[str | None] = mapped_column(Text)

    is_published: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
