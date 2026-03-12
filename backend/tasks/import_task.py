"""
知识库批量导入 Celery 任务
支持 Excel (.xlsx) 和 JSON 格式
"""
import json
from typing import List
from tasks.celery_app import celery_app


@celery_app.task(bind=True, name="tasks.import_diseases")
def import_diseases_task(self, rows: List[dict]):
    """
    异步导入疾病数据
    rows: [{"name": "...", "icd_code": "...", "department": "...", ...}]
    """
    success = 0
    failed = 0
    errors = []

    for i, row in enumerate(rows):
        try:
            # TODO: 调用 DiseaseService.create（需在同步上下文中使用 asyncio.run）
            success += 1
        except Exception as e:
            failed += 1
            errors.append({"row": i + 1, "error": str(e)})

        # 更新任务进度
        self.update_state(
            state="PROGRESS",
            meta={"current": i + 1, "total": len(rows), "success": success, "failed": failed},
        )

    return {"success": success, "failed": failed, "errors": errors}


@celery_app.task(name="tasks.import_drugs")
def import_drugs_task(rows: List[dict]):
    """异步导入药品数据"""
    # TODO: 实现药品批量导入
    pass


@celery_app.task(name="tasks.import_exams")
def import_exams_task(rows: List[dict]):
    """异步导入检验检查数据"""
    # TODO: 实现检验检查批量导入
    pass
