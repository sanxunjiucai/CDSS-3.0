"""
管理端 - 知识库管理接口
支持疾病/药品/检验/指南的 CRUD 和批量导入
"""
import json
from pathlib import Path
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models.disease import Disease
from db.models.drug import Drug
from db.models.exam import Exam
from db.models.guideline import Guideline
from schemas.disease import DiseaseCreate, DiseaseUpdate, DiseaseDetail
from schemas.drug import DrugCreate, DrugUpdate, DrugDetail
from schemas.exam import ExamCreate, ExamUpdate, ExamDetail
from schemas.common import Response
from services.disease_service import DiseaseService
from services.drug_service import DrugService
from services.exam_service import ExamService
from services.guideline_service import GuidelineService
from services.literature_service import LiteratureService, PROCESSED_DIR

router = APIRouter()


# ═══════════════════════════════════════════════════════════
# 疾病库管理
# ═══════════════════════════════════════════════════════════

@router.post("/diseases", response_model=Response[DiseaseDetail], summary="新增疾病")
async def create_disease(data: DiseaseCreate, session: AsyncSession = Depends(get_db)):
    service = DiseaseService(session)
    disease = await service.create(data)
    return Response.ok(DiseaseDetail.model_validate(disease))


@router.put("/diseases/{disease_id}", response_model=Response[DiseaseDetail], summary="更新疾病")
async def update_disease(disease_id: UUID, data: DiseaseUpdate, session: AsyncSession = Depends(get_db)):
    service = DiseaseService(session)
    disease = await service.update(disease_id, data)
    return Response.ok(DiseaseDetail.model_validate(disease))


@router.delete("/diseases/{disease_id}", summary="删除疾病")
async def delete_disease(disease_id: UUID, session: AsyncSession = Depends(get_db)):
    service = DiseaseService(session)
    await service.delete(disease_id)
    return Response.ok(None, "删除成功")


# ═══════════════════════════════════════════════════════════
# 药品库管理
# ═══════════════════════════════════════════════════════════

@router.post("/drugs", response_model=Response[DrugDetail], summary="新增药品")
async def create_drug(data: DrugCreate, session: AsyncSession = Depends(get_db)):
    service = DrugService(session)
    drug = await service.create(data)
    return Response.ok(DrugDetail.model_validate(drug))


@router.put("/drugs/{drug_id}", response_model=Response[DrugDetail], summary="更新药品")
async def update_drug(drug_id: UUID, data: DrugUpdate, session: AsyncSession = Depends(get_db)):
    service = DrugService(session)
    drug = await service.update(drug_id, data)
    return Response.ok(DrugDetail.model_validate(drug))


@router.delete("/drugs/{drug_id}", summary="删除药品")
async def delete_drug(drug_id: UUID, session: AsyncSession = Depends(get_db)):
    service = DrugService(session)
    await service.delete(drug_id)
    return Response.ok(None, "删除成功")


# ═══════════════════════════════════════════════════════════
# 检验检查库管理
# ═══════════════════════════════════════════════════════════

@router.post("/exams", response_model=Response[ExamDetail], summary="新增检验检查")
async def create_exam(data: ExamCreate, session: AsyncSession = Depends(get_db)):
    service = ExamService(session)
    exam = await service.create(data)
    return Response.ok(ExamDetail.model_validate(exam))


@router.put("/exams/{exam_id}", response_model=Response[ExamDetail], summary="更新检验检查")
async def update_exam(exam_id: UUID, data: ExamUpdate, session: AsyncSession = Depends(get_db)):
    service = ExamService(session)
    exam = await service.update(exam_id, data)
    return Response.ok(ExamDetail.model_validate(exam))


@router.delete("/exams/{exam_id}", summary="删除检验检查")
async def delete_exam(exam_id: UUID, session: AsyncSession = Depends(get_db)):
    service = ExamService(session)
    await service.delete(exam_id)
    return Response.ok(None, "删除成功")


# ═══════════════════════════════════════════════════════════
# 指南库管理
# ═══════════════════════════════════════════════════════════

