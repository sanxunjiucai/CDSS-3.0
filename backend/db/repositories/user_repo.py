from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.user import User
from db.repositories.base_repo import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_username(self, username: str) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.username == username, User.is_active == True)
        )
        return result.scalar_one_or_none()

    async def get_list_with_search(
        self, offset: int = 0, limit: int = 20, q: Optional[str] = None
    ) -> tuple[List[User], int]:
        where_clause = None
        if q:
            pattern = f"%{q}%"
            where_clause = or_(
                User.username.ilike(pattern),
                User.display_name.ilike(pattern),
            )

        count_q = select(func.count()).select_from(User)
        list_q = select(User)
        if where_clause is not None:
            count_q = count_q.where(where_clause)
            list_q = list_q.where(where_clause)

        total = (await self.session.execute(count_q)).scalar() or 0
        items = (await self.session.execute(
            list_q.order_by(User.created_at.desc()).offset(offset).limit(limit)
        )).scalars().all()
        return list(items), total
