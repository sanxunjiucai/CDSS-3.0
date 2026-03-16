from typing import List, Optional, Tuple
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.drug import Drug
from db.repositories.base_repo import BaseRepository


class DrugRepository(BaseRepository[Drug]):
    def __init__(self, session: AsyncSession):
        super().__init__(Drug, session)

    async def search_by_name(self, keyword: str, offset: int = 0, limit: int = 20) -> Tuple[List[Drug], int]:
        pattern = f"%{keyword}%"
        where = or_(Drug.name.ilike(pattern), Drug.trade_name.ilike(pattern))
        count_result = await self.session.execute(select(func.count()).select_from(Drug).where(where))
        total = count_result.scalar()
        result = await self.session.execute(
            select(Drug).where(where).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total

    async def get_by_category(self, category: str, offset: int = 0, limit: int = 20) -> Tuple[List[Drug], int]:
        where = Drug.category == category
        count_result = await self.session.execute(select(func.count()).select_from(Drug).where(where))
        total = count_result.scalar()
        result = await self.session.execute(
            select(Drug).where(where).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total

    async def search_by_keyword(
        self, keyword: str, offset: int = 0, limit: int = 20, category: Optional[str] = None
    ) -> Tuple[List[Drug], int]:
        pattern = f"%{keyword}%"
        conditions = [or_(Drug.name.ilike(pattern), Drug.trade_name.ilike(pattern), Drug.indications.ilike(pattern))]
        if category:
            conditions.append(Drug.category == category)
        where = and_(*conditions)
        count_result = await self.session.execute(select(func.count()).select_from(Drug).where(where))
        total = count_result.scalar()
        result = await self.session.execute(
            select(Drug).where(where).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total
