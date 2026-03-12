from fastapi import APIRouter, HTTPException
from schemas.patient import PatientContextSet, PatientContext
from schemas.common import Response
from services.patient_context_service import PatientContextService

router = APIRouter()


@router.post("/patient/context", response_model=Response[PatientContext], summary="设置患者上下文（HIS推送）")
async def set_patient_context(data: PatientContextSet):
    service = PatientContextService()
    context = await service.set_context(data)
    return Response.ok(context)


@router.get("/patient/context/{patient_id}", response_model=Response[PatientContext], summary="获取患者上下文")
async def get_patient_context(patient_id: str):
    service = PatientContextService()
    context = await service.get_context(patient_id)
    if not context:
        raise HTTPException(status_code=404, detail="患者上下文不存在或已过期")
    return Response.ok(context)


@router.delete("/patient/context/{patient_id}", summary="清除患者上下文")
async def clear_patient_context(patient_id: str):
    service = PatientContextService()
    await service.clear_context(patient_id)
    return Response.ok(None, "已清除")
