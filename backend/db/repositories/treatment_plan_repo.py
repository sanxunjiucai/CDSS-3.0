from typing import List, Tuple
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.disease import DiseaseTreatmentPlan
from db.repositories.base_repo import BaseRepository


class TreatmentPlanRepository(BaseRepository[DiseaseTreatmentPlan]):
    def __init__(self, session: AsyncSession):
        super().__init__(DiseaseTreatmentPlan, session)

    async def get_by_disease(self, disease_id: UUID) -> List[DiseaseTreatmentPlan]:
        result = await self.session.execute(
            select(DiseaseTreatmentPlan)
            .where(DiseaseTreatmentPlan.disease_id == disease_id)
            .order_by(DiseaseTreatmentPlan.sort_order)
        )
        return list(result.scalars().all())

    async def get_by_disease_and_patient_group(
        self, disease_id: UUID, severity: str | None = None, patient_group: str | None = None
    ) -> List[DiseaseTreatmentPlan]:
        """按疾病 + 适用严重度 + 患者分组过滤治疗方案"""
        from sqlalchemy import or_, and_

        conditions = [DiseaseTreatmentPlan.disease_id == disease_id]

        if severity:
            conditions.append(
                or_(DiseaseTreatmentPlan.severity == severity, DiseaseTreatmentPlan.severity == "通用")
            )
        if patient_group:
            conditions.append(
                or_(
                    DiseaseTreatmentPlan.patient_group == patient_group,
                    DiseaseTreatmentPlan.patient_group == "通用",
                    DiseaseTreatmentPlan.patient_group.is_(None),
                )
            )

        result = await self.session.execute(
            select(DiseaseTreatmentPlan)
            .where(and_(*conditions))
            .order_by(DiseaseTreatmentPlan.sort_order)
        )
        return list(result.scalars().all())

    async def delete_by_disease(self, disease_id: UUID) -> None:
        plans = await self.get_by_disease(disease_id)
        for plan in plans:
            await self.session.delete(plan)
