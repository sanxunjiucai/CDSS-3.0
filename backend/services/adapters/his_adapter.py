"""
HIS 适配器
MockHISAdapter: 返回固定的模拟患者数据
RealHISAdapter: 调用真实 HIS 接口（待实现）
"""
from typing import List, Optional

import httpx

from services.adapters.base_adapter import BaseHISAdapter
from schemas.patient import PatientContext, LabResultItem, Gender

# ── Mock 数据 ─────────────────────────────────────────
MOCK_PATIENTS = {
    "P001": PatientContext(
        patient_id="P001",
        name="张三",
        gender=Gender.male,
        age=58,
        diagnoses=["J18.9", "I10"],
        diagnosis_names=["肺炎", "高血压"],
        allergies=["青霉素"],
        chief_complaint="发热、咳嗽3天",
        current_medications=["氨氯地平片"],
        lab_results=[
            LabResultItem(item_name="白细胞计数", item_code="WBC", value=12.5,
                          unit="×10⁹/L", reference_low=4.0, reference_high=10.0,
                          is_abnormal=True, abnormal_type="high"),
            LabResultItem(item_name="血红蛋白", item_code="HGB", value=115.0,
                          unit="g/L", reference_low=120.0, reference_high=160.0,
                          is_abnormal=True, abnormal_type="low"),
        ],
    ),
    "P002": PatientContext(
        patient_id="P002",
        name="李四",
        gender=Gender.female,
        age=32,
        diagnoses=["K29.7"],
        diagnosis_names=["胃炎"],
        allergies=[],
        chief_complaint="上腹痛2天",
        current_medications=[],
        lab_results=[],
    ),
}


class MockHISAdapter(BaseHISAdapter):
    async def get_patient_info(self, patient_id: str) -> Optional[PatientContext]:
        return MOCK_PATIENTS.get(patient_id)

    async def get_current_diagnosis(self, patient_id: str) -> List[str]:
        patient = MOCK_PATIENTS.get(patient_id)
        return patient.diagnoses if patient else []

    async def get_prescriptions(self, patient_id: str) -> List[dict]:
        patient = MOCK_PATIENTS.get(patient_id)
        return [{"name": m} for m in patient.current_medications] if patient else []


class RealHISAdapter(BaseHISAdapter):
    """真实 HIS 对接实现（预留，HIS_MODE=real 时启用）"""

    def __init__(self, api_url: str, api_key: str = ""):
        self.api_url = api_url
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            base_url=api_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10.0,
        )

    async def get_patient_info(self, patient_id: str) -> Optional[PatientContext]:
        # TODO: 实现真实 HIS 接口调用
        # resp = await self.client.get(f"/patients/{patient_id}")
        # resp.raise_for_status()
        # return PatientContext(**resp.json())
        raise NotImplementedError("真实 HIS 对接待实现")

    async def get_current_diagnosis(self, patient_id: str) -> List[str]:
        raise NotImplementedError("真实 HIS 对接待实现")

    async def get_prescriptions(self, patient_id: str) -> List[dict]:
        raise NotImplementedError("真实 HIS 对接待实现")
