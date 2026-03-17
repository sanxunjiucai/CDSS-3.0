from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.common import Response
from services.system_config_service import SystemConfigService

router = APIRouter()


@router.get("/config/nav", summary="获取前端导航配置")
async def get_nav_config(session: AsyncSession = Depends(get_db)):
    service = SystemConfigService(session)
    return Response.ok(await service.get_nav_config())


@router.get("/config/search", summary="获取检索权重配置")
async def get_search_config(session: AsyncSession = Depends(get_db)):
    service = SystemConfigService(session)
    return Response.ok(await service.get_search_weights())
