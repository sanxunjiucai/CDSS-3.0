from uuid import UUID
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.common import Response
from services.risk_assess_service import RiskAssessService
from services.patient_context_service import PatientContextService

router = APIRouter()


@router.get("/assessments", summary="量表列表")
async def list_assessments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    service = RiskAssessService(session)
    items, total = await service.get_list((page - 1) * page_size, page_size)
    return Response.ok({
        "items": [{"id": str(a.id), "name": a.name, "description": a.description,
                   "department": a.department} for a in items],
        "total": total,
    })


@router.get("/assessments/{assessment_id}", summary="量表详情（含题目）")
async def get_assessment(assessment_id: UUID, session: AsyncSession = Depends(get_db)):
    service = RiskAssessService(session)
    obj = await service.get_assessment(assessment_id)
    return Response.ok({
        "id": str(obj.id),
        "name": obj.name,
        "description": obj.description,
        "questions": obj.questions,
        "scoring_rules": obj.scoring_rules,
    })


@router.post("/assessments/{assessment_id}/score", summary="量表评分计算")
async def calculate_score(
    assessment_id: UUID,
    answers: Dict[str, Any],
    patient_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db),
):
    service = RiskAssessService(session)
    patient_context = None
    if patient_id:
        ctx_service = PatientContextService()
        patient_context = await ctx_service.get_context(patient_id)

    result = await service.calculate_score(assessment_id, answers, patient_context)
    return Response.ok({
        "total_score": result.total_score,
        "level": result.level,
        "interpretation": result.interpretation,
        "recommendation": result.recommendation,
    })
