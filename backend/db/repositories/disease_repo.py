from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.disease import Disease
from db.repositories.base_repo import BaseRepository


class DiseaseRepository(BaseRepository[Disease]):
    def __init__(self, session: AsyncSession):
        super().__init__(Disease, session)

    async def search_by_name(self, keyword: str, offset: int = 0, limit: int = 20) -> Tuple[List[Disease], int]:
        pattern = f"%{keyword}%"
        where = or_(
            Disease.name.ilike(pattern),
            Disease.icd_code.ilike(pattern),
        )
        count_result = await self.session.execute(select(func.count()).select_from(Disease).where(where))
        total = count_result.scalar()

        result = await self.session.execute(
            select(Disease).where(where).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total

    async def get_by_icd(self, icd_code: str) -> Optional[Disease]:
        result = await self.session.execute(
            select(Disease).where(Disease.icd_code == icd_code)
        )
        return result.scalar_one_or_none()

    async def get_by_department(self, department: str, offset: int = 0, limit: int = 20) -> Tuple[List[Disease], int]:
        where = Disease.department == department
        count_result = await self.session.execute(select(func.count()).select_from(Disease).where(where))
        total = count_result.scalar()
        if not total:
            where = Disease.department.ilike(f"%{department}%")
            count_result = await self.session.execute(select(func.count()).select_from(Disease).where(where))
            total = count_result.scalar()
        result = await self.session.execute(
            select(Disease).where(where).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total

    async def list_departments(self) -> List[dict]:
        result = await self.session.execute(
            select(Disease.department, func.count(Disease.id))
            .where(Disease.department.is_not(None), Disease.department != "")
            .group_by(Disease.department)
            .order_by(func.count(Disease.id).desc(), Disease.department.asc())
        )
        rows = result.all()
        return [
            {"name": department, "count": int(count)}
            for department, count in rows
            if department
        ]

    async def search_by_keyword(
        self,
        keyword: str,
        offset: int = 0,
        limit: int = 20,
        department: Optional[str] = None,
        system: Optional[str] = None,
    ) -> Tuple[List[Disease], int]:
        pattern = f"%{keyword}%"
        conditions = [
            or_(
                Disease.name.ilike(pattern),
                Disease.icd_code.ilike(pattern),
                Disease.overview.ilike(pattern),
                Disease.definition.ilike(pattern),
                Disease.pathogenesis.ilike(pattern),
                Disease.diagnosis_criteria.ilike(pattern),
                Disease.differential_diagnosis.ilike(pattern),
                Disease.complications.ilike(pattern),
                Disease.treatment.ilike(pattern),
                Disease.prognosis.ilike(pattern),
                Disease.prevention.ilike(pattern),
            )
        ]
        if department:
            conditions.append(Disease.department == department)
        if system:
            conditions.append(Disease.system == system)

        from sqlalchemy import and_
        where = and_(*conditions)
        count_result = await self.session.execute(select(func.count()).select_from(Disease).where(where))
        total = count_result.scalar()
        result = await self.session.execute(
            select(Disease).where(where).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total
