from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models.user import User
from db.repositories.user_repo import UserRepository
from schemas.common import Response
from core.security import get_password_hash
from pydantic import BaseModel

router = APIRouter()


class CreateUserRequest(BaseModel):
    username: str
    password: str
    display_name: str = ""
    role: str = "admin"


@router.post("/accounts", summary="创建账号")
async def create_account(data: CreateUserRequest, session: AsyncSession = Depends(get_db)):
    repo = UserRepository(session)
    user = User(
        username=data.username,
        hashed_password=get_password_hash(data.password),
        display_name=data.display_name,
        role=data.role,
    )
    saved = await repo.create(user)
    return Response.ok({"id": str(saved.id), "username": saved.username, "role": saved.role})


@router.get("/accounts", summary="账号列表")
async def list_accounts(session: AsyncSession = Depends(get_db)):
    repo = UserRepository(session)
    items, total = await repo.get_list()
    return Response.ok({
        "items": [{"id": str(u.id), "username": u.username,
                   "display_name": u.display_name, "role": u.role,
                   "is_active": u.is_active} for u in items],
        "total": total,
    })
