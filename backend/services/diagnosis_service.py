"""
辅助诊断服务
MVP阶段：基于症状关键词匹配疾病知识库（规则引擎）
后续可升级为 AI 模型推断
"""
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.disease_repo import DiseaseRepository


class DiagnosisResult:
    def __init__(self, disease_id: str, name: str, icd_code: str, match_score: float, matched_symptoms: List[str]):
        self.disease_id = disease_id
        self.name = name
        self.icd_code = icd_code
        self.match_score = match_score
        self.matched_symptoms = matched_symptoms


class DiagnosisService:
    def __init__(self, session: AsyncSession):
        self.repo = DiseaseRepository(session)

    async def suggest_diagnoses(self, symptoms: List[str], top_k: int = 5) -> List[DiagnosisResult]:
        """
        根据症状列表推荐可能诊断
        symptoms: ["发热", "咳嗽", "胸痛"]
        """
        results = []
        for symptom in symptoms:
            diseases, _ = await self.repo.search_by_name(symptom, limit=10)
            for disease in diseases:
                # 检查症状字段匹配
                matched = []
                symptom_text = (disease.symptoms or "") + (disease.overview or "")
                for s in symptoms:
                    if s in symptom_text:
                        matched.append(s)
                if matched:
                    results.append(DiagnosisResult(
                        disease_id=str(disease.id),
                        name=disease.name,
                        icd_code=disease.icd_code or "",
                        match_score=len(matched) / len(symptoms),
                        matched_symptoms=matched,
                    ))

        # 去重（同一疾病取最高分）
        seen = {}
        for r in results:
            if r.disease_id not in seen or r.match_score > seen[r.disease_id].match_score:
                seen[r.disease_id] = r

        sorted_results = sorted(seen.values(), key=lambda x: x.match_score, reverse=True)
        return sorted_results[:top_k]
