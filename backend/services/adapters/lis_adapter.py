from typing import List, Optional
from services.adapters.base_adapter import BaseLISAdapter
from schemas.patient import LabResultItem


class MockLISAdapter(BaseLISAdapter):
    """Mock LIS 适配器：返回模拟检验结果"""

    async def get_lab_results(self, patient_id: str) -> List[LabResultItem]:
        # 返回通用 Mock 数据（正式场景从 his_adapter.py 中的患者上下文获取）
        return [
            LabResultItem(item_name="血糖", item_code="GLU", value=7.8,
                          unit="mmol/L", reference_low=3.9, reference_high=6.1,
                          is_abnormal=True, abnormal_type="high"),
        ]

    async def get_result_by_id(self, result_id: str) -> Optional[LabResultItem]:
        return None


class RealLISAdapter(BaseLISAdapter):
    """真实 LIS 对接实现（预留）"""

    def __init__(self, api_url: str, api_key: str = ""):
        self.api_url = api_url
        self.api_key = api_key

    async def get_lab_results(self, patient_id: str) -> List[LabResultItem]:
        raise NotImplementedError("真实 LIS 对接待实现")

    async def get_result_by_id(self, result_id: str) -> Optional[LabResultItem]:
        raise NotImplementedError("真实 LIS 对接待实现")
