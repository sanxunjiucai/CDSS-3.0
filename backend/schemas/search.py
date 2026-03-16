from typing import List, Optional
from pydantic import BaseModel


class SearchResultItem(BaseModel):
    id: str
    name: str
    type: str          # disease | drug | exam | guideline
    snippet: str       # 摘要片段（高亮关键词）
    department: Optional[str] = None
    score: float = 0.0


class SearchResponse(BaseModel):
    query: str
    total: int
    total_pages: int = 1
    items: List[SearchResultItem]
    facets: dict = {}  # 分类统计：{"disease": 10, "drug": 5, ...}
