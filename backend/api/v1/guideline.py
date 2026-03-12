from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.common import Response, PaginatedData
from services.guideline_service import GuidelineService
from core.pagination import PaginationParams

router = APIRouter()


@router.get("/guidelines", summary="指南列表")
async def list_guidelines(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    service = GuidelineService(session)
    params = PaginationParams(page=page, page_size=page_size)
    items, total = await service.get_list(params)
    total_pages = (total + page_size - 1) // page_size
    return Response.ok({"items": [{"id": str(g.id), "title": g.title,
                                   "organization": g.organization,
                                   "department": g.department} for g in items],
                         "total": total, "page": page,
                         "page_size": page_size, "total_pages": total_pages})


@router.get("/guidelines/{guideline_id}", summary="指南详情")
async def get_guideline(guideline_id: UUID, session: AsyncSession = Depends(get_db)):
    service = GuidelineService(session)
    g = await service.get_detail(guideline_id)
    return Response.ok({"id": str(g.id), "title": g.title, "content": g.content,
                         "summary": g.summary, "file_url": g.file_url})
