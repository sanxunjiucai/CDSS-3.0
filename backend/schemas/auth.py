from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # 秒


class UserInfo(BaseModel):
    id: str
    username: str
    role: str
    display_name: Optional[str] = None
