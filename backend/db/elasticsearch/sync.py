"""
PostgreSQL → Elasticsearch 同步工具
用于将知识库数据同步到 ES 索引，供全文检索使用
ES 不可用时静默降级，不影响主业务。
"""
import logging
from db.elasticsearch.indices import es
from db.models.disease import Disease
from db.models.drug import Drug
from db.models.exam import Exam
from db.models.guideline import Guideline

logger = logging.getLogger(__name__)


async def sync_disease(disease: Disease):
    try:
        await es.index(
            index="cdss_diseases",
            id=str(disease.id),
            document={
                "id": str(disease.id),
                "name": disease.name,
                "icd_code": disease.icd_code,
                "alias": disease.alias,
                "department": disease.department,
                "system": disease.system,
                "overview": disease.overview,
                "definition": disease.definition,
                "pathogenesis": disease.pathogenesis,
                "symptoms": disease.symptoms,
                "diagnosis_criteria": disease.diagnosis_criteria,
                "differential_diagnosis": disease.differential_diagnosis,
                "complications": disease.complications,
                "treatment": disease.treatment,
                "prognosis": disease.prognosis,
                "prevention": disease.prevention,
                "type": "disease",
                "updated_at": disease.updated_at.isoformat() if disease.updated_at else None,
            },
        )
    except Exception as e:
        logger.warning(f"[ES] sync_disease 失败（降级）: {e}")


async def sync_drug(drug: Drug):
    try:
        await es.index(
            index="cdss_drugs",
            id=str(drug.id),
            document={
                "id": str(drug.id),
                "name": drug.name,
                "trade_name": drug.trade_name,
                "category": drug.category,
                "indications": drug.indications,
                "type": "drug",
                "updated_at": drug.updated_at.isoformat() if drug.updated_at else None,
            },
        )
    except Exception as e:
        logger.warning(f"[ES] sync_drug 失败（降级）: {e}")


async def sync_exam(exam: Exam):
    try:
        await es.index(
            index="cdss_exams",
            id=str(exam.id),
            document={
                "id": str(exam.id),
                "name": exam.name,
                "code": exam.code,
                "exam_type": exam.type,
                "description": exam.description,
                "clinical_significance": exam.clinical_significance,
                "type": "exam",
                "updated_at": exam.updated_at.isoformat() if exam.updated_at else None,
            },
        )
    except Exception as e:
        logger.warning(f"[ES] sync_exam 失败（降级）: {e}")


async def sync_guideline(guideline: Guideline):
    try:
        await es.index(
            index="cdss_guidelines",
            id=str(guideline.id),
            document={
                "id": str(guideline.id),
                "title": guideline.title,
                "organization": guideline.organization,
                "department": guideline.department,
                "summary": guideline.summary,
                "type": "guideline",
                "updated_at": guideline.updated_at.isoformat() if guideline.updated_at else None,
            },
        )
    except Exception as e:
        logger.warning(f"[ES] sync_guideline 失败（降级）: {e}")
