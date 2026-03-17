from sqlalchemy import String, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from uuid import uuid4, UUID
from datetime import datetime

from db.database import Base


class Literature(Base):
    __tablename__ = "literature"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    pmid: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), default="literature", index=True)

    department: Mapped[str | None] = mapped_column(String(100))
    journal: Mapped[str | None] = mapped_column(String(200))
    publish_year: Mapped[int | None] = mapped_column(Integer)
    published_at: Mapped[str | None] = mapped_column(String(20))

    authors: Mapped[str | None] = mapped_column(Text)
    keywords: Mapped[str | None] = mapped_column(Text)
    abstract: Mapped[str | None] = mapped_column(Text)

    source_url: Mapped[str | None] = mapped_column(String(500))
    pmc_url: Mapped[str | None] = mapped_column(String(500))
    doi: Mapped[str | None] = mapped_column(String(200))

    is_published: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
