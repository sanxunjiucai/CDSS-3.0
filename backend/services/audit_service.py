"""
诊断合理性审核 + 实时预警服务
MVP阶段：基于规则引擎（药物禁忌、适应症不符等）
"""
from typing import List, Optional
from schemas.patient import PatientContext


class AuditWarning:
    def __init__(self, level: str, code: str, message: str, suggestion: str):
        self.level = level        # "error" | "warning" | "info"
        self.code = code          # 预警代码
        self.message = message    # 提示文本
        self.suggestion = suggestion  # 建议操作


class AuditService:
    async def check_drug_order(
        self,
        drug_name: str,
        drug_id: Optional[str],
        patient_context: Optional[PatientContext],
    ) -> List[AuditWarning]:
        """
        开药时审核：过敏、禁忌检查
        """
        warnings = []
        if patient_context:
            for allergy in patient_context.allergies:
                if allergy and drug_name and allergy.lower() in drug_name.lower():
                    warnings.append(AuditWarning(
                        level="error",
                        code="DRUG_ALLERGY",
                        message=f"患者对【{allergy}】过敏，当前开具的【{drug_name}】可能存在过敏风险！",
                        suggestion="请更换药物或在知情同意后谨慎使用。",
                    ))
        return warnings

    async def check_exam_order(
        self,
        exam_name: str,
        patient_context: Optional[PatientContext],
    ) -> List[AuditWarning]:
        """
        开单时审核：适应症检查（MVP阶段简化）
        """
        warnings = []
        # TODO: 结合检验知识库中的适应症做规则匹配
        return warnings

    async def check_diagnosis_consistency(
        self,
        diagnoses: List[str],
        drug_names: List[str],
        patient_context: Optional[PatientContext],
    ) -> List[AuditWarning]:
        """
        诊断与处置一致性审核
        """
        warnings = []
        # TODO: 基于知识库规则（诊断→推荐药物/检查）做一致性校验
        return warnings
