from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Optional


BASE_DIR = Path(__file__).parent.parent.parent
PROCESSED_DIR = BASE_DIR / "scrapers" / "data" / "processed"

_DATA_FILE_MAP = {
    "literature": PROCESSED_DIR / "literature_dynamic.json",
    "case": PROCESSED_DIR / "literature_cases.json",
}


def _safe_year(item: dict) -> int:
    v = item.get("publish_year")
    try:
        return int(v)
    except Exception:
        return 0


def _safe_date(item: dict) -> str:
    return str(item.get("published_at") or item.get("publish_date") or "")


@lru_cache(maxsize=4)
def _load_items(kind: str) -> list[dict]:
    path = _DATA_FILE_MAP[kind]
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    if not isinstance(data, list):
        return []
    normalized = []
    for item in data:
        if not isinstance(item, dict):
            continue
        pmid = str(item.get("pmid") or "").strip()
        title = str(item.get("title") or "").strip()
        if not pmid or not title:
            continue
        normalized.append({
            "id": pmid,
            "pmid": pmid,
            "title": title,
            "type": "literature" if kind == "literature" else "case",
            "department": item.get("department"),
            "journal": item.get("journal"),
            "publish_year": item.get("publish_year"),
            "published_at": item.get("published_at") or item.get("publish_date"),
            "authors": item.get("authors") or [],
            "keywords": item.get("keywords") or [],
            "abstract": item.get("abstract") or item.get("summary"),
            "snippet": item.get("abstract") or item.get("summary"),
            "source_url": item.get("full_text_url") or item.get("source_url"),
            "pmc_url": item.get("pmc_full_text_url") or item.get("pmc_url"),
            "doi": item.get("doi"),
        })
    normalized.sort(key=lambda x: (_safe_year(x), _safe_date(x)), reverse=True)
    return normalized


class LiteratureService:
    def list(
        self,
        kind: str,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        department: Optional[str] = None,
    ):
        items = _load_items(kind)
        if q:
            kw = q.lower().strip()
            items = [
                i for i in items
                if kw in (i.get("title") or "").lower()
                or kw in (i.get("abstract") or "").lower()
                or kw in (i.get("journal") or "").lower()
            ]
        if department:
            dep = department.strip().lower()
            items = [i for i in items if dep in str(i.get("department") or "").lower()]
        total = len(items)
        start = (page - 1) * page_size
        end = start + page_size
        return items[start:end], total

    def detail(self, kind: str, pmid: str) -> Optional[dict]:
        value = str(pmid).strip()
        if not value:
            return None
        for item in _load_items(kind):
            if item.get("id") == value:
                return item
        return None

    def count(self, kind: str) -> int:
        return len(_load_items(kind))

    def search(self, kind: str, keyword: str) -> list[dict]:
        kw = (keyword or "").lower().strip()
        if not kw:
            return []
        items = _load_items(kind)
        return [
            i for i in items
            if kw in (i.get("title") or "").lower()
            or kw in (i.get("abstract") or "").lower()
            or kw in (i.get("journal") or "").lower()
            or any(kw in str(a).lower() for a in (i.get("authors") or []))
        ]

    @staticmethod
    def clear_cache():
        _load_items.cache_clear()
