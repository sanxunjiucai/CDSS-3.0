from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.exam_repo import ExamRepository
from db.models.exam import Exam
from db.elasticsearch.sync import sync_exam
from schemas.exam import ExamCreate, ExamUpdate
from core.exceptions import NotFoundError
from core.pagination import PaginationParams


class ExamService:
    def __init__(self, session: AsyncSession):
        self.repo = ExamRepository(session)

    async def get_list(self, params: PaginationParams):
        return await self.repo.get_list(params.offset, params.page_size)

    async def get_detail(self, exam_id: UUID) -> Exam:
        exam = await self.repo.get_by_id(exam_id)
        if not exam:
            raise NotFoundError("检验检查项目")
        return exam

    async def create(self, data: ExamCreate) -> Exam:
        exam = Exam(**data.model_dump())
        saved = await self.repo.create(exam)
        await sync_exam(saved)
        return saved

    async def update(self, exam_id: UUID, data: ExamUpdate) -> Exam:
        exam = await self.repo.get_by_id(exam_id)
        if not exam:
            raise NotFoundError("检验检查项目")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(exam, field, value)
        updated = await self.repo.update(exam)
        await sync_exam(updated)
        return updated

    async def delete(self, exam_id: UUID) -> None:
        exam = await self.repo.get_by_id(exam_id)
        if not exam:
            raise NotFoundError("检验检查项目")
        await self.repo.delete(exam)
