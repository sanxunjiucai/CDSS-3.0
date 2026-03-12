from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.disease import DiseaseListItem, DiseaseDetail
from schemas.common import Response, PaginatedData
from services.disease_service import DiseaseService
from core.pagination import PaginationParams

router = APIRouter()


@router.get("/diseases", response_model=Response[PaginatedData[DiseaseListItem]], summary="疾病列表")
async def list_diseases(
    department: Optional[str] = Query(None, description="按科室过滤"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    service = DiseaseService(session)
    params = PaginationParams(page=page, page_size=page_size)
    items, total = await service.get_list(params, department)
    total_pages = (total + page_size - 1) // page_size
    return Response.ok(PaginatedData(
        items=[DiseaseListItem.model_validate(d) for d in items],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    ))


@router.get("/diseases/{disease_id}", response_model=Response[DiseaseDetail], summary="疾病详情")
async def get_disease(disease_id: UUID, session: AsyncSession = Depends(get_db)):
    service = DiseaseService(session)
    disease = await service.get_detail(disease_id)
    return Response.ok(DiseaseDetail.model_validate(disease))
