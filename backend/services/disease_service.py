from uuid import UUID
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from db.repositories.disease_repo import DiseaseRepository
from db.repositories.treatment_plan_repo import TreatmentPlanRepository
from db.models.disease import Disease, DiseaseTreatmentPlan
from db.elasticsearch.sync import sync_disease
from schemas.disease import DiseaseCreate, DiseaseUpdate, TreatmentPlanCreate, TreatmentPlanUpdate
from core.exceptions import NotFoundError
from core.pagination import PaginationParams


class DiseaseService:
    def __init__(self, session: AsyncSession):
        self.repo = DiseaseRepository(session)
        self.plan_repo = TreatmentPlanRepository(session)
        self.session = session

    async def get_list(
        self,
        params: PaginationParams,
        department: Optional[str] = None,
        system: Optional[str] = None,
        q: Optional[str] = None,
    ):
        if q:
            items, total = await self.repo.search_by_keyword(
                q, params.offset, params.page_size, department, system
            )
        elif department:
            items, total = await self.repo.get_by_department(department, params.offset, params.page_size)
        else:
            items, total = await self.repo.get_list(params.offset, params.page_size)
        return items, total

    async def get_detail(self, disease_id: UUID) -> Disease:
        """获取疾病详情，含治疗方案列表（eager load）"""
        result = await self.session.execute(
            select(Disease)
            .where(Disease.id == disease_id)
            .options(selectinload(Disease.treatment_plans))
        )
        disease = result.scalar_one_or_none()
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

    # ─── 治疗方案 CRUD ────────────────────────────────────────────────────────

    async def get_treatment_plans(self, disease_id: UUID) -> List[DiseaseTreatmentPlan]:
        disease = await self.repo.get_by_id(disease_id)
        if not disease:
            raise NotFoundError("疾病")
        return await self.plan_repo.get_by_disease(disease_id)

    async def create_treatment_plan(self, data: TreatmentPlanCreate) -> DiseaseTreatmentPlan:
        disease = await self.repo.get_by_id(data.disease_id)
        if not disease:
            raise NotFoundError("疾病")
        plan = DiseaseTreatmentPlan(**data.model_dump())
        return await self.plan_repo.create(plan)

    async def update_treatment_plan(self, plan_id: UUID, data: TreatmentPlanUpdate) -> DiseaseTreatmentPlan:
        plan = await self.plan_repo.get_by_id(plan_id)
        if not plan:
            raise NotFoundError("治疗方案")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(plan, field, value)
        return await self.plan_repo.update(plan)

    async def delete_treatment_plan(self, plan_id: UUID) -> None:
        plan = await self.plan_repo.get_by_id(plan_id)
        if not plan:
            raise NotFoundError("治疗方案")
        await self.plan_repo.delete(plan)
