"""
患者上下文服务
患者数据不落库，只存 Redis（TTL 30分钟）
"""
import json
from typing import Optional

import redis.asyncio as aioredis

from config import settings
from schemas.patient import PatientContext, PatientContextSet
from services.adapters import get_his_adapter

_redis: Optional[aioredis.Redis] = None

CONTEXT_TTL = 1800  # 30分钟


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _context_key(patient_id: str) -> str:
    return f"patient_context:{patient_id}"


class PatientContextService:
    def __init__(self):
        self.redis = get_redis()
        self.his_adapter = get_his_adapter()

    async def set_context(self, data: PatientContextSet) -> PatientContext:
        """接收来自 HIS 的患者上下文，补全后缓存"""
        # 尝试从 HIS 适配器补全信息
        try:
            his_info = await self.his_adapter.get_patient_info(data.patient_id)
        except Exception:
            his_info = None

        context = PatientContext(
            patient_id=data.patient_id,
            name=data.name or (his_info.name if his_info else "未知"),
            gender=data.gender or (his_info.gender if his_info else None),
            age=data.age or (his_info.age if his_info else 0),
            diagnoses=data.diagnoses or (his_info.diagnoses if his_info else []),
            diagnosis_names=his_info.diagnosis_names if his_info else [],
            allergies=data.allergies or (his_info.allergies if his_info else []),
            chief_complaint=data.chief_complaint or (his_info.chief_complaint if his_info else None),
            lab_results=his_info.lab_results if his_info else [],
            current_medications=his_info.current_medications if his_info else [],
        )

        await self.redis.setex(
            _context_key(data.patient_id),
            CONTEXT_TTL,
            context.model_dump_json(),
        )
        return context

    async def get_context(self, patient_id: str) -> Optional[PatientContext]:
        raw = await self.redis.get(_context_key(patient_id))
        if raw:
            return PatientContext.model_validate_json(raw)
        return None

    async def clear_context(self, patient_id: str) -> None:
        await self.redis.delete(_context_key(patient_id))
