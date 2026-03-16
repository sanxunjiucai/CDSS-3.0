from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.disease import (
    DiseaseListItem, DiseaseDetail,
    TreatmentPlanCreate, TreatmentPlanUpdate, TreatmentPlanItem,
)
from schemas.common import Response, PaginatedData
from services.disease_service import DiseaseService
from core.pagination import PaginationParams

router = APIRouter()


# ─── 疾病列表 & 详情 ──────────────────────────────────────────────────────────

@router.get("/diseases", response_model=Response[PaginatedData[DiseaseListItem]], summary="疾病列表")
async def list_diseases(
    q: Optional[str] = Query(None, description="关键词搜索（名称/ICD编码）"),
    department: Optional[str] = Query(None, description="按科室过滤"),
    system: Optional[str] = Query(None, description="按系统过滤"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    service = DiseaseService(session)
    params = PaginationParams(page=page, page_size=page_size)
    items, total = await service.get_list(params, department=department, system=system, q=q)
    total_pages = (total + page_size - 1) // page_size
    return Response.ok(PaginatedData(
        items=[DiseaseListItem.model_validate(d) for d in items],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    ))


@router.get("/diseases/{disease_id}", response_model=Response[DiseaseDetail], summary="疾病详情（含治疗方案）")
async def get_disease(disease_id: UUID, session: AsyncSession = Depends(get_db)):
    service = DiseaseService(session)
    disease = await service.get_detail(disease_id)
    return Response.ok(DiseaseDetail.model_validate(disease))


# ─── 治疗方案子路由 ───────────────────────────────────────────────────────────

@router.get("/diseases/{disease_id}/treatment-plans",
            response_model=Response[List[TreatmentPlanItem]],
            summary="获取疾病治疗方案列表")
async def list_treatment_plans(disease_id: UUID, session: AsyncSession = Depends(get_db)):
    service = DiseaseService(session)
    plans = await service.get_treatment_plans(disease_id)
    return Response.ok([TreatmentPlanItem.model_validate(p) for p in plans])


@router.post("/diseases/{disease_id}/treatment-plans",
             response_model=Response[TreatmentPlanItem],
             summary="新增治疗方案")
async def create_treatment_plan(
    disease_id: UUID,
    data: TreatmentPlanCreate,
    session: AsyncSession = Depends(get_db),
):
    # 用 URL 里的 disease_id 覆盖 body 里的（保证一致性）
    merged = TreatmentPlanCreate(**{**data.model_dump(), "disease_id": disease_id})
    service = DiseaseService(session)
    plan = await service.create_treatment_plan(merged)
    return Response.ok(TreatmentPlanItem.model_validate(plan))


@router.put("/treatment-plans/{plan_id}",
            response_model=Response[TreatmentPlanItem],
            summary="更新治疗方案")
async def update_treatment_plan(
    plan_id: UUID,
    data: TreatmentPlanUpdate,
    session: AsyncSession = Depends(get_db),
):
    service = DiseaseService(session)
    plan = await service.update_treatment_plan(plan_id, data)
    return Response.ok(TreatmentPlanItem.model_validate(plan))


@router.delete("/treatment-plans/{plan_id}", response_model=Response[None], summary="删除治疗方案")
async def delete_treatment_plan(plan_id: UUID, session: AsyncSession = Depends(get_db)):
    service = DiseaseService(session)
    await service.delete_treatment_plan(plan_id)
    return Response.ok(None)
