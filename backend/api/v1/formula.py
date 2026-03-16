from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from schemas.common import Response
from services.formula_service import FormulaService
from core.pagination import PaginationParams

router = APIRouter()


def _fmt(f):
    return {
        "id":           str(f.id),
        "name":         f.name,
        "category":     f.category,
        "description":  f.description,
        "formula_expr": f.formula_expr,
        "department":   f.department,
        "parameters":   f.parameters or [],
        "interpretation_rules": f.interpretation_rules or [],
    }


@router.get("/formulas", summary="公式列表")
async def list_formulas(
    page:      int            = Query(1, ge=1),
    page_size: int            = Query(20, ge=1, le=100),
    q:         Optional[str]  = Query(None),
    category:  Optional[str]  = Query(None),
    session:   AsyncSession   = Depends(get_db),
):
    svc = FormulaService(session)
    params = PaginationParams(page=page, page_size=page_size)
    items, total = await svc.get_list(params, q=q, category=category)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return Response.ok({
        "items":       [_fmt(f) for f in items],
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": total_pages,
    })


@router.get("/formulas/{formula_id}", summary="公式详情")
async def get_formula(formula_id: UUID, session: AsyncSession = Depends(get_db)):
    svc = FormulaService(session)
    f = await svc.get_detail(formula_id)
    return Response.ok(_fmt(f))


@router.post("/formulas/{formula_id}/calculate", summary="公式计算")
async def calculate_formula(
    formula_id: UUID,
    inputs: dict,
    session: AsyncSession = Depends(get_db),
):
    svc = FormulaService(session)
    result = await svc.calculate(formula_id, inputs)
    return Response.ok(result)
