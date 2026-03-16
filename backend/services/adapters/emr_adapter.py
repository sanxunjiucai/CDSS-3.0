"""
EMR 电子病历系统适配器
MockEMRAdapter: 返回模拟病历数据
RealEMRAdapter: 调用真实 EMR 接口（待实现）
"""
from typing import Optional
from services.adapters.base_adapter import BaseEMRAdapter


MOCK_MEDICAL_HISTORY = {
    "P001": {
        "patient_id":      "P001",
        "past_history":    "高血压病史10年，长期服用氨氯地平控制血压",
        "family_history":  "父亲有高血压病史",
        "allergy_history": "青霉素过敏",
        "chief_complaint": "发热、咳嗽3天",
        "present_illness": "患者3天前受凉后出现发热，体温最高38.9℃，伴咳嗽、咳黄痰",
        "physical_exam":   "体温38.5℃，右下肺呼吸音减低，可闻及湿啰音",
    },
    "P002": {
        "patient_id":      "P002",
        "past_history":    "无特殊既往史",
        "family_history":  "无特殊家族史",
        "allergy_history": "无",
        "chief_complaint": "上腹痛2天",
        "present_illness": "患者2天前进食后出现上腹部胀痛，伴反酸、嗳气",
        "physical_exam":   "上腹部轻压痛，无反跳痛",
    },
}


class MockEMRAdapter(BaseEMRAdapter):
    """Mock EMR 适配器：返回模拟病历数据"""

    async def get_medical_history(self, patient_id: str) -> Optional[dict]:
        return MOCK_MEDICAL_HISTORY.get(patient_id)

    async def get_chief_complaint(self, patient_id: str) -> Optional[str]:
        record = MOCK_MEDICAL_HISTORY.get(patient_id)
        return record["chief_complaint"] if record else None


class RealEMRAdapter(BaseEMRAdapter):
    """真实 EMR 对接实现（预留，EMR_MODE=real 时启用）"""

    def __init__(self, api_url: str, api_key: str = ""):
        self.api_url = api_url
        self.api_key = api_key

    async def get_medical_history(self, patient_id: str) -> Optional[dict]:
        raise NotImplementedError("真实 EMR 对接待实现")

    async def get_chief_complaint(self, patient_id: str) -> Optional[str]:
        raise NotImplementedError("真实 EMR 对接待实现")
