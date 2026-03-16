from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException

from db.models.assessment import Assessment
from core.pagination import PaginationParams


class AssessmentService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_list(
        self,
        params: PaginationParams,
        q: Optional[str] = None,
        department: Optional[str] = None,
        category: Optional[str] = None,
    ):
        stmt = select(Assessment).where(Assessment.is_published == True)
        count_stmt = select(func.count()).select_from(Assessment).where(Assessment.is_published == True)

        if q:
            pattern = f"%{q}%"
            cond = or_(Assessment.name.ilike(pattern), Assessment.description.ilike(pattern))
            stmt = stmt.where(cond)
            count_stmt = count_stmt.where(cond)
        if department:
            stmt = stmt.where(Assessment.department == department)
            count_stmt = count_stmt.where(Assessment.department == department)

        total = (await self.session.execute(count_stmt)).scalar() or 0
        stmt = stmt.order_by(Assessment.name).offset(params.offset).limit(params.page_size)
        items = (await self.session.execute(stmt)).scalars().all()
        return list(items), total

    async def get_detail(self, assessment_id: UUID) -> Assessment:
        obj = await self.session.get(Assessment, assessment_id)
        if not obj:
            raise HTTPException(status_code=404, detail="量表不存在")
        return obj

    async def create(self, data: dict) -> Assessment:
        obj = Assessment(**{k: v for k, v in data.items() if hasattr(Assessment, k)})
        obj.is_published = True
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def update(self, assessment_id: UUID, data: dict) -> Assessment:
        obj = await self.get_detail(assessment_id)
        for k, v in data.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def delete(self, assessment_id: UUID) -> None:
        obj = await self.get_detail(assessment_id)
        await self.session.delete(obj)
        await self.session.commit()

    async def score(self, assessment_id: UUID, answers: dict) -> dict:
        """计算量表评分"""
        assessment = await self.get_detail(assessment_id)
        total_score = 0

        # answers: { question_id: answer_value }
        for question in (assessment.questions or []):
            qid = str(question.get("id", ""))
            answer = answers.get(qid)
            if answer is None:
                continue
            # 找到对应 option 的 score
            for option in (question.get("options") or []):
                if str(option.get("value", "")) == str(answer):
                    total_score += int(option.get("score", 0))
                    break

        # 匹配评分规则
        result = {
            "total_score": total_score,
            "level": "",
            "interpretation": "",
            "recommendation": "",
            "color": "default",
        }
        for rule in (assessment.scoring_rules or []):
            lo = rule.get("range_min", float("-inf"))
            hi = rule.get("range_max", float("inf"))
            if lo <= total_score <= hi:
                result["level"]          = rule.get("level", "")
                result["interpretation"] = rule.get("interpretation", "")
                result["recommendation"] = rule.get("recommendation", "")
                result["color"]          = rule.get("color", "default")
                break

        return result
