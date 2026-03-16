"""
检验推荐接口
根据诊断名称从检验知识库中检索推荐的检验项目
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models.exam import Exam
from schemas.common import Response

router = APIRouter()


# 高优先级诊断关键词映射（精确匹配时标记为 required）
_REQUIRED_KEYWORDS = {
    "心肌梗死": ["心电图", "ECG", "心肌酶", "肌钙蛋白", "NT-proBNP", "造影"],
    "心梗":     ["心电图", "ECG", "心肌酶", "肌钙蛋白"],
    "高血压":   ["血压", "肾功能", "电解质"],
    "糖尿病":   ["血糖", "糖化血红蛋白", "尿糖"],
    "肺炎":     ["胸片", "血常规", "CRP", "降钙素原", "痰培养"],
    "感染":     ["血常规", "CRP", "降钙素原"],
}


def _infer_level(exam_name: str, diagnosis_names: List[str]) -> str:
    """推断检验项目是必查还是酌情"""
    for diag in diagnosis_names:
        for keyword, required_list in _REQUIRED_KEYWORDS.items():
            if keyword in diag:
                for req in required_list:
                    if req in exam_name:
                        return "required"
    return "optional"


@router.get("/exam-recommend", summary="根据诊断推荐检验项目")
async def exam_recommend(
    disease_names: Optional[str] = Query(None, description="诊断名称，多个用逗号分隔"),
    limit: int = Query(10, ge=1, le=30),
    session: AsyncSession = Depends(get_db),
):
    """
    根据诊断名称从检验知识库中检索相关检验项目。
    disease_names: 逗号分隔的诊断名称，如 "高血压,糖尿病"
    """
    if not disease_names or not disease_names.strip():
        return Response.ok({"items": []})

    names = [n.strip() for n in disease_names.split(",") if n.strip()]
    if not names:
        return Response.ok({"items": []})

    # 构建查询条件：检验名称或适应症中包含任意诊断关键词
    conditions = []
    for name in names:
        # 取诊断名前4个字作为搜索关键词（避免过长影响匹配）
        keyword = name[:6]
        conditions.append(Exam.name.ilike(f"%{keyword}%"))
        conditions.append(Exam.indications.ilike(f"%{keyword}%") if hasattr(Exam, 'indications') else Exam.name.ilike(f"%{keyword}%"))
        conditions.append(Exam.clinical_significance.ilike(f"%{keyword}%") if hasattr(Exam, 'clinical_significance') else Exam.name.ilike(f"%{keyword}%"))

    stmt = (
        select(Exam)
        .where(Exam.is_published == True)
        .where(or_(*conditions))
        .limit(limit)
    )
    rows = await session.execute(stmt)
    exams = rows.scalars().all()

    items = [
        {
            "id":    str(e.id),
            "name":  e.name,
            "code":  e.code or e.name[:4].upper(),
            "type":  getattr(e, "type", "lab"),
            "level": _infer_level(e.name, names),
            "description": getattr(e, "description", None),
        }
        for e in exams
    ]

    return Response.ok({"items": items, "total": len(items)})
