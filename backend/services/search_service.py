from typing import List
from db.elasticsearch.indices import es
from schemas.search import SearchResultItem, SearchResponse


class SearchService:
    async def search(self, keyword: str, types: List[str] = None, page: int = 1, page_size: int = 20) -> SearchResponse:
        """
        跨库全文检索
        types: 过滤范围，如 ["disease", "drug"]，None 表示全库
        """
        indices_map = {
            "disease":   "cdss_diseases",
            "drug":      "cdss_drugs",
            "exam":      "cdss_exams",
            "guideline": "cdss_guidelines",
        }

        if types:
            indices = [indices_map[t] for t in types if t in indices_map]
        else:
            indices = list(indices_map.values())

        if not indices:
            return SearchResponse(query=keyword, total=0, items=[])

        query = {
            "from": (page - 1) * page_size,
            "size": page_size,
            "query": {
                "multi_match": {
                    "query": keyword,
                    "fields": ["name^3", "title^3", "alias^2", "trade_name^2",
                               "icd_code^2", "overview", "summary", "description",
                               "indications", "symptoms", "clinical_significance"],
                    "type": "best_fields",
                }
            },
            "highlight": {
                "fields": {
                    "name": {},
                    "title": {},
                    "overview": {"fragment_size": 100, "number_of_fragments": 1},
                    "summary": {"fragment_size": 100, "number_of_fragments": 1},
                }
            },
            "aggs": {
                "by_type": {"terms": {"field": "type"}}
            }
        }

        resp = await es.search(index=",".join(indices), body=query)
        hits = resp["hits"]
        total = hits["total"]["value"]

        items: List[SearchResultItem] = []
        for hit in hits["hits"]:
            src = hit["_source"]
            highlights = hit.get("highlight", {})
            snippet_fields = ["overview", "summary", "description", "indications"]
            snippet = ""
            for f in snippet_fields:
                if f in highlights:
                    snippet = highlights[f][0]
                    break

            items.append(SearchResultItem(
                id=src["id"],
                name=src.get("name") or src.get("title", ""),
                type=src.get("type", ""),
                snippet=snippet,
                department=src.get("department"),
                score=hit["_score"],
            ))

        facets = {}
        if "aggregations" in resp:
            for bucket in resp["aggregations"]["by_type"]["buckets"]:
                facets[bucket["key"]] = bucket["doc_count"]

        return SearchResponse(query=keyword, total=total, items=items, facets=facets)
