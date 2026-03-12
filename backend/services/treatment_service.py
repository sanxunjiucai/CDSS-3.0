"""
治疗方案推荐服务
通用推荐：基于疾病知识库treatment字段
个性化推荐：结合患者上下文（年龄/过敏/合并症）过滤调整
"""
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.disease_repo import DiseaseRepository
from schemas.patient import PatientContext
from core.exceptions import NotFoundError


class TreatmentRecommendation:
    def __init__(self, disease_id: str, disease_name: str,
                 treatment_text: str, personalized_notes: list):
        self.disease_id = disease_id
        self.disease_name = disease_name
        self.treatment_text = treatment_text
        self.personalized_notes = personalized_notes  # 个性化调整说明


class TreatmentService:
    def __init__(self, session: AsyncSession):
        self.repo = DiseaseRepository(session)

    async def get_treatment(
        self,
        disease_id: UUID,
        patient_context: Optional[PatientContext] = None,
    ) -> TreatmentRecommendation:
        disease = await self.repo.get_by_id(disease_id)
        if not disease:
            raise NotFoundError("疾病")

        notes = []
        if patient_context:
            # 年龄相关提示
            if patient_context.age >= 65:
                notes.append("老年患者用药需注意剂量调整，参考肾功能及肝功能状态。")
            if patient_context.age < 18:
                notes.append("儿童患者请参考儿科剂量规范。")
            # 过敏提示
            if patient_context.allergies:
                notes.append(f"患者有以下过敏史，用药时请注意回避：{', '.join(patient_context.allergies)}")

        return TreatmentRecommendation(
            disease_id=str(disease.id),
            disease_name=disease.name,
            treatment_text=disease.treatment or "暂无治疗方案数据",
            personalized_notes=notes,
        )
