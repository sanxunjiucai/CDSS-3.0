from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.common import Response
from services.diagnosis_service import DiagnosisService

router = APIRouter()


@router.get("/diagnosis/suggest", summary="辅助诊断（症状→推荐诊断）")
async def suggest_diagnoses(
    symptoms: List[str] = Query(..., description="症状列表，如 发热,咳嗽"),
    top_k: int = Query(5, ge=1, le=20),
    session: AsyncSession = Depends(get_db),
):
    service = DiagnosisService(session)
    results = await service.suggest_diagnoses(symptoms, top_k)
    return Response.ok([
        {
            "disease_id": r.disease_id,
            "name": r.name,
            "icd_code": r.icd_code,
            "match_score": round(r.match_score, 2),
            "matched_symptoms": r.matched_symptoms,
        }
        for r in results
    ])
