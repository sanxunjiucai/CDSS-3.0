"""
PACS 影像系统适配器
MockPACSAdapter: 返回模拟影像报告
RealPACSAdapter: 调用真实 PACS 接口（待实现）
"""
from typing import Optional
from services.adapters.base_adapter import BasePACSAdapter


MOCK_REPORTS = {
    "P001": {
        "patient_id": "P001",
        "report_id":  "IMG001",
        "modality":   "CT",
        "body_part":  "胸部",
        "finding":    "双肺纹理增重，右下肺可见片状密度增高影，考虑肺炎",
        "conclusion": "右下肺炎症",
        "report_date": "2024-01-15",
    },
    "P002": {
        "patient_id": "P002",
        "report_id":  "IMG002",
        "modality":   "超声",
        "body_part":  "腹部",
        "finding":    "肝脏大小形态正常，回声均匀。胆囊壁稍厚。",
        "conclusion": "慢性胆囊炎可能",
        "report_date": "2024-01-14",
    },
}


class MockPACSAdapter(BasePACSAdapter):
    """Mock PACS 适配器：返回模拟影像报告"""

    async def get_report(self, patient_id: str) -> Optional[dict]:
        return MOCK_REPORTS.get(patient_id)


class RealPACSAdapter(BasePACSAdapter):
    """真实 PACS 对接实现（预留，PACS_MODE=real 时启用）"""

    def __init__(self, api_url: str, api_key: str = ""):
        self.api_url = api_url
        self.api_key = api_key

    async def get_report(self, patient_id: str) -> Optional[dict]:
        raise NotImplementedError("真实 PACS 对接待实现")
