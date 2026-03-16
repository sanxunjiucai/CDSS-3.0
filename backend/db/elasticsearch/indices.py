from elasticsearch import AsyncElasticsearch
from config import settings

es = AsyncElasticsearch(settings.es_url)

# 索引定义（支持中文 IK 分词）
INDEX_MAPPINGS = {
    "cdss_diseases": {
        "mappings": {
            "properties": {
                "id":         {"type": "keyword"},
                "name":       {"type": "text", "analyzer": "ik_max_word", "search_analyzer": "ik_smart"},
                "icd_code":   {"type": "keyword"},
                "alias":      {"type": "text", "analyzer": "ik_max_word"},
                "department": {"type": "keyword"},
                "system":     {"type": "keyword"},
                "overview":   {"type": "text", "analyzer": "ik_max_word"},
                "definition": {"type": "text", "analyzer": "ik_max_word"},
                "pathogenesis": {"type": "text", "analyzer": "ik_max_word"},
                "symptoms":   {"type": "text", "analyzer": "ik_max_word"},
                "diagnosis_criteria": {"type": "text", "analyzer": "ik_max_word"},
                "differential_diagnosis": {"type": "text", "analyzer": "ik_max_word"},
                "complications": {"type": "text", "analyzer": "ik_max_word"},
                "treatment": {"type": "text", "analyzer": "ik_max_word"},
                "prognosis": {"type": "text", "analyzer": "ik_max_word"},
                "prevention": {"type": "text", "analyzer": "ik_max_word"},
                "type":       {"type": "keyword"},  # "disease"
                "updated_at": {"type": "date"},
            }
        }
    },
    "cdss_drugs": {
        "mappings": {
            "properties": {
                "id":           {"type": "keyword"},
                "name":         {"type": "text", "analyzer": "ik_max_word", "search_analyzer": "ik_smart"},
                "trade_name":   {"type": "text", "analyzer": "ik_max_word"},
                "category":     {"type": "keyword"},
                "indications":  {"type": "text", "analyzer": "ik_max_word"},
                "type":         {"type": "keyword"},  # "drug"
                "updated_at":   {"type": "date"},
            }
        }
    },
    "cdss_exams": {
        "mappings": {
            "properties": {
                "id":                    {"type": "keyword"},
                "name":                  {"type": "text", "analyzer": "ik_max_word", "search_analyzer": "ik_smart"},
                "code":                  {"type": "keyword"},
                "exam_type":             {"type": "keyword"},
                "description":           {"type": "text", "analyzer": "ik_max_word"},
                "clinical_significance": {"type": "text", "analyzer": "ik_max_word"},
                "type":                  {"type": "keyword"},  # "exam"
                "updated_at":            {"type": "date"},
            }
        }
    },
    "cdss_guidelines": {
        "mappings": {
            "properties": {
                "id":           {"type": "keyword"},
                "title":        {"type": "text", "analyzer": "ik_max_word", "search_analyzer": "ik_smart"},
                "organization": {"type": "keyword"},
                "department":   {"type": "keyword"},
                "summary":      {"type": "text", "analyzer": "ik_max_word"},
                "type":         {"type": "keyword"},  # "guideline"
                "updated_at":   {"type": "date"},
            }
        }
    },
}


async def init_es_indices():
    """初始化 Elasticsearch 索引（已存在则跳过，ES 不可用时降级警告）"""
    try:
        for index_name, body in INDEX_MAPPINGS.items():
            exists = await es.indices.exists(index=index_name)
            if not exists:
                await es.indices.create(index=index_name, body=body)
                print(f"[ES] 创建索引: {index_name}")
            else:
                print(f"[ES] 索引已存在: {index_name}")
    except Exception as e:
        print(f"[ES] 警告：Elasticsearch 不可用，跳过索引初始化 ({e})")
