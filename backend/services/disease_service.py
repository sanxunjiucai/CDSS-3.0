from uuid import UUID
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.disease_repo import DiseaseRepository
from db.models.disease import Disease
from db.elasticsearch.sync import sync_disease
from schemas.disease import DiseaseCreate, DiseaseUpdate
from core.exceptions import NotFoundError
from core.pagination import PaginationParams


class DiseaseService:
    def __init__(self, session: AsyncSession):
        self.repo = DiseaseRepository(session)

    async def get_list(self, params: PaginationParams, department: Optional[str] = None):
        if department:
            items, total = await self.repo.get_by_department(department, params.offset, params.page_size)
        else:
            items, total = await self.repo.get_list(params.offset, params.page_size)
        return items, total

    async def get_detail(self, disease_id: UUID) -> Disease:
        disease = await self.repo.get_by_id(disease_id)
        if not disease:
            raise NotFoundError("疾病")
        return disease

    async def create(self, data: DiseaseCreate) -> Disease:
        disease = Disease(**data.model_dump())
        saved = await self.repo.create(disease)
        await sync_disease(saved)
        return saved

    async def update(self, disease_id: UUID, data: DiseaseUpdate) -> Disease:
        disease = await self.repo.get_by_id(disease_id)
        if not disease:
            raise NotFoundError("疾病")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(disease, field, value)
        updated = await self.repo.update(disease)
        await sync_disease(updated)
        return updated

    async def delete(self, disease_id: UUID) -> None:
        disease = await self.repo.get_by_id(disease_id)
        if not disease:
            raise NotFoundError("疾病")
        await self.repo.delete(disease)