def _guideline_dict(g: Guideline) -> dict:
    return {
        "id":           str(g.id),
        "title":        g.title,
        "organization": g.organization,
        "department":   g.department,
        "publish_year": g.publish_year,
        "summary":      g.summary,
        "is_published": g.is_published,
        "created_at":   g.created_at.isoformat() if g.created_at else None,
    }


@router.post("/guidelines", summary="新增指南")
async def create_guideline(
    title: str = Form(...),
    organization: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    publish_year: Optional[int] = Form(None),
    summary: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_db),
):
    service = GuidelineService(session)
    g = await service.create({
        "title": title, "organization": organization,
        "department": department, "publish_year": publish_year,
        "summary": summary,
    })
    return Response.ok(_guideline_dict(g))


@router.post("/guidelines/json", summary="新增指南（JSON Body）")
async def create_guideline_json(data: dict, session: AsyncSession = Depends(get_db)):
    """接受 JSON body 新增指南，供前端 application/json 请求使用"""
    from pydantic import BaseModel as PM
    service = GuidelineService(session)
    allowed = {"title", "organization", "department", "publish_year", "summary", "source_url"}
    payload = {k: v for k, v in data.items() if k in allowed and v is not None and v != ""}
    if not payload.get("title"):
        raise HTTPException(status_code=400, detail="title 不能为空")
    # published_at → publish_year 兼容
    if "published_at" in data and data["published_at"] and "publish_year" not in payload:
        try:
            payload["publish_year"] = int(str(data["published_at"])[:4])
        except Exception:
            pass
    g = await service.create(payload)
    return Response.ok(_guideline_dict(g))


@router.put("/guidelines/{guideline_id}", summary="更新指南")
async def update_guideline(guideline_id: UUID, data: dict, session: AsyncSession = Depends(get_db)):
    service = GuidelineService(session)
    # published_at → publish_year 兼容
    if "published_at" in data and data["published_at"]:
        try:
            data.setdefault("publish_year", int(str(data["published_at"])[:4]))
        except Exception:
            pass
    g = await service.update(guideline_id, data)
    return Response.ok(_guideline_dict(g))


@router.delete("/guidelines/{guideline_id}", summary="删除指南")
async def delete_guideline(guideline_id: UUID, session: AsyncSession = Depends(get_db)):
    service = GuidelineService(session)
    await service.delete(guideline_id)
    return Response.ok(None, "删除成功")


# ═══════════════════════════════════════════════════════════
# 公式库管理
# ═══════════════════════════════════════════════════════════

from db.models.formula import Formula
from services.formula_service import FormulaService


@router.post("/formulas", summary="新增公式")
async def create_formula(data: dict, session: AsyncSession = Depends(get_db)):
    allowed = {"name", "category", "department", "description", "formula_expr",
               "parameters", "interpretation_rules"}
    payload = {k: v for k, v in data.items() if k in allowed}
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="name 不能为空")
    svc = FormulaService(session)
    obj = await svc.create(payload)
    return Response.ok({"id": str(obj.id), "name": obj.name})


@router.put("/formulas/{formula_id}", summary="更新公式")
async def update_formula(formula_id: UUID, data: dict, session: AsyncSession = Depends(get_db)):
    svc = FormulaService(session)
    obj = await svc.update(formula_id, data)
    return Response.ok({"id": str(obj.id), "name": obj.name})


@router.delete("/formulas/{formula_id}", summary="删除公式")
async def delete_formula(formula_id: UUID, session: AsyncSession = Depends(get_db)):
    svc = FormulaService(session)
    await svc.delete(formula_id)
    return Response.ok(None, "删除成功")


# ═══════════════════════════════════════════════════════════
# 量表管理
# ═══════════════════════════════════════════════════════════

from db.models.assessment import Assessment
from services.assessment_service import AssessmentService


