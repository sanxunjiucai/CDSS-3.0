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
