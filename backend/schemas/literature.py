from typing import Optional
from pydantic import BaseModel


class LiteratureCreate(BaseModel):
    pmid: str
    title: str
    type: str = "literature"
    department: Optional[str] = None
    journal: Optional[str] = None
    publish_year: Optional[int] = None
    published_at: Optional[str] = None
    authors: Optional[str] = None
    keywords: Optional[str] = None
    abstract: Optional[str] = None
    source_url: Optional[str] = None
    pmc_url: Optional[str] = None
    doi: Optional[str] = None


class LiteratureUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    department: Optional[str] = None
    journal: Optional[str] = None
    publish_year: Optional[int] = None
    published_at: Optional[str] = None
    authors: Optional[str] = None
    keywords: Optional[str] = None
    abstract: Optional[str] = None
    source_url: Optional[str] = None
    pmc_url: Optional[str] = None
    doi: Optional[str] = None


class LiteratureListItem(BaseModel):
    id: str
    title: str
    type: str
    department: Optional[str] = None
    journal: Optional[str] = None
    publish_year: Optional[int] = None
    published_at: Optional[str] = None
    snippet: Optional[str] = None
    source_url: Optional[str] = None


class LiteratureDetail(BaseModel):
    id: str
    title: str
    type: str
    department: Optional[str] = None
    journal: Optional[str] = None
    publish_year: Optional[int] = None
    published_at: Optional[str] = None
    authors: list[str] = []
    keywords: list[str] = []
    abstract: Optional[str] = None
    source_url: Optional[str] = None
    pmc_url: Optional[str] = None
    doi: Optional[str] = None
