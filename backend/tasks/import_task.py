"""
知识库批量导入 Celery 任务
支持 Excel (.xlsx) 和 JSON 格式
"""

import asyncio
from typing import List

from db.database import AsyncSessionLocal
from db.models.disease import Disease
from db.models.drug import Drug
from db.models.exam import Exam
from db.models.formula import Formula
from db.models.assessment import Assessment
from tasks.celery_app import celery_app


@celery_app.task(bind=True, name="tasks.import_diseases")
def import_diseases_task(self, rows: List[dict]):
    """
    异步导入疾病数据
    rows: [{"name": "...", "icd_code": "...", "department": "...", ...}]
    """
    return asyncio.run(_import_diseases(rows, _progress_cb(self)))


@celery_app.task(bind=True, name="tasks.import_drugs")
def import_drugs_task(self, rows: List[dict]):
    """异步导入药品数据"""
    return asyncio.run(_import_drugs(rows, _progress_cb(self)))


@celery_app.task(bind=True, name="tasks.import_exams")
def import_exams_task(self, rows: List[dict]):
    """异步导入检验检查数据"""
    return asyncio.run(_import_exams(rows, _progress_cb(self)))


@celery_app.task(bind=True, name="tasks.import_formulas")
def import_formulas_task(self, rows: List[dict]):
    """异步导入医学公式数据"""
    return asyncio.run(_import_formulas(rows, _progress_cb(self)))


@celery_app.task(bind=True, name="tasks.import_assessments")
def import_assessments_task(self, rows: List[dict]):
    """异步导入量表数据"""
    return asyncio.run(_import_assessments(rows, _progress_cb(self)))


def _progress_cb(task):
    def _cb(current: int, total: int, success: int, failed: int):
        task.update_state(
            state="PROGRESS",
            meta={
                "current": current,
                "total": total,
                "success": success,
                "failed": failed,
            },
        )

    return _cb


async def _import_diseases(rows: List[dict], progress_cb):
    success = 0
    failed = 0
    errors = []
    total = len(rows)
    async with AsyncSessionLocal() as session:
        for i, row in enumerate(rows):
            try:
                name = str(row.get("name") or "").strip()
                if not name:
                    raise ValueError("name 不能为空")
                dd = row.get("differential_diagnosis") or None
                obj = Disease(
                    name=name,
                    icd_code=row.get("icd_code") or None,
                    department=row.get("department") or None,
                    system=row.get("system") or None,
                    disease_type=row.get("disease_type") or None,
                    specialty=row.get("specialty") or None,
                    overview=row.get("overview") or row.get("summary") or None,
                    definition=row.get("definition") or None,
                    pathogenesis=row.get("pathogenesis") or None,
                    etiology=row.get("etiology") or None,
                    symptoms=row.get("symptoms")
                    or row.get("clinical_manifestation")
                    or None,
                    diagnosis_criteria=row.get("diagnosis_criteria")
                    or row.get("diagnosis")
                    or None,
                    differential_diagnosis=dd,
                    complications=row.get("complications")
                    or row.get("common_complications")
                    or None,
                    treatment=row.get("treatment")
                    or row.get("treatment_principle")
                    or None,
                    prognosis=row.get("prognosis") or None,
                    prevention=row.get("prevention") or None,
                    follow_up=row.get("follow_up") or None,
                    source=row.get("source") or row.get("source_id") or None,
                    version_no=row.get("version_no") or None,
                    is_published=True,
                )
                session.add(obj)
                await session.commit()
                success += 1
            except Exception as e:
                await session.rollback()
                failed += 1
                errors.append({"row": i + 1, "error": str(e)})
            progress_cb(i + 1, total, success, failed)
    return {"success": success, "failed": failed, "errors": errors}