@router.post("/assessments", summary="新增量表")
async def create_assessment(data: dict, session: AsyncSession = Depends(get_db)):
    allowed = {"name", "department", "description", "questions", "scoring_rules"}
    payload = {k: v for k, v in data.items() if k in allowed}
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="name 不能为空")
    svc = AssessmentService(session)
    obj = await svc.create(payload)
    return Response.ok({"id": str(obj.id), "name": obj.name})


@router.put("/assessments/{assessment_id}", summary="更新量表")
async def update_assessment(assessment_id: UUID, data: dict, session: AsyncSession = Depends(get_db)):
    svc = AssessmentService(session)
    obj = await svc.update(assessment_id, data)
    return Response.ok({"id": str(obj.id), "name": obj.name})


@router.delete("/assessments/{assessment_id}", summary="删除量表")
async def delete_assessment(assessment_id: UUID, session: AsyncSession = Depends(get_db)):
    svc = AssessmentService(session)
    await svc.delete(assessment_id)
    return Response.ok(None, "删除成功")


# ═══════════════════════════════════════════════════════════
# 统一批量导入接口
# ═══════════════════════════════════════════════════════════

@router.post("/import", summary="批量导入知识库数据（JSON文件）")
async def import_knowledge(
    type: str = Form(..., description="导入类型：disease | drug | exam | guideline | literature | case"),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
):
    if type not in ("disease", "drug", "exam", "guideline", "literature", "case"):
        raise HTTPException(status_code=400, detail=f"不支持的类型: {type}")

    content = await file.read()
    try:
        data = json.loads(content.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="文件解析失败，请上传合法的 JSON 文件")

    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="JSON 格式错误，期望数组 [...]")

    imported = 0
    skipped = 0
    errors = []

    if type == "disease":
        imported, skipped, errors = await _import_diseases(session, data)
    elif type == "drug":
        imported, skipped, errors = await _import_drugs(session, data)
    elif type == "exam":
        imported, skipped, errors = await _import_exams(session, data)
    elif type == "guideline":
        imported, skipped, errors = await _import_guidelines(session, data)
    elif type == "literature":
        imported, skipped, errors = _import_literature_json(PROCESSED_DIR / "literature_dynamic.json", data, "literature")
        LiteratureService.clear_cache()
    elif type == "case":
        imported, skipped, errors = _import_literature_json(PROCESSED_DIR / "literature_cases.json", data, "case")
        LiteratureService.clear_cache()

    return Response.ok({
        "type":     type,
        "imported": imported,
        "skipped":  skipped,
        "errors":   errors[:10],  # 最多返回10条错误
    })


# ── 各类型导入实现 ─────────────────────────────────────────

async def _import_diseases(session, data: list):
    imported, skipped, errors = 0, 0, []
    batch = []
    for i, item in enumerate(data):
        name = (item.get("name") or "").strip()
        if not name:
            skipped += 1
            continue
        try:
            obj = Disease(
                name=name,
                icd_code=item.get("icd_code") or None,
                department=item.get("department") or None,
                system=item.get("system") or None,
                disease_type=item.get("disease_type") or None,
                specialty=item.get("specialty") or None,
                overview=item.get("overview") or item.get("summary") or None,
                definition=item.get("definition") or None,
                pathogenesis=item.get("pathogenesis") or None,
                etiology=item.get("etiology") or None,
                symptoms=item.get("symptoms") or item.get("clinical_manifestation") or None,
                diagnosis_criteria=item.get("diagnosis_criteria") or item.get("diagnosis") or None,
                differential_diagnosis=item.get("differential_diagnosis") or None,
                complications=item.get("complications") or item.get("common_complications") or None,
                treatment=item.get("treatment") or item.get("treatment_principle") or None,
                prognosis=item.get("prognosis") or None,
                prevention=item.get("prevention") or None,
                follow_up=item.get("follow_up") or None,
                source=item.get("source") or item.get("source_id") or None,
                version_no=item.get("version_no") or None,
                is_published=True,
            )
            batch.append(obj)
            imported += 1
        except Exception as e:
            errors.append(f"第{i+1}条: {e}")
        if len(batch) >= 200:
            session.add_all(batch)
            await session.commit()
            batch = []
    if batch:
        session.add_all(batch)
        await session.commit()
    return imported, skipped, errors


