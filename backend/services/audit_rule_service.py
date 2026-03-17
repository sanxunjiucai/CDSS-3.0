from typing import Optional
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select, func, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.pagination import PaginationParams
from db.models.audit_rule import AuditRule


_ALLOWED_OPS = {
    "contains_any", "contains_all", "not_contains_any",
    "equals", "in",
    "lab_ratio_ge", "lab_value_ge", "lab_value_le", "lab_is_abnormal",
}
_ALLOWED_FIELDS = {
    "diagnoses", "drug_names", "exam_names",
    "patient_allergies", "lab_item_names", "lab_item_codes",
    "patient_gender", "patient_age",
}


def _validate_condition_item(item: dict, idx: int, group: str):
    if not isinstance(item, dict):
        raise HTTPException(status_code=422, detail=f"condition.{group}[{idx}] 必须是对象")
    op = str(item.get("op") or "").strip()
    field = str(item.get("field") or "").strip()
    if not op:
        raise HTTPException(status_code=422, detail=f"condition.{group}[{idx}].op 不能为空")
    if op not in _ALLOWED_OPS:
        raise HTTPException(status_code=422, detail=f"condition.{group}[{idx}].op 不支持：{op}")
    if op in {"lab_ratio_ge", "lab_value_ge", "lab_value_le", "lab_is_abnormal"}:
        if not str(item.get("item_code") or "").strip():
            raise HTTPException(status_code=422, detail=f"condition.{group}[{idx}].item_code 不能为空")
        if "value" not in item:
            raise HTTPException(status_code=422, detail=f"condition.{group}[{idx}].value 不能为空")
        return
    if not field:
        raise HTTPException(status_code=422, detail=f"condition.{group}[{idx}].field 不能为空")
    if field not in _ALLOWED_FIELDS:
        raise HTTPException(status_code=422, detail=f"condition.{group}[{idx}].field 不支持：{field}")
    if op in {"contains_any", "contains_all", "not_contains_any", "in"} and not isinstance(item.get("values"), list):
        raise HTTPException(status_code=422, detail=f"condition.{group}[{idx}].values 必须是数组")
    if op == "equals" and "value" not in item:
        raise HTTPException(status_code=422, detail=f"condition.{group}[{idx}].value 不能为空")


def validate_condition(condition: dict):
    if not isinstance(condition, dict):
        raise HTTPException(status_code=422, detail="condition 必须是对象")
    for group in ("all", "any", "not"):
        items = condition.get(group, [])
        if not isinstance(items, list):
            raise HTTPException(status_code=422, detail=f"condition.{group} 必须是数组")
        for idx, item in enumerate(items):
            _validate_condition_item(item, idx, group)


class AuditRuleService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_list(
        self,
        params: PaginationParams,
        q: Optional[str] = None,
        scenario: Optional[str] = None,
    ):
        stmt = select(AuditRule)
        count_stmt = select(func.count()).select_from(AuditRule)

        if scenario:
            stmt = stmt.where(AuditRule.scenario == scenario)
            count_stmt = count_stmt.where(AuditRule.scenario == scenario)
        if q:
            pattern = f"%{q}%"
            cond = or_(
                AuditRule.name.ilike(pattern),
                AuditRule.code.ilike(pattern),
                AuditRule.message.ilike(pattern),
            )
            stmt = stmt.where(cond)
            count_stmt = count_stmt.where(cond)

        total = (await self.session.execute(count_stmt)).scalar() or 0
        stmt = stmt.order_by(AuditRule.updated_at.desc()).offset(params.offset).limit(params.page_size)
        items = (await self.session.execute(stmt)).scalars().all()
        return list(items), total

    async def get_detail(self, rule_id: UUID) -> AuditRule:
        obj = await self.session.get(AuditRule, rule_id)
        if not obj:
            raise HTTPException(status_code=404, detail="规则不存在")
        return obj

    async def create(self, data: dict) -> AuditRule:
        obj = AuditRule(**{k: v for k, v in data.items() if hasattr(AuditRule, k)})
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        if obj.is_published:
            await self.publish(obj.id)
            obj = await self.get_detail(obj.id)
        return obj

    async def update(self, rule_id: UUID, data: dict) -> AuditRule:
        obj = await self.get_detail(rule_id)
        for k, v in data.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        await self.session.commit()
        await self.session.refresh(obj)
        if obj.is_published:
            await self.publish(obj.id)
            obj = await self.get_detail(obj.id)
        return obj

    async def delete(self, rule_id: UUID) -> None:
        obj = await self.get_detail(rule_id)
        await self.session.delete(obj)
        await self.session.commit()

    async def publish(self, rule_id: UUID) -> AuditRule:
        obj = await self.get_detail(rule_id)
        validate_condition(obj.condition or {})
        await self.session.execute(
            update(AuditRule)
            .where(AuditRule.scenario == obj.scenario)
            .values(is_published=False)
        )
        obj.is_published = True
        obj.version = max(1, (obj.version or 1))
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def toggle_enabled(self, rule_id: UUID, enabled: bool) -> AuditRule:
        obj = await self.get_detail(rule_id)
        obj.enabled = enabled
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def get_runtime_rules(self, scenario: str) -> list[AuditRule]:
        stmt = (
            select(AuditRule)
            .where(
                AuditRule.scenario == scenario,
                AuditRule.is_published == True,
                AuditRule.enabled == True,
            )
            .order_by(AuditRule.updated_at.desc())
        )
        return list((await self.session.execute(stmt)).scalars().all())
