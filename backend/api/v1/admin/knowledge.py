"""
管理端 - 知识库管理接口
支持疾病/药品/检验的 CRUD 和批量导入
"""
from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.disease import DiseaseCreate, DiseaseUpdate, DiseaseDetail
from schemas.drug import DrugCreate, DrugUpdate, DrugDetail
from schemas.exam import ExamCreate, ExamUpdate, ExamDetail
from schemas.common import Response
from services.disease_service import DiseaseService
from services.drug_service import DrugService
from services.exam_service import ExamService

router = APIRouter()

# ── 疾病库管理 ─────────────────────────────────────────

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


@router.post("/diseases/import", summary="批量导入疾病（Excel/JSON）")
async def import_diseases(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    session: AsyncSession = Depends(get_db),
):
    content = await file.read()
    # 异步任务导入，避免超时
    background_tasks.add_task(_import_diseases_task, content, file.filename)
    return Response.ok({"message": "导入任务已提交，请稍后查看结果"})


async def _import_diseases_task(content: bytes, filename: str):
    """后台导入任务（TODO: 接入 Celery）"""
    pass


# ── 药品库管理 ─────────────────────────────────────────

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


# ── 检验检查库管理 ─────────────────────────────────────

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
