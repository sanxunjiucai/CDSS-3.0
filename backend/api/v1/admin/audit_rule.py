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
_LEVEL_ALIASES = {
    "danger": "error",
    "block": "error",
}
_ALLOWED_SCENARIOS = {"diagnosis_consistency", "medication_safety", "exam_appropriateness"}


class AuditRuleCreateRequest(BaseModel):
    name: str
    scenario: str = "diagnosis_consistency"
    level: str = "warning"
    code: str = "CUSTOM_RULE"
    message: str
    suggestion: Optional[str] = None
    rule_type: Optional[str] = None
    trigger_scene: Optional[str] = None
    category: Optional[str] = None
    module_name: Optional[str] = None
    clinical_scene: Optional[str] = None
    trigger_timing: Optional[str] = None
    action_type: Optional[str] = None
    writeback_target: Optional[str] = None
    source_type: Optional[str] = None
    source_name: Optional[str] = None
    maintainer: Optional[str] = None
    priority_level: int = 0
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
    category: Optional[str] = None
    module_name: Optional[str] = None
    clinical_scene: Optional[str] = None
    trigger_timing: Optional[str] = None
    action_type: Optional[str] = None
    writeback_target: Optional[str] = None
    source_type: Optional[str] = None
    source_name: Optional[str] = None
    maintainer: Optional[str] = None
    priority_level: Optional[int] = None
    condition: Optional[dict] = None
    enabled: Optional[bool] = None
    is_published: Optional[bool] = None
    version: Optional[int] = None


class ToggleEnabledRequest(BaseModel):
    enabled: bool


class AuditRuleTestRequest(BaseModel):
    condition: dict = Field(default_factory=dict)
    diagnoses: list[str] = Field(default_factory=list)
    drug_names: list[str] = Field(default_factory=list)
    exam_names: list[str] = Field(default_factory=list)
    patient_allergies: list[str] = Field(default_factory=list)
    patient_gender: Optional[str] = None
    patient_age: Optional[int] = None
    lab_results: list[dict] = Field(default_factory=list)


def _match_keyword_list(source_values: list, keywords: list, mode: str) -> bool:
    source = [str(v).lower() for v in (source_values or []) if v is not None]
    targets = [str(v).lower() for v in (keywords or []) if v is not None]
    if mode == "contains_all":
        return all(any(t in s for s in source) for t in targets)
    if mode == "not_contains_any":
        return not any(any(t in s for s in source) for t in targets)
    return any(any(t in s for s in source) for t in targets)


def _get_field_values(field: str, payload: AuditRuleTestRequest):
    if field == "diagnoses":
        return payload.diagnoses
    if field == "drug_names":
        return payload.drug_names
    if field == "exam_names":
        return payload.exam_names
    if field == "patient_allergies":
        return payload.patient_allergies
    if field == "lab_item_names":
        return [str(i.get("item_name") or "") for i in payload.lab_results]
    if field == "lab_item_codes":
        return [str(i.get("item_code") or "") for i in payload.lab_results]
    if field == "patient_gender":
        return payload.patient_gender
    if field == "patient_age":
        return payload.patient_age
    return []


def _match_condition_item(item: dict, payload: AuditRuleTestRequest) -> bool:
    if not isinstance(item, dict):
        return False
    op = str(item.get("op") or "").strip().lower()
    field = str(item.get("field") or "").strip()
    if op in {"contains_any", "contains_all", "not_contains_any"}:
        values = _get_field_values(field, payload)
        return _match_keyword_list(values, item.get("values") or [], op)
    if op == "equals":
        value = _get_field_values(field, payload)
        if isinstance(value, list):
            return str(item.get("value")) in [str(v) for v in value]
        return str(value) == str(item.get("value"))
    if op == "in":
        value = _get_field_values(field, payload)
        candidates = [str(v) for v in (item.get("values") or [])]
        if isinstance(value, list):
            return any(str(v) in candidates for v in value)
        return str(value) in candidates
    if op in {"lab_ratio_ge", "lab_value_ge", "lab_value_le", "lab_is_abnormal"}:
        item_code = str(item.get("item_code") or "").upper()
        lab = next(
            (
                i
                for i in payload.lab_results
                if str(i.get("item_code") or "").upper() == item_code
            ),
            None,
        )
        if not lab:
            return False
        if op == "lab_is_abnormal":
            return bool(lab.get("is_abnormal")) == bool(item.get("value", True))
        try:
            threshold = float(item.get("value", 0))
            lab_value = float(lab.get("value", 0))
        except Exception:
            return False
        if op == "lab_ratio_ge":
            try:
                reference_high = float(lab.get("reference_high", 0))
            except Exception:
                return False
            if reference_high <= 0:
                return False
            return (lab_value / reference_high) >= threshold
        if op == "lab_value_ge":
            return lab_value >= threshold
        if op == "lab_value_le":
            return lab_value <= threshold
    return False


