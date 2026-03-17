from copy import deepcopy
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.system_config import SystemConfig


DEFAULT_PC_NAV = [
    {"key": "home", "label": "工作台", "path": "/", "icon": "home", "exact": True, "enabled": True},
    {"key": "diseases", "label": "疾病库", "path": "/diseases", "icon": "activity", "enabled": True},
    {"key": "drugs", "label": "药品库", "path": "/drugs", "icon": "pill", "enabled": True},
    {"key": "exams", "label": "检验检查", "path": "/exams", "icon": "flask", "enabled": True},
    {"key": "guidelines", "label": "临床指南", "path": "/guidelines", "icon": "book", "enabled": True},
    {"key": "treatments", "label": "治疗方案", "path": "/treatments", "icon": "stethoscope", "enabled": True},
    {"key": "formulas", "label": "医学公式", "path": "/formulas", "icon": "calculator", "enabled": True},
    {"key": "assessments", "label": "评估量表", "path": "/assessments", "icon": "clipboard", "enabled": True},
]

DEFAULT_DEPARTMENTS = [
    {"id": "d1", "name": "内科", "color": "blue", "scope": ["疾病", "药品", "指南", "文献"]},
    {"id": "d2", "name": "外科", "color": "green", "scope": ["疾病", "药品", "指南"]},
    {"id": "d3", "name": "妇产科", "color": "pink", "scope": ["疾病", "药品", "指南", "文献"]},
    {"id": "d4", "name": "儿科", "color": "yellow", "scope": ["疾病", "药品", "指南", "文献"]},
    {"id": "d5", "name": "神经科", "color": "purple", "scope": ["疾病", "药品", "指南"]},
    {"id": "d6", "name": "心血管科", "color": "red", "scope": ["疾病", "药品", "指南", "文献"]},
    {"id": "d7", "name": "呼吸科", "color": "cyan", "scope": ["疾病", "药品", "指南", "文献"]},
    {"id": "d8", "name": "消化科", "color": "orange", "scope": ["疾病", "药品", "指南"]},
    {"id": "d9", "name": "内分泌科", "color": "teal", "scope": ["疾病", "药品", "指南", "文献"]},
    {"id": "d10", "name": "肿瘤科", "color": "red", "scope": ["疾病", "药品", "指南", "文献"]},
    {"id": "d11", "name": "感染科", "color": "green", "scope": ["疾病", "药品", "指南", "文献"]},
    {"id": "d12", "name": "肾内科", "color": "blue", "scope": ["疾病", "药品", "指南"]},
    {"id": "d13", "name": "风湿免疫科", "color": "purple", "scope": ["疾病", "药品", "指南"]},
    {"id": "d14", "name": "皮肤科", "color": "pink", "scope": ["疾病", "药品", "指南"]},
    {"id": "d15", "name": "急诊科", "color": "red", "scope": ["疾病", "指南", "文献"]},
    {"id": "d16", "name": "骨科", "color": "brown", "scope": ["疾病", "药品", "指南"]},
    {"id": "d17", "name": "眼科", "color": "cyan", "scope": ["疾病", "指南"]},
    {"id": "d18", "name": "精神科", "color": "purple", "scope": ["疾病", "药品", "指南"]},
    {"id": "d19", "name": "血液科", "color": "red", "scope": ["疾病", "药品", "指南", "文献"]},
    {"id": "d20", "name": "重症医学", "color": "orange", "scope": ["疾病", "指南", "文献"]},
    {"id": "d21", "name": "综合", "color": "gray", "scope": ["疾病", "药品", "检验", "指南", "文献"]},
]

DEFAULT_SEARCH_WEIGHTS = {
    "disease": {"enabled": True, "weight": 5, "label": "疾病知识库", "description": "疾病名称、ICD编码、症状、概述"},
    "drug": {"enabled": True, "weight": 4, "label": "药品库", "description": "药品名称、商品名、适应症"},
    "exam": {"enabled": True, "weight": 3, "label": "检验检查库", "description": "检验名称、代码、临床意义"},
    "guideline": {"enabled": True, "weight": 4, "label": "临床指南库", "description": "指南标题、机构、摘要"},
    "formula": {"enabled": True, "weight": 2, "label": "医学公式库", "description": "公式名称、描述"},
    "assessment": {"enabled": True, "weight": 2, "label": "评估量表库", "description": "量表名称、描述"},
    "literature": {"enabled": True, "weight": 2, "label": "动态文献库", "description": "文献标题、期刊、摘要"},
    "case": {"enabled": True, "weight": 2, "label": "案例文献库", "description": "病例标题、期刊、摘要"},
}


class SystemConfigService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _get_row(self, key: str) -> SystemConfig | None:
        result = await self.session.execute(
            select(SystemConfig).where(SystemConfig.key == key)
        )
        return result.scalar_one_or_none()

    async def get_value(self, key: str, default: Any):
        row = await self._get_row(key)
        if not row:
            return deepcopy(default)
        return row.value

    async def set_value(self, key: str, value: Any):
        row = await self._get_row(key)
        if row:
            row.value = value
        else:
            row = SystemConfig(key=key, value=value)
            self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)
        return row.value

    async def get_nav_config(self):
        nav = await self.get_value("pc_nav", DEFAULT_PC_NAV)
        departments = await self.get_value("departments", DEFAULT_DEPARTMENTS)
        return {
            "pc_nav": self.normalize_nav(nav),
            "departments": departments if isinstance(departments, list) else deepcopy(DEFAULT_DEPARTMENTS),
        }

    async def get_search_weights(self):
        raw = await self.get_value("search_weights", DEFAULT_SEARCH_WEIGHTS)
        return self.normalize_search_weights(raw)

    async def get_admin_config_bundle(self):
        nav_data = await self.get_nav_config()
        weights = await self.get_search_weights()
        return {
            **nav_data,
            "search_weights": weights,
        }

    async def update_admin_config_bundle(self, payload: dict[str, Any]):
        if "pc_nav" in payload:
            await self.set_value("pc_nav", self.normalize_nav(payload["pc_nav"]))
        if "departments" in payload:
            departments = payload["departments"] if isinstance(payload["departments"], list) else []
            await self.set_value("departments", departments)
        if "search_weights" in payload:
            await self.set_value("search_weights", self.normalize_search_weights(payload["search_weights"]))
        return await self.get_admin_config_bundle()

    @staticmethod
    def normalize_nav(raw: Any):
        defaults = deepcopy(DEFAULT_PC_NAV)
        if not isinstance(raw, list):
            return defaults
        normalized = []
        for i, item in enumerate(raw):
            if not isinstance(item, dict):
                continue
            path = str(item.get("path") or "").strip()
            label = str(item.get("label") or "").strip()
            if not path or not label:
                continue
            normalized.append({
                "key": str(item.get("key") or f"item_{i}"),
                "label": label,
                "path": path,
                "icon": str(item.get("icon") or "book").lower(),
                "exact": bool(item.get("exact", path == "/")),
                "enabled": bool(item.get("enabled", True)),
            })
        return normalized or defaults

    @staticmethod
    def normalize_search_weights(raw: Any):
        normalized = deepcopy(DEFAULT_SEARCH_WEIGHTS)
        if not isinstance(raw, dict):
            return normalized
        for key, default_item in DEFAULT_SEARCH_WEIGHTS.items():
            current = raw.get(key)
            if not isinstance(current, dict):
                continue
            weight = int(current.get("weight", default_item["weight"]))
            weight = max(1, min(10, weight))
            normalized[key] = {
                **default_item,
                "enabled": bool(current.get("enabled", default_item["enabled"])),
                "weight": weight,
            }
        return normalized
