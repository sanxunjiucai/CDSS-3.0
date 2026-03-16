from typing import List, Optional, Tuple
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.exam import Exam
from db.repositories.base_repo import BaseRepository


class ExamRepository(BaseRepository[Exam]):
    def __init__(self, session: AsyncSession):
        super().__init__(Exam, session)

    async def search_by_name(self, keyword: str, offset: int = 0, limit: int = 20) -> Tuple[List[Exam], int]:
        pattern = f"%{keyword}%"
        where = or_(Exam.name.ilike(pattern), Exam.code.ilike(pattern))
        count_result = await self.session.execute(select(func.count()).select_from(Exam).where(where))
        total = count_result.scalar()
        result = await self.session.execute(
            select(Exam).where(where).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total

    async def get_by_type(self, exam_type: str, offset: int = 0, limit: int = 20) -> Tuple[List[Exam], int]:
        where = Exam.type == exam_type
        count_result = await self.session.execute(select(func.count()).select_from(Exam).where(where))
        total = count_result.scalar()
        result = await self.session.execute(
            select(Exam).where(where).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total

    async def search_by_keyword(
        self, keyword: str, offset: int = 0, limit: int = 20, exam_type: Optional[str] = None
    ) -> Tuple[List[Exam], int]:
        pattern = f"%{keyword}%"
        conditions = [or_(Exam.name.ilike(pattern), Exam.code.ilike(pattern), Exam.clinical_significance.ilike(pattern))]
        if exam_type:
            conditions.append(Exam.type == exam_type)
        where = and_(*conditions)
        count_result = await self.session.execute(select(func.count()).select_from(Exam).where(where))
        total = count_result.scalar()
        result = await self.session.execute(
            select(Exam).where(where).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total
