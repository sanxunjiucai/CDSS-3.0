from fastapi import APIRouter
from schemas.common import Response

router = APIRouter()


@router.get("/config/nav", summary="获取导航分类配置")
async def get_nav_config():
    # TODO: 从数据库读取导航配置
    return Response.ok({
        "categories": [
            {"key": "disease", "label": "疾病知识", "icon": "medical"},
            {"key": "drug", "label": "药品库", "icon": "pill"},
            {"key": "exam", "label": "检验检查", "icon": "lab"},
            {"key": "guideline", "label": "临床指南", "icon": "book"},
        ]
    })


@router.put("/config/nav", summary="更新导航分类配置")
async def update_nav_config(config: dict):
    # TODO: 保存到数据库
    return Response.ok(None, "配置已保存")
