from typing import List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel
from schemas.common import Response
from services.audit_service import AuditService
from services.patient_context_service import PatientContextService

router = APIRouter()


# ── 请求体 Schema ──────────────────────────────────────────────────────────────

class DrugOrderRequest(BaseModel):
    drug_name: str
    drug_id: Optional[str] = None
    patient_id: Optional[str] = None


class ExamOrderRequest(BaseModel):
    exam_name: str
    patient_id: Optional[str] = None


class DiagnosisConsistencyRequest(BaseModel):
    """诊断合理性审核请求体"""
    patient_id: Optional[str] = None
    diagnoses: List[str] = []       # 当前诊断名称列表
    drug_names: List[str] = []      # 即将开具/已有用药列表
    exam_names: List[str] = []      # 即将开具检查列表


# ── 工具函数 ───────────────────────────────────────────────────────────────────

async def _get_patient_context(patient_id: Optional[str]):
    if not patient_id:
        return None
    ctx_service = PatientContextService()
    return await ctx_service.get_context(patient_id)


def _serialize_warnings(warnings):
    return [
        {
            "rule_id":    w.rule_id,
            "level":      w.level,
            "code":       w.code,
            "message":    w.message,
            "suggestion": w.suggestion,
        }
        for w in warnings
    ]


# ── 接口 ───────────────────────────────────────────────────────────────────────

@router.post("/audit/drug", summary="药物开单审核（过敏/禁忌检查）")
async def audit_drug_order(body: DrugOrderRequest):
    service = AuditService()
    patient_context = await _get_patient_context(body.patient_id)
    warnings = await service.check_drug_order(body.drug_name, body.drug_id, patient_context)
    return Response.ok({
        "passed":   len(warnings) == 0,
        "warnings": _serialize_warnings(warnings),
    })


@router.post("/audit/exam", summary="检验开单审核")
async def audit_exam_order(body: ExamOrderRequest):
    service = AuditService()
    patient_context = await _get_patient_context(body.patient_id)
    warnings = await service.check_exam_order(body.exam_name, patient_context)
    return Response.ok({
        "passed":   len(warnings) == 0,
        "warnings": _serialize_warnings(warnings),
    })


@router.post("/audit/diagnosis-consistency", summary="诊断合理性审核")
async def audit_diagnosis_consistency(body: DiagnosisConsistencyRequest):
    """
    诊断与处置一致性校验。

    传入当前诊断、即将开具的药物和检查，返回规则引擎发现的问题列表。
    - passed=true  表示未发现任何问题，可直接继续开单。
    - passed=false 时，warnings 中至少有一条 error/warning/info 级别的问题。
    - 前端应要求医生逐条确认 error 级问题后方可继续。
    """
    service = AuditService()
    patient_context = await _get_patient_context(body.patient_id)
    warnings = await service.check_diagnosis_consistency(
        body.diagnoses,
        body.drug_names,
        body.exam_names,
        patient_context,
    )
    return Response.ok({
        "passed":        len(warnings) == 0,
        "error_count":   sum(1 for w in warnings if w.level == "error"),
        "warning_count": sum(1 for w in warnings if w.level == "warning"),
        "info_count":    sum(1 for w in warnings if w.level == "info"),
        "warnings":      _serialize_warnings(warnings),
    })
