from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.base_repo import BaseRepository
from db.models.guideline import Guideline
from db.elasticsearch.sync import sync_guideline
from core.exceptions import NotFoundError
from core.pagination import PaginationParams


class GuidelineRepository(BaseRepository[Guideline]):
    def __init__(self, session: AsyncSession):
        super().__init__(Guideline, session)


class GuidelineService:
    def __init__(self, session: AsyncSession):
        self.repo = GuidelineRepository(session)

    async def get_list(self, params: PaginationParams, department: Optional[str] = None):
        if department:
            from sqlalchemy import select, func
            from db.models.guideline import Guideline as G
            where = G.department == department
            cnt = await self.repo.session.execute(select(func.count()).select_from(G).where(where))
            total = cnt.scalar() or 0
            rows = await self.repo.session.execute(
                select(G).where(where).offset(params.offset).limit(params.page_size)
            )
            return list(rows.scalars().all()), total
        return await self.repo.get_list(params.offset, params.page_size)

    async def get_detail(self, guideline_id: UUID) -> Guideline:
        obj = await self.repo.get_by_id(guideline_id)
        if not obj:
            raise NotFoundError("指南")
        return obj

    async def create(self, data: dict) -> Guideline:
        guideline = Guideline(**data)
        saved = await self.repo.create(guideline)
        await sync_guideline(saved)
        return saved

    async def update(self, guideline_id: UUID, data: dict) -> Guideline:
        guideline = await self.repo.get_by_id(guideline_id)
        if not guideline:
            raise NotFoundError("指南")
        for field, value in data.items():
            if value is not None and hasattr(guideline, field):
                setattr(guideline, field, value)
        updated = await self.repo.update(guideline)
        await sync_guideline(updated)
        return updated

    async def delete(self, guideline_id: UUID) -> None:
        guideline = await self.repo.get_by_id(guideline_id)
        if not guideline:
            raise NotFoundError("指南")
        await self.repo.delete(guideline)

    async def search(self, q: str, offset: int = 0, limit: int = 20):
        from sqlalchemy import select, or_
        from db.models.guideline import Guideline as G
        pattern = f"%{q}%"
        where = or_(G.title.ilike(pattern), G.organization.ilike(pattern), G.department.ilike(pattern))
        from sqlalchemy import func
        cnt = await self.repo.session.execute(select(func.count()).select_from(G).where(where))
        total = cnt.scalar() or 0
        rows = await self.repo.session.execute(select(G).where(where).offset(offset).limit(limit))
        items = rows.scalars().all()
        return list(items), total
