"""
治疗方案推荐服务
通用推荐：查询 disease_treatment_plans 表，返回结构化方案列表
个性化推荐：结合患者上下文（年龄/过敏/肾功能等）过滤匹配方案
"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.disease_repo import DiseaseRepository
from db.repositories.treatment_plan_repo import TreatmentPlanRepository
from db.models.disease import DiseaseTreatmentPlan
from schemas.patient import PatientContext
from core.exceptions import NotFoundError


def _derive_patient_group(patient_context: PatientContext) -> str:
    """根据患者信息推断适用分组"""
    if patient_context.age is not None:
        if patient_context.age < 18:
            return "儿童"
        if patient_context.age >= 65:
            return "老年"
    return "通用"


def _build_personalized_notes(
    patient_context: PatientContext,
    plans: List[DiseaseTreatmentPlan],
) -> List[str]:
    """生成个性化提示说明"""
    notes = []
    if patient_context.age is not None:
        if patient_context.age >= 65:
            notes.append("老年患者用药需注意剂量调整，参考肾功能及肝功能状态。")
        if patient_context.age < 18:
            notes.append("儿童患者请参考儿科剂量规范。")
    if patient_context.allergies:
        notes.append(f"患者有以下过敏史，用药时请注意回避：{', '.join(patient_context.allergies)}")
    return notes


class TreatmentService:
    def __init__(self, session: AsyncSession):
        self.repo = DiseaseRepository(session)
        self.plan_repo = TreatmentPlanRepository(session)

    async def get_treatment(
        self,
        disease_id: UUID,
        patient_context: Optional[PatientContext] = None,
        severity: Optional[str] = None,
    ) -> dict:
        disease = await self.repo.get_by_id(disease_id)
        if not disease:
            raise NotFoundError("疾病")

        patient_group = None
        personalized_notes = []

        if patient_context:
            patient_group = _derive_patient_group(patient_context)
            plans = await self.plan_repo.get_by_disease_and_patient_group(
                disease_id, severity=severity, patient_group=patient_group
            )
            personalized_notes = _build_personalized_notes(patient_context, plans)
        else:
            plans = await self.plan_repo.get_by_disease(disease_id)

        # 有结构化方案就返回结构化，否则降级到 treatment 文本
        if plans:
            plans_data = [
                {
                    "id": str(p.id),
                    "plan_name": p.plan_name,
                    "plan_type": p.plan_type,
                    "applicable_condition": p.applicable_condition,
                    "severity": p.severity,
                    "patient_group": p.patient_group,
                    "treatment_content": p.treatment_content,
                    "drug_refs": p.drug_refs,
                    "evidence_level": p.evidence_level,
                    "guideline_ref": p.guideline_ref,
                }
                for p in plans
            ]
        else:
            plans_data = []

        return {
            "disease_id": str(disease.id),
            "disease_name": disease.name,
            "treatment_overview": disease.treatment,  # 兼容旧数据
            "plans": plans_data,
            "personalized_notes": personalized_notes,
        }
