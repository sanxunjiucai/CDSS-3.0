from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.common import Response
from services.treatment_service import TreatmentService
from services.patient_context_service import PatientContextService

router = APIRouter()


@router.get("/treatment/{disease_id}", summary="治疗方案推荐")
async def get_treatment(
    disease_id: UUID,
    patient_id: Optional[str] = Query(None, description="患者ID（提供则返回个性化建议）"),
    session: AsyncSession = Depends(get_db),
):
    service = TreatmentService(session)
    patient_context = None
    if patient_id:
        ctx_service = PatientContextService()
        patient_context = await ctx_service.get_context(patient_id)

    result = await service.get_treatment(disease_id, patient_context)
    return Response.ok({
        "disease_id": result.disease_id,
        "disease_name": result.disease_name,
        "treatment_text": result.treatment_text,
        "personalized_notes": result.personalized_notes,
    })