def _evaluate_condition(condition: dict, payload: AuditRuleTestRequest):
    all_items = condition.get("all") or []
    any_items = condition.get("any") or []
    not_items = condition.get("not") or []

    all_results = [
        {"item": i, "matched": _match_condition_item(i, payload)} for i in all_items
    ]
    any_results = [
        {"item": i, "matched": _match_condition_item(i, payload)} for i in any_items
    ]
    not_results = [
        {"item": i, "matched": _match_condition_item(i, payload)} for i in not_items
    ]

    all_passed = all(i["matched"] for i in all_results) if all_results else True
    any_passed = any(i["matched"] for i in any_results) if any_results else True
    not_passed = (
        all(not i["matched"] for i in not_results) if not_results else True
    )
    return {
        "matched": all_passed and any_passed and not_passed,
        "all": all_results,
        "any": any_results,
        "not": not_results,
    }


def _normalize_payload(data: dict):
    payload = dict(data)
    scenario = str(payload.get("scenario") or "").strip()
    if scenario and scenario not in _ALLOWED_SCENARIOS:
        raise HTTPException(status_code=422, detail=f"不支持的场景：{scenario}")
    level = str(payload.get("level") or "").strip()
    if level in _LEVEL_ALIASES:
        level = _LEVEL_ALIASES[level]
        payload["level"] = level
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
    for key in (
        "rule_type",
        "trigger_scene",
        "category",
        "module_name",
        "clinical_scene",
        "trigger_timing",
        "action_type",
        "writeback_target",
        "source_type",
        "source_name",
        "maintainer",
    ):
        if payload.get(key) is not None:
            payload[key] = str(payload[key]).strip() or None
    if payload.get("priority_level") is not None:
        try:
            payload["priority_level"] = int(payload["priority_level"])
        except Exception:
            raise HTTPException(status_code=422, detail="priority_level 必须是整数")
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
        "category": rule.category,
        "module_name": rule.module_name,
        "clinical_scene": rule.clinical_scene,
        "trigger_timing": rule.trigger_timing,
        "action_type": rule.action_type,
        "writeback_target": rule.writeback_target,
        "source_type": rule.source_type,
        "source_name": rule.source_name,
        "maintainer": rule.maintainer,
        "priority_level": rule.priority_level,
        "condition": rule.condition or {},
        "enabled": rule.enabled,
        "is_published": rule.is_published,
        "version": rule.version,
        "created_at": rule.created_at.isoformat() if rule.created_at else None,
        "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
    }


@router.get("/audit-rules", summary="规则列表")
@router.get("/audit-rule", summary="规则列表")
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


@router.post("/audit-rules/test", summary="模拟测试规则命中")
@router.post("/audit-rule/test", summary="模拟测试规则命中")
async def test_audit_rule_condition(data: AuditRuleTestRequest):
    validate_condition(data.condition or {})
    evaluation = _evaluate_condition(data.condition or {}, data)
    return Response.ok(evaluation)


@router.get("/audit-rules/{rule_id}", summary="规则详情")
@router.get("/audit-rule/{rule_id}", summary="规则详情")
async def get_audit_rule(rule_id: UUID, session: AsyncSession = Depends(get_db)):
    service = AuditRuleService(session)
    obj = await service.get_detail(rule_id)
    return Response.ok(_serialize(obj))


@router.post("/audit-rules", summary="新增规则")
@router.post("/audit-rule", summary="新增规则")
async def create_audit_rule(data: AuditRuleCreateRequest, session: AsyncSession = Depends(get_db)):
    service = AuditRuleService(session)
    payload = _normalize_payload(data.model_dump())
    obj = await service.create(payload)
    return Response.ok(_serialize(obj))


@router.put("/audit-rules/{rule_id}", summary="更新规则")
@router.put("/audit-rule/{rule_id}", summary="更新规则")
async def update_audit_rule(rule_id: UUID, data: AuditRuleUpdateRequest, session: AsyncSession = Depends(get_db)):
    service = AuditRuleService(session)
    payload = _normalize_payload(data.model_dump(exclude_unset=True))
    obj = await service.update(rule_id, payload)
    return Response.ok(_serialize(obj))


@router.delete("/audit-rules/{rule_id}", summary="删除规则")
@router.delete("/audit-rule/{rule_id}", summary="删除规则")
async def delete_audit_rule(rule_id: UUID, session: AsyncSession = Depends(get_db)):
    service = AuditRuleService(session)
    await service.delete(rule_id)
    return Response.ok(None, "删除成功")


@router.post("/audit-rules/{rule_id}/publish", summary="发布规则")
@router.post("/audit-rule/{rule_id}/publish", summary="发布规则")
async def publish_audit_rule(rule_id: UUID, session: AsyncSession = Depends(get_db)):
    service = AuditRuleService(session)
    obj = await service.publish(rule_id)
    return Response.ok(_serialize(obj), "规则已发布")


@router.post("/audit-rules/{rule_id}/toggle-enabled", summary="启停规则")
@router.post("/audit-rule/{rule_id}/toggle-enabled", summary="启停规则")
async def toggle_audit_rule_enabled(
    rule_id: UUID,
    data: ToggleEnabledRequest,
    session: AsyncSession = Depends(get_db),
):
    service = AuditRuleService(session)
    obj = await service.toggle_enabled(rule_id, data.enabled)
    return Response.ok(_serialize(obj), "状态已更新")
