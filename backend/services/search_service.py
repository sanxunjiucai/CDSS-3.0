from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, text

from db.models.disease import Disease
from db.models.drug import Drug
from db.models.exam import Exam
from db.models.formula import Formula
from db.models.assessment import Assessment
from db.models.guideline import Guideline
from schemas.search import SearchResultItem, SearchResponse
from services.literature_service import LiteratureService


class SearchService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def search(
        self,
        keyword: str,
        types: Optional[List[str]] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> SearchResponse:
        """跨库全文检索（PostgreSQL ILIKE 实现，不依赖 Elasticsearch）"""
        pattern = f"%{keyword}%"
        offset = (page - 1) * page_size

        # 决定要搜哪些类型
        search_types = types if types else ["disease", "drug", "exam", "guideline", "formula", "assessment", "literature", "case"]

        all_items: List[SearchResultItem] = []
        facets: dict = {}

        # ── 疾病 ──────────────────────────────────────────────────
        if "disease" in search_types:
            where = or_(
                Disease.name.ilike(pattern),
                Disease.icd_code.ilike(pattern),
                Disease.overview.ilike(pattern),
                Disease.symptoms.ilike(pattern),
            )
            cnt = await self.session.execute(
                select(func.count()).select_from(Disease).where(where)
            )
            disease_total = cnt.scalar() or 0
            facets["disease"] = disease_total

            rows = await self.session.execute(
                select(Disease).where(where).offset(offset).limit(page_size)
            )
            for d in rows.scalars():
                snippet = ""
                for field in [d.overview, d.symptoms, d.etiology]:
                    if field:
                        snippet = field[:120] + ("…" if len(field) > 120 else "")
                        break
                all_items.append(SearchResultItem(
                    id=str(d.id),
                    name=d.name,
                    type="disease",
                    snippet=snippet,
                    department=d.department,
                    score=_score(keyword, d.name),
                ))

        # ── 药品 ──────────────────────────────────────────────────
        if "drug" in search_types:
            where = or_(
                Drug.name.ilike(pattern),
                Drug.trade_name.ilike(pattern),
                Drug.indications.ilike(pattern),
            )
            cnt = await self.session.execute(
                select(func.count()).select_from(Drug).where(where)
            )
            drug_total = cnt.scalar() or 0
            facets["drug"] = drug_total

            rows = await self.session.execute(
                select(Drug).where(where).offset(offset).limit(page_size)
            )
            for d in rows.scalars():
                snippet = ""
                for field in [d.indications, d.dosage]:
                    if field:
                        snippet = field[:120] + ("…" if len(field) > 120 else "")
                        break
                all_items.append(SearchResultItem(
                    id=str(d.id),
                    name=d.name,
                    type="drug",
                    snippet=snippet,
                    department=d.category,
                    score=_score(keyword, d.name),
                ))

        # ── 检验检查 ──────────────────────────────────────────────
        if "exam" in search_types:
            where = or_(
                Exam.name.ilike(pattern),
                Exam.code.ilike(pattern),
                Exam.clinical_significance.ilike(pattern),
            )
            cnt = await self.session.execute(
                select(func.count()).select_from(Exam).where(where)
            )
            exam_total = cnt.scalar() or 0
            facets["exam"] = exam_total

            rows = await self.session.execute(
                select(Exam).where(where).offset(offset).limit(page_size)
            )
            for e in rows.scalars():
                snippet = ""
                for field in [e.clinical_significance, e.description]:
                    if field:
                        snippet = field[:120] + ("…" if len(field) > 120 else "")
                        break
                all_items.append(SearchResultItem(
                    id=str(e.id),
                    name=e.name,
                    type="exam",
                    snippet=snippet,
                    department=e.type,
                    score=_score(keyword, e.name),
                ))

        # ── 临床指南 ──────────────────────────────────────────────
        if "guideline" in search_types:
            where = or_(
                Guideline.title.ilike(pattern),
                Guideline.organization.ilike(pattern),
                Guideline.summary.ilike(pattern),
            )
            cnt = await self.session.execute(
                select(func.count()).select_from(Guideline).where(where)
            )
            guideline_total = cnt.scalar() or 0
            facets["guideline"] = guideline_total

            rows = await self.session.execute(
                select(Guideline).where(where).offset(offset).limit(page_size)
            )
            for g in rows.scalars():
                snippet = ""
                for field in [g.summary, g.organization]:
                    if field:
                        snippet = field[:120] + ("…" if len(field) > 120 else "")
                        break
                all_items.append(SearchResultItem(
                    id=str(g.id),
                    name=g.title,
                    type="guideline",
                    snippet=snippet,
                    department=g.department,
                    score=_score(keyword, g.title),
                ))

        # ── 医学公式 ──────────────────────────────────────────────
        if "formula" in search_types:
            where = or_(
                Formula.name.ilike(pattern),
                Formula.description.ilike(pattern),
            )
            cnt = await self.session.execute(
                select(func.count()).select_from(Formula).where(where)
            )
            formula_total = cnt.scalar() or 0
            facets["formula"] = formula_total

            rows = await self.session.execute(
                select(Formula).where(where).offset(offset).limit(page_size)
            )
            for f in rows.scalars():
                snippet = ""
                for field in [f.description, f.formula_expr]:
                    if field:
                        snippet = field[:120] + ("…" if len(field) > 120 else "")
                        break
                all_items.append(SearchResultItem(
                    id=str(f.id),
                    name=f.name,
                    type="formula",
                    snippet=snippet,
                    department=f.category,
                    score=_score(keyword, f.name),
                ))

        # ── 评估量表 ──────────────────────────────────────────────
        if "assessment" in search_types:
            where = or_(
                Assessment.name.ilike(pattern),
                Assessment.description.ilike(pattern),
            )
            cnt = await self.session.execute(
                select(func.count()).select_from(Assessment).where(where)
            )
            assessment_total = cnt.scalar() or 0
            facets["assessment"] = assessment_total

            rows = await self.session.execute(
                select(Assessment).where(where).offset(offset).limit(page_size)
            )
            for a in rows.scalars():
                snippet = a.description[:120] + ("…" if a.description and len(a.description) > 120 else "") if a.description else ""
                all_items.append(SearchResultItem(
                    id=str(a.id),
                    name=a.name,
                    type="assessment",
                    snippet=snippet,
                    department=a.department,
                    score=_score(keyword, a.name),
                ))

        literature_service = LiteratureService()

        if "literature" in search_types:
            literature_items = literature_service.search("literature", keyword)
            facets["literature"] = len(literature_items)
            for item in literature_items:
                title = item.get("title") or ""
                abstract = item.get("abstract") or ""
                all_items.append(SearchResultItem(
                    id=item.get("id") or "",
                    name=title,
                    type="literature",
                    snippet=abstract[:120] + ("…" if len(abstract) > 120 else ""),
                    department=item.get("department"),
                    score=_score(keyword, title),
                ))

        if "case" in search_types:
            case_items = literature_service.search("case", keyword)
            facets["case"] = len(case_items)
            for item in case_items:
                title = item.get("title") or ""
                abstract = item.get("abstract") or ""
                all_items.append(SearchResultItem(
                    id=item.get("id") or "",
                    name=title,
                    type="case",
                    snippet=abstract[:120] + ("…" if len(abstract) > 120 else ""),
                    department=item.get("department"),
                    score=_score(keyword, title),
                ))

        # 排序：名称完全匹配 > 名称前缀匹配 > 其他
        all_items.sort(key=lambda x: x.score, reverse=True)

        # 单类型搜索时 total 就是该类型的数量；多类型时取所有 facets 之和
        if len(search_types) == 1:
            total = facets.get(search_types[0], 0)
        else:
            total = sum(facets.values())

        # 多类型时对合并结果做分页截断
        if len(search_types) > 1:
            paged = all_items[offset: offset + page_size]
        else:
            paged = all_items  # 已经在 SQL 层分页

        total_pages = max(1, (total + page_size - 1) // page_size)

        return SearchResponse(
            query=keyword,
            total=total,
            total_pages=total_pages,
            items=paged,
            facets=facets,
        )


def _score(keyword: str, name: str) -> float:
    """简单相关度评分"""
    kw = keyword.lower()
    n = (name or "").lower()
    if n == kw:
        return 3.0
    if n.startswith(kw):
        return 2.0
    if kw in n:
        return 1.5
    return 1.0
