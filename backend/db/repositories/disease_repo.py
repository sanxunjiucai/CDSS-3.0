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
        result = await self.session.execute(
            select(Disease).where(where).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total
