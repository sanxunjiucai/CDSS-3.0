from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Optional


BASE_DIR = Path(__file__).parent.parent.parent
PROCESSED_DIR = BASE_DIR / "scrapers" / "data" / "processed"
SANJI_PATH = PROCESSED_DIR / "sanji.json"


def _to_text(v) -> str:
    if isinstance(v, list):
        return "\n".join(str(i) for i in v if i is not None)
    return str(v or "")


def _detect_domain(item: dict) -> str:
    raw = str(item.get("domain") or "").strip().lower()
    if raw in {"clinical", "nursing", "imaging"}:
        return raw
    text = " ".join([
        _to_text(item.get("source")),
        _to_text(item.get("category")),
        _to_text(item.get("subcategory")),
        _to_text(item.get("name")),
    ])
    if "护理" in text:
        return "nursing"
    if "影像" in text or "检验" in text:
        return "imaging"
    return "clinical"


@lru_cache(maxsize=1)
def _load_items() -> list[dict]:
    if not SANJI_PATH.exists():
        return []
    try:
        raw = json.loads(SANJI_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    if not isinstance(raw, list):
        return []
    items = []
    for idx, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or item.get("name") or "").strip()
        if not title:
            continue
        items.append({
            "id": idx,
            "title": title,
            "name": title,
            "domain": _detect_domain(item),
            "category": item.get("category"),
            "tag": item.get("subcategory"),
            "difficulty": item.get("difficulty"),
            "content": item.get("content"),
            "key_points": _to_text(item.get("key_points")),
            "question": item.get("question"),
            "answer": item.get("answer"),
            "source": item.get("source"),
        })
    return items


class SanjiService:
    def list(
        self,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        domain: Optional[str] = None,
    ):
        items = _load_items()
        if q:
            kw = q.lower().strip()
            items = [
                i for i in items
                if kw in str(i.get("title") or "").lower()
                or kw in str(i.get("content") or "").lower()
                or kw in str(i.get("tag") or "").lower()
            ]
        if domain:
            d = domain.lower().strip()
            items = [i for i in items if str(i.get("domain") or "").lower() == d]
        total = len(items)
        start = (page - 1) * page_size
        end = start + page_size
        return items[start:end], total

    def detail(self, item_id: int):
        items = _load_items()
        for item in items:
            if item.get("id") == item_id:
                return item
        return None

    @staticmethod
    def clear_cache():
        _load_items.cache_clear()
