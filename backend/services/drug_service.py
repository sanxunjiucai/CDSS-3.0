from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.drug_repo import DrugRepository
from db.models.drug import Drug
from db.elasticsearch.sync import sync_drug
from schemas.drug import DrugCreate, DrugUpdate
from core.exceptions import NotFoundError
from core.pagination import PaginationParams


class DrugService:
    def __init__(self, session: AsyncSession):
        self.repo = DrugRepository(session)

    async def get_list(self, params: PaginationParams):
        return await self.repo.get_list(params.offset, params.page_size)

    async def get_detail(self, drug_id: UUID) -> Drug:
        drug = await self.repo.get_by_id(drug_id)
        if not drug:
            raise NotFoundError("药品")
        return drug

    async def create(self, data: DrugCreate) -> Drug:
        drug = Drug(**data.model_dump())
        saved = await self.repo.create(drug)
        await sync_drug(saved)
        return saved

    async def update(self, drug_id: UUID, data: DrugUpdate) -> Drug:
        drug = await self.repo.get_by_id(drug_id)
        if not drug:
            raise NotFoundError("药品")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(drug, field, value)
        updated = await self.repo.update(drug)
        await sync_drug(updated)
        return updated

    async def delete(self, drug_id: UUID) -> None:
        drug = await self.repo.get_by_id(drug_id)
        if not drug:
            raise NotFoundError("药品")
        await self.repo.delete(drug)
