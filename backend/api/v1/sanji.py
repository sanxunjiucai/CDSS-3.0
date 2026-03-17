from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from schemas.common import PaginatedData, Response
from services.sanji_service import SanjiService

router = APIRouter()


@router.get("/sanji", summary="三基知识列表")
async def list_sanji(
    q: Optional[str] = Query(None, description="关键词"),
    domain: Optional[str] = Query(None, description="领域过滤：clinical/nursing/imaging"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    size: Optional[int] = Query(None, ge=1, le=500),
):
    service = SanjiService()
    effective_page_size = size if size is not None else page_size
    items, total = service.list(page=page, page_size=effective_page_size, q=q, domain=domain)
    total_pages = (total + effective_page_size - 1) // effective_page_size if total > 0 else 1
    return Response.ok(PaginatedData(
        items=items,
        total=total,
        page=page,
        page_size=effective_page_size,
        total_pages=total_pages,
    ))


@router.get("/sanji/{item_id}", summary="三基知识详情")
async def get_sanji_detail(item_id: int):
    service = SanjiService()
    item = service.detail(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="内容不存在")
    return Response.ok(item)
