from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.drug import DrugListItem, DrugDetail
from schemas.common import Response, PaginatedData
from services.drug_service import DrugService
from core.pagination import PaginationParams

router = APIRouter()


@router.get("/drugs", response_model=Response[PaginatedData[DrugListItem]], summary="药品列表")
async def list_drugs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    service = DrugService(session)
    params = PaginationParams(page=page, page_size=page_size)
    items, total = await service.get_list(params)
    total_pages = (total + page_size - 1) // page_size
    return Response.ok(PaginatedData(
        items=[DrugListItem.model_validate(d) for d in items],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    ))


@router.get("/drugs/{drug_id}", response_model=Response[DrugDetail], summary="药品详情")
async def get_drug(drug_id: UUID, session: AsyncSession = Depends(get_db)):
    service = DrugService(session)
    drug = await service.get_detail(drug_id)
    return Response.ok(DrugDetail.model_validate(drug))
