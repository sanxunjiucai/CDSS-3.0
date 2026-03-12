from typing import TypeVar, Generic, Type, Optional, List
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    def __init__(self, model: Type[ModelT], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: UUID) -> Optional[ModelT]:
        result = await self.session.get(self.model, id)
        return result

    async def get_list(self, offset: int = 0, limit: int = 20) -> tuple[List[ModelT], int]:
        count_result = await self.session.execute(select(func.count()).select_from(self.model))
        total = count_result.scalar()

        result = await self.session.execute(
            select(self.model).offset(offset).limit(limit)
        )
        items = result.scalars().all()
        return list(items), total

    async def create(self, obj: ModelT) -> ModelT:
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def update(self, obj: ModelT) -> ModelT:
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.session.delete(obj)
        await self.session.commit()
