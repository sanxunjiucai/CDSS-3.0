"""
将 scrapers/data/processed/ 下的爬取数据导入数据库

用法：
  cd backend
  python scripts/import_scraped_data.py              # 导入全部（diseases/drugs/exams/guidelines/formulas/assessments）
  python scripts/import_scraped_data.py --diseases   # 只导入疾病库
  python scripts/import_scraped_data.py --drugs      # 只导入药品库
  python scripts/import_scraped_data.py --exams      # 只导入检验检查库
  python scripts/import_scraped_data.py --guidelines # 只导入指南库
  python scripts/import_scraped_data.py --formulas   # 只导入医学公式库
  python scripts/import_scraped_data.py --assessments # 只导入量表库
  python scripts/import_scraped_data.py --clear      # 导入前先清空对应表

注意：literature_dynamic/literature_cases/sanji 无独立 DB 模型，
      由 Elasticsearch 自动索引（后续扩展）。
"""
import asyncio
import json
import re
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete
from db.database import AsyncSessionLocal, init_db
from db.models.disease import Disease
from db.models.drug import Drug
from db.models.exam import Exam
from db.models.guideline import Guideline
from db.models.formula import Formula
from db.models.assessment import Assessment

PROCESSED_DIR = Path(__file__).parent.parent.parent / "scrapers" / "data" / "processed"
BATCH = 200  # 每批写入条数


# ── 工具函数 ─────────────────────────────────────────────────────────────────

def _extract_year(date_str: str) -> int | None:
    """从 '2024-03-15' / '2024-03' / '2024年' / '2024' 等提取年份整数"""
    if not date_str:
        return None
    m = re.search(r"(20\d{2})", str(date_str))
    return int(m.group(1)) if m else None


async def _clear(session, *models):
    for model in models:
        await session.execute(delete(model))
    await session.commit()
    print(f"[清空] {', '.join(m.__tablename__ for m in models)}")


async def _flush(session, batch: list, label: str, count: int):
    session.add_all(batch)
    await session.commit()
    batch.clear()
    print(f"  ... {label} 已写入 {count} 条")


# ── 各类数据导入 ─────────────────────────────────────────────────────────────

async def import_diseases(session, clear=False):
    path = PROCESSED_DIR / "diseases.json"
    if not path.exists():
        print("[跳过] diseases.json 不存在")
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    if clear:
        await _clear(session, Disease)

    count, batch = 0, []
    for item in data:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        obj = Disease(
            name=name,
            icd_code=item.get("icd_code") or None,
            alias=item.get("alias") or [],
            department=item.get("department") or None,
            system=item.get("system") or None,
            overview=item.get("overview") or None,
            definition=item.get("definition") or None,
            pathogenesis=item.get("pathogenesis") or None,
            etiology=item.get("etiology") or None,
            symptoms=item.get("symptoms") or None,
            diagnosis_criteria=item.get("diagnosis_criteria") or None,
            differential_diagnosis=item.get("differential_diagnosis") or None,
            complications=item.get("complications") or None,
            treatment=item.get("treatment") or None,
            prognosis=item.get("prognosis") or None,
            prevention=item.get("prevention") or None,
            related_drug_ids=[],
            related_exam_ids=[],
            related_guideline_ids=[],
            is_published=True,
        )
        batch.append(obj)
        count += 1
        if len(batch) >= BATCH:
            await _flush(session, batch, "疾病", count)
    if batch:
        await _flush(session, batch, "疾病", count)
    print(f"[完成] 疾病导入：{count} 条")
    return count


async def import_drugs(session, clear=False):
    path = PROCESSED_DIR / "drugs.json"
    if not path.exists():
        print("[跳过] drugs.json 不存在")
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    if clear:
        await _clear(session, Drug)

    count, batch = 0, []
    for item in data:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        obj = Drug(
            name=name,
            trade_name=item.get("trade_name") or None,
            category=item.get("category") or None,
            indications=item.get("indications") or None,
            dosage=item.get("dosage") or None,
            contraindications=item.get("contraindications") or None,
            interactions=item.get("interactions") or None,
            adverse_reactions=item.get("adverse_reactions") or None,
            special_population=item.get("special_population") or None,
            is_published=True,
        )
        batch.append(obj)
        count += 1
        if len(batch) >= BATCH:
            await _flush(session, batch, "药品", count)
    if batch:
        await _flush(session, batch, "药品", count)
    print(f"[完成] 药品导入：{count} 条")
    return count


async def import_exams(session, clear=False):
    path = PROCESSED_DIR / "exams.json"
    if not path.exists():
        print("[跳过] exams.json 不存在")
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    if clear:
        await _clear(session, Exam)

    count, batch = 0, []
    for item in data:
        name = (item.get("name") or "").strip()
        if not name:
            continue
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
        count += 1
        if len(batch) >= BATCH:
            await _flush(session, batch, "检验检查", count)
    if batch:
        await _flush(session, batch, "检验检查", count)
    print(f"[完成] 检验检查导入：{count} 条")
    return count


