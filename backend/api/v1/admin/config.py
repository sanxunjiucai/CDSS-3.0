from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.common import Response
from services.system_config_service import SystemConfigService

router = APIRouter()


@router.get("/config/nav", summary="获取导航分类配置")
async def get_nav_config(session: AsyncSession = Depends(get_db)):
    service = SystemConfigService(session)
    return Response.ok(await service.get_admin_config_bundle())


@router.put("/config/nav", summary="更新导航分类配置")
async def update_nav_config(config: dict, session: AsyncSession = Depends(get_db)):
    service = SystemConfigService(session)
    data = await service.update_admin_config_bundle(config or {})
    return Response.ok(data, "配置已保存")
