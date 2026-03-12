"""
风险评估 / 量表评分服务
支持动态量表配置，自动计算评分并返回解读
"""
from uuid import UUID
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.base_repo import BaseRepository
from db.models.assessment import Assessment
from core.exceptions import NotFoundError


class AssessmentRepository(BaseRepository[Assessment]):
    def __init__(self, session: AsyncSession):
        super().__init__(Assessment, session)


class ScoreResult:
    def __init__(self, total_score: float, level: str, interpretation: str, recommendation: str):
        self.total_score = total_score
        self.level = level
        self.interpretation = interpretation
        self.recommendation = recommendation


class RiskAssessService:
    def __init__(self, session: AsyncSession):
        self.repo = AssessmentRepository(session)

    async def get_assessment(self, assessment_id: UUID) -> Assessment:
        obj = await self.repo.get_by_id(assessment_id)
        if not obj:
            raise NotFoundError("量表")
        return obj

    async def get_list(self, offset: int = 0, limit: int = 20):
        return await self.repo.get_list(offset, limit)

    async def calculate_score(
        self,
        assessment_id: UUID,
        answers: Dict[str, Any],   # {question_id: selected_value}
        patient_context: Optional[Any] = None,
    ) -> ScoreResult:
        """
        计算量表评分
        answers: 医生填写的答案 {question_id: value}
        """
        assessment = await self.get_assessment(assessment_id)
        total_score = 0.0

        for question in assessment.questions:
            qid = question["id"]
            selected_value = answers.get(qid)
            if selected_value is None:
                continue
            for option in question.get("options", []):
                if str(option["value"]) == str(selected_value):
                    total_score += option.get("score", 0)
                    break

        # 查找评分规则
        level = "未知"
        interpretation = ""
        recommendation = ""
        for rule in assessment.scoring_rules:
            r_min = rule.get("range_min", float("-inf"))
            r_max = rule.get("range_max", float("inf"))
            if r_min <= total_score <= r_max:
                level = rule.get("level", "")
                interpretation = rule.get("interpretation", "")
                recommendation = rule.get("recommendation", "")
                break

        return ScoreResult(
            total_score=total_score,
            level=level,
            interpretation=interpretation,
            recommendation=recommendation,
        )
