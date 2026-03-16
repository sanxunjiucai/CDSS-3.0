from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from schemas.common import PaginatedData, Response
from schemas.literature import LiteratureDetail, LiteratureListItem
from services.literature_service import LiteratureService

router = APIRouter()


def _to_list_item(item: dict) -> LiteratureListItem:
    return LiteratureListItem(
        id=item["id"],
        title=item.get("title") or "",
        type=item.get("type") or "literature",
        department=item.get("department"),
        journal=item.get("journal"),
        publish_year=item.get("publish_year"),
        published_at=item.get("published_at"),
        snippet=item.get("snippet"),
        source_url=item.get("source_url"),
    )


def _to_detail(item: dict) -> LiteratureDetail:
    return LiteratureDetail(
        id=item["id"],
        title=item.get("title") or "",
        type=item.get("type") or "literature",
        department=item.get("department"),
        journal=item.get("journal"),
        publish_year=item.get("publish_year"),
        published_at=item.get("published_at"),
        authors=item.get("authors") or [],
        keywords=item.get("keywords") or [],
        abstract=item.get("abstract"),
        source_url=item.get("source_url"),
        pmc_url=item.get("pmc_url"),
        doi=item.get("doi"),
    )


@router.get("/literature", response_model=Response[PaginatedData[LiteratureListItem]], summary="动态文献库列表")
async def list_literature(
    q: Optional[str] = Query(None, description="关键词"),
    department: Optional[str] = Query(None, description="科室过滤"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = LiteratureService()
    items, total = service.list("literature", page=page, page_size=page_size, q=q, department=department)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return Response.ok(PaginatedData(
        items=[_to_list_item(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    ))


@router.get("/literature/{pmid}", response_model=Response[LiteratureDetail], summary="动态文献详情")
async def get_literature_detail(pmid: str):
    service = LiteratureService()
    item = service.detail("literature", pmid)
    if not item:
        raise HTTPException(status_code=404, detail="文献不存在")
    return Response.ok(_to_detail(item))


@router.get("/cases", response_model=Response[PaginatedData[LiteratureListItem]], summary="案例文献库列表")
async def list_cases(
    q: Optional[str] = Query(None, description="关键词"),
    department: Optional[str] = Query(None, description="科室过滤"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = LiteratureService()
    items, total = service.list("case", page=page, page_size=page_size, q=q, department=department)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return Response.ok(PaginatedData(
        items=[_to_list_item(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    ))


@router.get("/cases/{pmid}", response_model=Response[LiteratureDetail], summary="案例文献详情")
async def get_case_detail(pmid: str):
    service = LiteratureService()
    item = service.detail("case", pmid)
    if not item:
        raise HTTPException(status_code=404, detail="文献不存在")
    return Response.ok(_to_detail(item))