def _import_literature_json(path: Path, data: list, kind: str):
    imported, skipped, errors = 0, 0, []
    rows = []
    seen = set()
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            skipped += 1
            continue
        pmid = str(item.get("pmid") or "").strip()
        title = str(item.get("title") or "").strip()
        if not pmid or not title:
            skipped += 1
            continue
        if pmid in seen:
            skipped += 1
            continue
        seen.add(pmid)
        try:
            rows.append({
                "pmid": pmid,
                "title": title,
                "department": item.get("department"),
                "journal": item.get("journal"),
                "publish_year": item.get("publish_year"),
                "published_at": item.get("published_at") or item.get("publish_date"),
                "authors": item.get("authors") or [],
                "keywords": item.get("keywords") or [],
                "abstract": item.get("abstract") or item.get("summary"),
                "source_url": item.get("source_url"),
                "pmc_url": item.get("pmc_url"),
                "doi": item.get("doi"),
                "type": "literature" if kind == "literature" else "case",
            })
            imported += 1
        except Exception as e:
            errors.append(f"第{i+1}条: {e}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    return imported, skipped, errors


async def _import_drugs(session, data: list):
    imported, skipped, errors = 0, 0, []
    batch = []
    for i, item in enumerate(data):
        name = (item.get("name") or "").strip()
        if not name:
            skipped += 1
            continue
        try:
            obj = Drug(
                name=name,
                trade_name=item.get("trade_name") or None,
                category=item.get("category") or None,
                indications=item.get("indications") or None,
                dosage=item.get("dosage") or None,
                contraindications=item.get("contraindications") or None,
                interactions=item.get("interactions") or None,
                adverse_reactions=item.get("adverse_reactions") or item.get("adverse_effects") or None,
                is_published=True,
            )
            batch.append(obj)
            imported += 1
        except Exception as e:
            errors.append(f"第{i+1}条: {e}")
        if len(batch) >= 200:
            session.add_all(batch)
            await session.commit()
            batch = []
    if batch:
        session.add_all(batch)
        await session.commit()
    return imported, skipped, errors


async def _import_exams(session, data: list):
    imported, skipped, errors = 0, 0, []
    batch = []
    for i, item in enumerate(data):
        name = (item.get("name") or "").strip()
        if not name:
            skipped += 1
            continue
        try:
            obj = Exam(
                name=name,
                code=item.get("code") or None,
                type=item.get("type") or "lab",
                description=item.get("description") or None,
                reference_ranges=item.get("reference_ranges") or [],
                clinical_significance=item.get("clinical_significance") or None,
                indications=item.get("indications") or None,
                preparation=item.get("preparation") or None,
                is_published=True,
            )
            batch.append(obj)
            imported += 1
        except Exception as e:
            errors.append(f"第{i+1}条: {e}")
        if len(batch) >= 200:
            session.add_all(batch)
            await session.commit()
            batch = []
    if batch:
        session.add_all(batch)
        await session.commit()
    return imported, skipped, errors


async def _import_guidelines(session, data: list):
    imported, skipped, errors = 0, 0, []
    batch = []
    for i, item in enumerate(data):
        title = (item.get("title") or "").strip()
        if not title:
            skipped += 1
            continue
        try:
            publish_year = None
            pub = item.get("published_at") or item.get("publish_year")
            if pub:
                try:
                    publish_year = int(str(pub)[:4])
                except Exception:
                    pass
            obj = Guideline(
                title=title,
                organization=item.get("organization") or None,
                department=item.get("department") or None,
                publish_year=publish_year,
                summary=item.get("summary") or None,
                is_published=True,
            )
            batch.append(obj)
            imported += 1
        except Exception as e:
            errors.append(f"第{i+1}条: {e}")
        if len(batch) >= 200:
            session.add_all(batch)
            await session.commit()
            batch = []
    if batch:
        session.add_all(batch)
        await session.commit()
    return imported, skipped, errors
