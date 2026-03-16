from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.common import Response
from services.assessment_service import AssessmentService
from core.pagination import PaginationParams

router = APIRouter()


def _fmt_list(a):
    return {
        "id":          str(a.id),
        "name":        a.name,
        "description": a.description,
        "department":  a.department,
        "category":    getattr(a, "category", None),
        "question_count": len(a.questions or []),
    }


def _fmt_detail(a):
    return {
        "id":             str(a.id),
        "name":           a.name,
        "description":    a.description,
        "department":     a.department,
        "questions":      a.questions or [],
        "scoring_rules":  a.scoring_rules or [],
    }


@router.get("/assessments", summary="量表列表")
async def list_assessments(
    page:       int           = Query(1, ge=1),
    page_size:  int           = Query(20, ge=1, le=100),
    q:          Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    session:    AsyncSession  = Depends(get_db),
):
    svc = AssessmentService(session)
    params = PaginationParams(page=page, page_size=page_size)
    items, total = await svc.get_list(params, q=q, department=department)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return Response.ok({
        "items":       [_fmt_list(a) for a in items],
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": total_pages,
    })


@router.get("/assessments/{assessment_id}", summary="量表详情")
async def get_assessment(assessment_id: UUID, session: AsyncSession = Depends(get_db)):
    svc = AssessmentService(session)
    a = await svc.get_detail(assessment_id)
    return Response.ok(_fmt_detail(a))


@router.post("/assessments/{assessment_id}/score", summary="量表评分")
async def score_assessment(
    assessment_id: UUID,
    answers: dict,
    session: AsyncSession = Depends(get_db),
):
    svc = AssessmentService(session)
    result = await svc.score(assessment_id, answers)
    return Response.ok(result)
