from typing import TypeVar, Generic, Optional, Any
from pydantic import BaseModel

T = TypeVar("T")


class Response(BaseModel, Generic[T]):
    """统一响应格式"""
    code: int = 200
    message: str = "success"
    data: Optional[T] = None

    @classmethod
    def ok(cls, data: T = None, message: str = "success"):
        return cls(code=200, message=message, data=data)

    @classmethod
    def fail(cls, code: int, message: str):
        return cls(code=code, message=message, data=None)


class PaginatedData(BaseModel, Generic[T]):
    """分页数据"""
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int