async def _import_drugs(rows: List[dict], progress_cb):
    success = 0
    failed = 0
    errors = []
    total = len(rows)
    async with AsyncSessionLocal() as session:
        for i, row in enumerate(rows):
            try:
                name = str(row.get("name") or "").strip()
                if not name:
                    raise ValueError("name 不能为空")
                obj = Drug(
                    name=name,
                    trade_name=row.get("trade_name") or None,
                    category=row.get("category") or None,
                    indications=row.get("indications") or None,
                    dosage=row.get("dosage") or None,
                    contraindications=row.get("contraindications") or None,
                    interactions=row.get("interactions") or None,
                    adverse_reactions=row.get("adverse_reactions")
                    or row.get("adverse_effects")
                    or None,
                    is_published=True,
                )
                session.add(obj)
                await session.commit()
                success += 1
            except Exception as e:
                await session.rollback()
                failed += 1
                errors.append({"row": i + 1, "error": str(e)})
            progress_cb(i + 1, total, success, failed)
    return {"success": success, "failed": failed, "errors": errors}


async def _import_exams(rows: List[dict], progress_cb):
    success = 0
    failed = 0
    errors = []
    total = len(rows)
    async with AsyncSessionLocal() as session:
        for i, row in enumerate(rows):
            try:
                name = str(row.get("name") or "").strip()
                if not name:
                    raise ValueError("name 不能为空")
                cs = row.get("clinical_significance") or None
                obj = Exam(
                    name=name,
                    code=row.get("code") or None,
                    type=row.get("type") or "lab",
                    description=row.get("description") or None,
                    reference_ranges=row.get("reference_ranges") or [],
                    clinical_significance=cs,
                    indications=row.get("indications") or None,
                    preparation=row.get("preparation") or None,
                    is_published=True,
                )
                session.add(obj)
                await session.commit()
                success += 1
            except Exception as e:
                await session.rollback()
                failed += 1
                errors.append({"row": i + 1, "error": str(e)})
            progress_cb(i + 1, total, success, failed)
    return {"success": success, "failed": failed, "errors": errors}


async def _import_formulas(rows: List[dict], progress_cb):
    success = 0
    failed = 0
    errors = []
    total = len(rows)
    async with AsyncSessionLocal() as session:
        for i, row in enumerate(rows):
            try:
                name = str(row.get("name") or "").strip()
                if not name:
                    raise ValueError("name 不能为空")
                parameters = row.get("parameters")
                if not isinstance(parameters, list):
                    parameters = []
                interpretation_rules = row.get("interpretation_rules")
                if not isinstance(interpretation_rules, list):
                    interpretation_rules = []
                if not interpretation_rules and row.get("interpretation"):
                    interpretation_rules = [
                        {
                            "label": "默认",
                            "interpretation": row.get("interpretation"),
                        }
                    ]
                reference = row.get("reference") or row.get("source") or None
                obj = Formula(
                    name=name,
                    category=row.get("category") or None,
                    department=row.get("department") or None,
                    description=row.get("description") or None,
                    formula_expr=(
                        row.get("formula_expr") or row.get("formula") or None
                    ),
                    reference=reference,
                    parameters=parameters,
                    interpretation_rules=interpretation_rules,
                    is_published=True,
                )
                session.add(obj)
                await session.commit()
                success += 1
            except Exception as e:
                await session.rollback()
                failed += 1
                errors.append({"row": i + 1, "error": str(e)})
            progress_cb(i + 1, total, success, failed)
    return {"success": success, "failed": failed, "errors": errors}


async def _import_assessments(rows: List[dict], progress_cb):
    success = 0
    failed = 0
    errors = []
    total = len(rows)
    async with AsyncSessionLocal() as session:
        for i, row in enumerate(rows):
            try:
                name = str(row.get("name") or "").strip()
                if not name:
                    raise ValueError("name 不能为空")
                questions = row.get("questions")
                if not isinstance(questions, list):
                    questions = []
                scoring_rules = row.get("scoring_rules")
                if not isinstance(scoring_rules, list):
                    scoring_rules = []
                dep = row.get("department") or row.get("category") or None
                obj = Assessment(
                    name=name,
                    department=dep,
                    description=row.get("description") or None,
                    questions=questions,
                    scoring_rules=scoring_rules,
                    is_published=True,
                )
                session.add(obj)
                await session.commit()
                success += 1
            except Exception as e:
                await session.rollback()
                failed += 1
                errors.append({"row": i + 1, "error": str(e)})
            progress_cb(i + 1, total, success, failed)
    return {"success": success, "failed": failed, "errors": errors}
