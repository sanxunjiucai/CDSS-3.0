"""公共统计接口（首页使用）"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models.disease import Disease
from db.models.drug import Drug
from db.models.exam import Exam
from db.models.guideline import Guideline
from db.models.formula import Formula
from db.models.assessment import Assessment
from schemas.common import Response
from services.literature_service import LiteratureService

router = APIRouter()


@router.get("/stats", summary="知识库统计概览")
async def stats_overview(session: AsyncSession = Depends(get_db)):
    async def count(model, **filters):
        stmt = select(func.count()).select_from(model)
        result = await session.execute(stmt)
        return result.scalar() or 0

    disease_count    = await count(Disease)
    drug_count       = await count(Drug)
    exam_count       = await count(Exam)
    guideline_count  = await count(Guideline)
    formula_count    = await count(Formula)
    assessment_count = await count(Assessment)
    literature_service = LiteratureService()
    literature_count = literature_service.count("literature")
    case_count = literature_service.count("case")

    return Response.ok({
        "disease":    disease_count,
        "drug":       drug_count,
        "exam":       exam_count,
        "guideline":  guideline_count,
        "formula":    formula_count,
        "assessment": assessment_count,
        "literature": literature_count,
        "case": case_count,
    })
