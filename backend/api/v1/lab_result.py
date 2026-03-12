from typing import List, Optional
from fastapi import APIRouter, Query
from schemas.patient import LabResultItem
from schemas.common import Response
from services.lab_result_service import LabResultService
from services.patient_context_service import PatientContextService
from services.adapters import get_lis_adapter

router = APIRouter()


@router.post("/lab-result/interpret", summary="检验结果解读")
async def interpret_lab_results(
    lab_results: List[LabResultItem],
    patient_id: Optional[str] = Query(None),
):
    service = LabResultService()
    patient_context = None
    if patient_id:
        ctx_service = PatientContextService()
        patient_context = await ctx_service.get_context(patient_id)

    interpretations = await service.interpret(lab_results, patient_context)
    return Response.ok([
        {
            "item_name": i.item_name,
            "value": i.value,
            "unit": i.unit,
            "is_abnormal": i.is_abnormal,
            "abnormal_type": i.abnormal_type,
            "clinical_meaning": i.clinical_meaning,
            "suggestion": i.suggestion,
        }
        for i in interpretations
    ])


@router.get("/lab-result/from-lis/{patient_id}", summary="从LIS获取检验结果并解读")
async def get_and_interpret_from_lis(patient_id: str):
    lis_adapter = get_lis_adapter()
    lab_results = await lis_adapter.get_lab_results(patient_id)

    service = LabResultService()
    ctx_service = PatientContextService()
    patient_context = await ctx_service.get_context(patient_id)
    interpretations = await service.interpret(lab_results, patient_context)

    return Response.ok([
        {
            "item_name": i.item_name,
            "value": i.value,
            "unit": i.unit,
            "is_abnormal": i.is_abnormal,
            "abnormal_type": i.abnormal_type,
            "clinical_meaning": i.clinical_meaning,
            "suggestion": i.suggestion,
        }
        for i in interpretations
    ])