async def import_guidelines(session, clear=False):
    path = PROCESSED_DIR / "guidelines.json"
    if not path.exists():
        print("[跳过] guidelines.json 不存在")
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    if clear:
        await _clear(session, Guideline)

    count, batch = 0, []
    for item in data:
        title = (item.get("title") or "").strip()
        if not title:
            continue
        obj = Guideline(
            title=title,
            organization=item.get("issuer") or item.get("organization") or None,
            publish_year=_extract_year(item.get("publish_date") or item.get("publish_year")),
            department=item.get("category") or None,
            disease_tags=item.get("keywords") or [],
            summary=item.get("abstract") or item.get("summary") or None,
            content=item.get("full_text") or item.get("content") or None,
            file_url=item.get("pdf_url") or item.get("file_url") or None,
            is_published=True,
        )
        batch.append(obj)
        count += 1
        if len(batch) >= BATCH:
            await _flush(session, batch, "指南", count)
    if batch:
        await _flush(session, batch, "指南", count)
    print(f"[完成] 临床指南导入：{count} 条")
    return count


async def import_formulas(session, clear=False):
    path = PROCESSED_DIR / "formulas.json"
    if not path.exists():
        print("[跳过] formulas.json 不存在")
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    if clear:
        await _clear(session, Formula)

    count, batch = 0, []
    for item in data:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        # interpretation 字段：原始数据可能是字符串或列表
        interp_raw = item.get("interpretation") or item.get("interpretation_rules") or []
        if isinstance(interp_raw, str) and interp_raw:
            interp_rules = [{"text": interp_raw}]
        elif isinstance(interp_raw, list):
            interp_rules = interp_raw
        else:
            interp_rules = []

        obj = Formula(
            name=name,
            category=item.get("category") or None,
            description=item.get("description") or None,
            formula_expr=item.get("formula_expr") or None,
            reference=item.get("clinical_use") or item.get("reference") or None,
            department=item.get("department") or None,
            parameters=item.get("parameters") or [],
            interpretation_rules=interp_rules,
            is_published=True,
        )
        batch.append(obj)
        count += 1
        if len(batch) >= BATCH:
            await _flush(session, batch, "公式", count)
    if batch:
        await _flush(session, batch, "公式", count)
    print(f"[完成] 医学公式导入：{count} 条")
    return count


async def import_assessments(session, clear=False):
    path = PROCESSED_DIR / "assessments.json"
    if not path.exists():
        print("[跳过] assessments.json 不存在")
        return 0
    data = json.loads(path.read_text(encoding="utf-8"))
    if clear:
        await _clear(session, Assessment)

    count, batch = 0, []
    for item in data:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        obj = Assessment(
            name=name,
            description=item.get("description") or None,
            department=item.get("category") or item.get("department") or None,
            questions=item.get("questions") or [],
            scoring_rules=item.get("scoring_rules") or [],
            is_published=True,
        )
        batch.append(obj)
        count += 1
        if len(batch) >= BATCH:
            await _flush(session, batch, "量表", count)
    if batch:
        await _flush(session, batch, "量表", count)
    print(f"[完成] 量表导入：{count} 条")
    return count


# ── 主函数 ───────────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(description="CDSS 知识库数据导入")
    parser.add_argument("--diseases",    action="store_true", help="导入疾病库")
    parser.add_argument("--drugs",       action="store_true", help="导入药品库")
    parser.add_argument("--exams",       action="store_true", help="导入检验检查库")
    parser.add_argument("--guidelines",  action="store_true", help="导入临床指南库")
    parser.add_argument("--formulas",    action="store_true", help="导入医学公式库")
    parser.add_argument("--assessments", action="store_true", help="导入量表库")
    parser.add_argument("--clear",       action="store_true", help="导入前先清空对应表")
    args = parser.parse_args()

    run_all = not any([
        args.diseases, args.drugs, args.exams,
        args.guidelines, args.formulas, args.assessments,
    ])

    await init_db()

    async with AsyncSessionLocal() as session:
        total = 0
        if run_all or args.diseases:
            total += await import_diseases(session, clear=args.clear)
        if run_all or args.drugs:
            total += await import_drugs(session, clear=args.clear)
        if run_all or args.exams:
            total += await import_exams(session, clear=args.clear)
        if run_all or args.guidelines:
            total += await import_guidelines(session, clear=args.clear)
        if run_all or args.formulas:
            total += await import_formulas(session, clear=args.clear)
        if run_all or args.assessments:
            total += await import_assessments(session, clear=args.clear)

    print(f"\n✅ 导入完成，共 {total} 条记录")
    print("   注：literature_dynamic / literature_cases / sanji 由 Elasticsearch 自动索引，无需手动导入")


if __name__ == "__main__":
    asyncio.run(main())
