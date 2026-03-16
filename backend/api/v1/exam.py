from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.exam import ExamListItem, ExamDetail
from schemas.common import Response, PaginatedData
from services.exam_service import ExamService
from core.pagination import PaginationParams

router = APIRouter()


@router.get("/exams", response_model=Response[PaginatedData[ExamListItem]], summary="检验检查列表")
async def list_exams(
    q: Optional[str] = Query(None, description="关键词搜索（名称/编码）"),
    type: Optional[str] = Query(None, description="按类型过滤（lab/exam）"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    service = ExamService(session)
    params = PaginationParams(page=page, page_size=page_size)
    items, total = await service.get_list(params, type=type, q=q)
    total_pages = (total + page_size - 1) // page_size
    return Response.ok(PaginatedData(
        items=[ExamListItem.model_validate(e) for e in items],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    ))


@router.get("/exams/{exam_id}", response_model=Response[ExamDetail], summary="检验检查详情")
async def get_exam(exam_id: UUID, session: AsyncSession = Depends(get_db)):
    service = ExamService(session)
    exam = await service.get_detail(exam_id)
    return Response.ok(ExamDetail.model_validate(exam))
