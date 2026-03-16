"""
管理端 - 仪表盘统计接口
"""
from pathlib import Path
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models.disease import Disease
from db.models.drug import Drug
from db.models.exam import Exam
from db.models.guideline import Guideline
from db.models.user import User
from schemas.common import Response
from services.literature_service import LiteratureService

router = APIRouter()


@router.get("/stats/overview", summary="仪表盘统计概览")
async def stats_overview(session: AsyncSession = Depends(get_db)):
    async def count(model):
        result = await session.execute(select(func.count()).select_from(model))
        return result.scalar() or 0

    disease_count   = await count(Disease)
    drug_count      = await count(Drug)
    exam_count      = await count(Exam)
    guideline_count = await count(Guideline)
    user_count      = await count(User)
    literature_service = LiteratureService()
    literature_count = literature_service.count("literature")
    case_count = literature_service.count("case")

    return Response.ok({
        "disease_count":   disease_count,
        "drug_count":      drug_count,
        "exam_count":      exam_count,
        "guideline_count": guideline_count,
        "literature_count": literature_count,
        "case_count": case_count,
        "user_count":      user_count,
    })


@router.get("/stats/literature", summary="文献库统计信息")
async def literature_stats():
    service = LiteratureService()
    base_dir = Path(__file__).resolve().parents[4]
    processed_dir = base_dir / "scrapers" / "data" / "processed"
    dynamic_path = processed_dir / "literature_dynamic.json"
    case_path = processed_dir / "literature_cases.json"

    def file_meta(path: Path):
        if not path.exists():
            return {"exists": False, "path": str(path), "updated_at": None}
        stat = path.stat()
        return {
            "exists": True,
            "path": str(path),
            "updated_at": int(stat.st_mtime),
            "size": int(stat.st_size),
        }

    return Response.ok({
        "literature_count": service.count("literature"),
        "case_count": service.count("case"),
        "dynamic_file": file_meta(dynamic_path),
        "case_file": file_meta(case_path),
    })


@router.post("/stats/literature/reload", summary="刷新文献缓存")
async def reload_literature_cache():
    LiteratureService.clear_cache()
    service = LiteratureService()
    return Response.ok({
        "literature_count": service.count("literature"),
        "case_count": service.count("case"),
    }, "文献缓存已刷新")
