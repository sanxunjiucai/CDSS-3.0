from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase

from config import settings


engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def init_db():
    """创建所有表（开发用，生产用 Alembic）"""
    async with engine.begin() as conn:
        from db.models import disease, drug, exam, guideline, assessment, formula, user, audit_log, system_config, audit_rule  # noqa
        await conn.run_sync(Base.metadata.create_all)
        statements = [
            # diseases 旧字段补丁
            "ALTER TABLE diseases ADD COLUMN IF NOT EXISTS definition TEXT",
            "ALTER TABLE diseases ADD COLUMN IF NOT EXISTS pathogenesis TEXT",
            "ALTER TABLE diseases ADD COLUMN IF NOT EXISTS differential_diagnosis TEXT",
            "ALTER TABLE diseases ADD COLUMN IF NOT EXISTS complications TEXT",
            "ALTER TABLE diseases ADD COLUMN IF NOT EXISTS prevention TEXT",
            # diseases 新增字段
            "ALTER TABLE diseases ADD COLUMN IF NOT EXISTS disease_type VARCHAR(50)",
            "ALTER TABLE diseases ADD COLUMN IF NOT EXISTS specialty VARCHAR(100)",
            "ALTER TABLE diseases ADD COLUMN IF NOT EXISTS follow_up TEXT",
            "ALTER TABLE diseases ADD COLUMN IF NOT EXISTS source VARCHAR(200)",
            "ALTER TABLE diseases ADD COLUMN IF NOT EXISTS version_no VARCHAR(20)",
        ]
        for stmt in statements:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
