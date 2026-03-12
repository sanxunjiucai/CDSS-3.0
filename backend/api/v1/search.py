from typing import List, Optional
from fastapi import APIRouter, Query
from schemas.search import SearchResponse
from schemas.common import Response
from services.search_service import SearchService

router = APIRouter()


@router.get("/search", response_model=Response[SearchResponse], summary="全局检索")
async def search(
    q: str = Query(..., min_length=1, description="检索关键词"),
    types: Optional[List[str]] = Query(None, description="过滤类型：disease/drug/exam/guideline"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = SearchService()
    result = await service.search(q, types, page, page_size)
    return Response.ok(result)
