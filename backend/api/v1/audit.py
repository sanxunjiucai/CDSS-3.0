from typing import List, Optional
from fastapi import APIRouter, Query
from schemas.common import Response
from services.audit_service import AuditService
from services.patient_context_service import PatientContextService

router = APIRouter()


@router.post("/audit/drug", summary="药物开单审核（过敏/禁忌检查）")
async def audit_drug_order(
    drug_name: str,
    drug_id: Optional[str] = None,
    patient_id: Optional[str] = Query(None),
):
    service = AuditService()
    patient_context = None
    if patient_id:
        ctx_service = PatientContextService()
        patient_context = await ctx_service.get_context(patient_id)

    warnings = await service.check_drug_order(drug_name, drug_id, patient_context)
    return Response.ok({
        "passed": len(warnings) == 0,
        "warnings": [
            {"level": w.level, "code": w.code,
             "message": w.message, "suggestion": w.suggestion}
            for w in warnings
        ],
    })


@router.post("/audit/exam", summary="检验开单审核")
async def audit_exam_order(
    exam_name: str,
    patient_id: Optional[str] = Query(None),
):
    service = AuditService()
    patient_context = None
    if patient_id:
        ctx_service = PatientContextService()
        patient_context = await ctx_service.get_context(patient_id)

    warnings = await service.check_exam_order(exam_name, patient_context)
    return Response.ok({
        "passed": len(warnings) == 0,
        "warnings": [
            {"level": w.level, "code": w.code,
             "message": w.message, "suggestion": w.suggestion}
            for w in warnings
        ],
    })


@router.post("/audit/diagnosis-consistency", summary="诊断合理性审核")
async def audit_diagnosis_consistency(
    diagnoses: List[str],
    drug_names: List[str],
    patient_id: Optional[str] = Query(None),
):
    service = AuditService()
    patient_context = None
    if patient_id:
        ctx_service = PatientContextService()
        patient_context = await ctx_service.get_context(patient_id)

    warnings = await service.check_diagnosis_consistency(diagnoses, drug_names, patient_context)
    return Response.ok({
        "passed": len(warnings) == 0,
        "warnings": [
            {"level": w.level, "code": w.code,
             "message": w.message, "suggestion": w.suggestion}
            for w in warnings
        ],
    })
