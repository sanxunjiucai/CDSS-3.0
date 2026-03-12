"""
检验结果解读服务
比对参考范围，生成异常解读文本
"""
from typing import List, Optional
from schemas.patient import LabResultItem, PatientContext


class LabInterpretation:
    def __init__(self, item_name: str, value: float, unit: str,
                 is_abnormal: bool, abnormal_type: str,
                 clinical_meaning: str, suggestion: str):
        self.item_name = item_name
        self.value = value
        self.unit = unit
        self.is_abnormal = is_abnormal
        self.abnormal_type = abnormal_type    # "high" | "low" | "normal"
        self.clinical_meaning = clinical_meaning
        self.suggestion = suggestion


class LabResultService:
    async def interpret(
        self,
        lab_results: List[LabResultItem],
        patient_context: Optional[PatientContext] = None,
    ) -> List[LabInterpretation]:
        """
        解读检验结果
        MVP阶段：基于参考范围比对 + 知识库文本匹配
        """
        interpretations = []
        for item in lab_results:
            abnormal_type = "normal"
            clinical_meaning = ""
            suggestion = ""

            if item.is_abnormal:
                if item.abnormal_type == "high":
                    abnormal_type = "high"
                    clinical_meaning = f"{item.item_name} 偏高，可能提示相关系统功能异常，请结合临床综合判断。"
                    suggestion = "建议复查或进一步检查以明确原因。"
                elif item.abnormal_type == "low":
                    abnormal_type = "low"
                    clinical_meaning = f"{item.item_name} 偏低，可能提示相关指标不足，请结合临床综合判断。"
                    suggestion = "建议结合症状及其他检查综合评估。"
            else:
                clinical_meaning = f"{item.item_name} 在正常参考范围内。"

            interpretations.append(LabInterpretation(
                item_name=item.item_name,
                value=item.value,
                unit=item.unit or "",
                is_abnormal=item.is_abnormal,
                abnormal_type=abnormal_type,
                clinical_meaning=clinical_meaning,
                suggestion=suggestion,
            ))

        return interpretations
