from sqlalchemy import String, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from uuid import uuid4, UUID
from datetime import datetime

from db.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[str | None] = mapped_column(String(100))
    patient_id: Mapped[str | None] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(100))     # 操作类型
    resource: Mapped[str | None] = mapped_column(String(100))  # 操作对象
    resource_id: Mapped[str | None] = mapped_column(String(100))
    detail: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
