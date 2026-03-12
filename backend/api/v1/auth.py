from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.repositories.user_repo import UserRepository
from schemas.auth import LoginRequest, TokenResponse, UserInfo
from schemas.common import Response
from core.security import verify_password, create_access_token
from config import settings

router = APIRouter()


@router.post("/auth/login", response_model=Response[TokenResponse], summary="用户登录")
async def login(data: LoginRequest, session: AsyncSession = Depends(get_db)):
    repo = UserRepository(session)
    user = await repo.get_by_username(data.username)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return Response.ok(TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    ))


@router.get("/auth/me", response_model=Response[UserInfo], summary="获取当前用户信息")
async def get_me(session: AsyncSession = Depends(get_db)):
    # 实际使用时加 Depends(get_current_user)
    return Response.ok(UserInfo(id="", username="", role="admin"))
