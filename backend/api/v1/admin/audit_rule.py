from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.pagination import PaginationParams
from db.database import get_db
from schemas.common import Response
from services.audit_rule_service import AuditRuleService, validate_condition

router = APIRouter()
_ALLOWED_LEVELS = {"error", "warning", "info"}
_ALLOWED_SCENARIOS = {"diagnosis_consistency"}


class AuditRuleCreateRequest(BaseModel):
    name: str
    scenario: str = "diagnosis_consistency"
    level: str = "warning"
    code: str = "CUSTOM_RULE"
    message: str
    suggestion: Optional[str] = None
    rule_type: Optional[str] = None
    trigger_scene: Optional[str] = None
    condition: dict = Field(default_factory=dict)
    enabled: bool = True
    is_published: bool = False
    version: int = 1


class AuditRuleUpdateRequest(BaseModel):
    name: Optional[str] = None
    scenario: Optional[str] = None
    level: Optional[str] = None
    code: Optional[str] = None
    message: Optional[str] = None
    suggestion: Optional[str] = None
    rule_type: Optional[str] = None
    trigger_scene: Optional[str] = None
    condition: Optional[dict] = None
    enabled: Optional[bool] = None
    is_published: Optional[bool] = None
    version: Optional[int] = None


class ToggleEnabledRequest(BaseModel):
    enabled: bool


def _normalize_payload(data: dict):
    payload = dict(data)
    scenario = str(payload.get("scenario") or "").strip()
    if scenario and scenario not in _ALLOWED_SCENARIOS:
        raise HTTPException(status_code=422, detail=f"不支持的场景：{scenario}")
    level = str(payload.get("level") or "").strip()
    if level and level not in _ALLOWED_LEVELS:
        raise HTTPException(status_code=422, detail=f"不支持的级别：{level}")
    if "condition" in payload:
        validate_condition(payload.get("condition"))
    if payload.get("name") is not None:
        payload["name"] = str(payload["name"]).strip()
    if payload.get("code") is not None:
        payload["code"] = str(payload["code"]).strip()
    if payload.get("message") is not None:
        payload["message"] = str(payload["message"]).strip()
    if payload.get("suggestion") is not None:
        payload["suggestion"] = str(payload["suggestion"]).strip() or None
    return payload


def _serialize(rule):
    return {
        "id": str(rule.id),
        "name": rule.name,
        "scenario": rule.scenario,
        "level": rule.level,
        "code": rule.code,
        "message": rule.message,
        "suggestion": rule.suggestion,
        "rule_type": rule.rule_type,
        "trigger_scene": rule.trigger_scene,
        "condition": rule.condition or {},
        "enabled": rule.enabled,
        "is_published": rule.is_published,
        "version": rule.version,
        "created_at": rule.created_at.isoformat() if rule.created_at else None,
        "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
    }


@router.get("/audit-rules", summary="规则列表")
async def list_audit_rules(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None),
    scenario: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db),
):
    params = PaginationParams(page=page, page_size=page_size)
    service = AuditRuleService(session)
    items, total = await service.get_list(params=params, q=q or None, scenario=scenario or None)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return Response.ok({
        "items": [_serialize(i) for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    })


@router.get("/audit-rules/{rule_id}", summary="规则详情")
async def get_audit_rule(rule_id: UUID, session: AsyncSession = Depends(get_db)):
    service = AuditRuleService(session)
    obj = await service.get_detail(rule_id)
    return Response.ok(_serialize(obj))


@router.post("/audit-rules", summary="新增规则")
async def create_audit_rule(data: AuditRuleCreateRequest, session: AsyncSession = Depends(get_db)):
    service = AuditRuleService(session)
    payload = _normalize_payload(data.model_dump())
    obj = await service.create(payload)
    return Response.ok(_serialize(obj))


@router.put("/audit-rules/{rule_id}", summary="更新规则")
async def update_audit_rule(rule_id: UUID, data: AuditRuleUpdateRequest, session: AsyncSession = Depends(get_db)):
    service = AuditRuleService(session)
    payload = _normalize_payload(data.model_dump(exclude_unset=True))
    obj = await service.update(rule_id, payload)
    return Response.ok(_serialize(obj))


@router.delete("/audit-rules/{rule_id}", summary="删除规则")
async def delete_audit_rule(rule_id: UUID, session: AsyncSession = Depends(get_db)):
    service = AuditRuleService(session)
    await service.delete(rule_id)
    return Response.ok(None, "删除成功")


@router.post("/audit-rules/{rule_id}/publish", summary="发布规则")
async def publish_audit_rule(rule_id: UUID, session: AsyncSession = Depends(get_db)):
    service = AuditRuleService(session)
    obj = await service.publish(rule_id)
    return Response.ok(_serialize(obj), "规则已发布")


@router.post("/audit-rules/{rule_id}/toggle-enabled", summary="启停规则")
async def toggle_audit_rule_enabled(
    rule_id: UUID,
    data: ToggleEnabledRequest,
    session: AsyncSession = Depends(get_db),
):
    service = AuditRuleService(session)
    obj = await service.toggle_enabled(rule_id, data.enabled)
    return Response.ok(_serialize(obj), "状态已更新")
