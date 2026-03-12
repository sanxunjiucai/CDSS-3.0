from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from uuid import uuid4, UUID
from datetime import datetime

from db.database import Base


class Drug(Base):
    __tablename__ = "drugs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    trade_name: Mapped[str | None] = mapped_column(String(200))
    category: Mapped[str | None] = mapped_column(String(100))

    indications: Mapped[str | None] = mapped_column(Text)
    dosage: Mapped[str | None] = mapped_column(Text)
    contraindications: Mapped[str | None] = mapped_column(Text)
    interactions: Mapped[str | None] = mapped_column(Text)
    adverse_reactions: Mapped[str | None] = mapped_column(Text)
    special_population: Mapped[str | None] = mapped_column(Text)

    is_published: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
