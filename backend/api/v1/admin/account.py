"""
管理端 - 用户账号管理
完整 CRUD + 重置密码
"""
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from db.database import get_db
from db.repositories.user_repo import UserRepository
from db.models.user import User
from schemas.common import Response
from core.security import get_password_hash
from core.pagination import PaginationParams

router = APIRouter()


# ── 请求/响应 Schema ────────────────────────────────────────

class UserCreateRequest(BaseModel):
    username: str
    password: str
    display_name: str = ""
    role: str = "user"


class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str


def _serialize(u: User) -> dict:
    return {
        "id":           str(u.id),
        "username":     u.username,
        "display_name": u.display_name or "",
        "role":         u.role,
        "is_active":    u.is_active,
        "created_at":   u.created_at.isoformat() if u.created_at else None,
    }


# ── 接口 ────────────────────────────────────────────────────

@router.get("/users", summary="用户列表")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="按用户名/姓名搜索"),
    session: AsyncSession = Depends(get_db),
):
    repo = UserRepository(session)
    params = PaginationParams(page=page, page_size=page_size)
    items, total = await repo.get_list_with_search(
        offset=params.offset, limit=params.page_size, q=q or None
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return Response.ok({
        "items":       [_serialize(u) for u in items],
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": total_pages,
    })


@router.get("/users/{user_id}", summary="用户详情")
async def get_user(user_id: UUID, session: AsyncSession = Depends(get_db)):
    repo = UserRepository(session)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return Response.ok(_serialize(user))


@router.post("/users", summary="新增用户")
async def create_user(data: UserCreateRequest, session: AsyncSession = Depends(get_db)):
    repo = UserRepository(session)
    # 用户名唯一检查
    existing = await repo.get_by_username(data.username)
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = User(
        username=data.username,
        hashed_password=get_password_hash(data.password),
        display_name=data.display_name,
        role=data.role,
    )
    saved = await repo.create(user)
    return Response.ok(_serialize(saved))


@router.put("/users/{user_id}", summary="更新用户信息")
async def update_user(
    user_id: UUID,
    data: UserUpdateRequest,
    session: AsyncSession = Depends(get_db),
):
    repo = UserRepository(session)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if data.display_name is not None:
        user.display_name = data.display_name
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    updated = await repo.update(user)
    return Response.ok(_serialize(updated))


@router.delete("/users/{user_id}", summary="删除用户")
async def delete_user(user_id: UUID, session: AsyncSession = Depends(get_db)):
    repo = UserRepository(session)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    await repo.delete(user)
    return Response.ok(None, "删除成功")


@router.post("/users/{user_id}/reset-password", summary="重置用户密码")
async def reset_password(
    user_id: UUID,
    data: ResetPasswordRequest,
    session: AsyncSession = Depends(get_db),
):
    if not data.new_password or len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="密码长度不能少于6位")
    repo = UserRepository(session)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.hashed_password = get_password_hash(data.new_password)
    await repo.update(user)
    return Response.ok(None, "密码重置成功")
