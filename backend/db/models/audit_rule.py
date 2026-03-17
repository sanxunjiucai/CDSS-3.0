from sqlalchemy import String, Text, DateTime, JSON, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from uuid import uuid4, UUID
from datetime import datetime

from db.database import Base


class AuditRule(Base):
    __tablename__ = "audit_rules"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    scenario: Mapped[str] = mapped_column(String(50), nullable=False, default="diagnosis_consistency", index=True)
    level: Mapped[str] = mapped_column(String(20), nullable=False, default="warning")
    code: Mapped[str] = mapped_column(String(100), nullable=False, default="CUSTOM_RULE")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    suggestion: Mapped[str | None] = mapped_column(Text)
    rule_type: Mapped[str | None] = mapped_column(String(64))
    trigger_scene: Mapped[str | None] = mapped_column(String(64))
    priority_level: Mapped[int] = mapped_column(Integer, default=0)
    disease_id: Mapped[UUID | None] = mapped_column(ForeignKey("diseases.id"))
    source_id: Mapped[UUID | None] = mapped_column(ForeignKey("knowledge_sources.id"))
    evidence_text: Mapped[str | None] = mapped_column(Text)
    condition: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
