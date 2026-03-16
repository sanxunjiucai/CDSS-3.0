"""
文献知识库爬虫 —— PubMed / NCBI E-utilities API（免费，无需登录）

输出：
  data/processed/literature_dynamic.json  —— 动态文献库（系统评价/Meta分析/指南）
  data/processed/literature_cases.json    —— 案例文献库（病例报告/病例系列）

检索策略：
  动态文献库：systematic review / meta-analysis / guideline，中国作者，近3年
  案例文献库：case reports，中国作者，近2年
  批量获取摘要+元数据；PMC开放文章附全文链接

API文档：https://www.ncbi.nlm.nih.gov/books/NBK25500/
限速：≤3 req/s（无API key）；注册免费key后可到10 req/s
"""

import re
import json
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional

import requests
from loguru import logger
from tqdm import tqdm

from base_scraper import PROCESSED_DIR, CHECKPOINT_DIR, RAW_DIR

# ── PubMed E-utilities ─────────────────────────────────────────────────────────
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
NCBI_DELAY = 0.4          # ≥ 0.34s → ≤3 req/s（安全阈值留余量）
BATCH_SIZE = 100           # efetch 每批 PMIDs 数量（PubMed 上限 200）
MAX_RECORDS = 5000         # 每次查询最多取多少条

# ── 医学分类推断（英文关键词→中文科室）────────────────────────────────────────
CATEGORY_PATTERNS = [
    (r"cardiovascular|hypertension|heart|cardiac|coronary|atrial fibrillation|arrhythmia", "心血管科"),
    (r"diabetes|insulin|glucose|glycemi|endocrin|thyroid|metabolic|obesity|gout", "内分泌科"),
    (r"respirat|pulmonary|lung|asthma|COPD|pneumonia|bronch|airway", "呼吸科"),
    (r"infect|antibiotic|antimicrobial|sepsis|bacteria|virus|fungal|tuberculosis|HIV", "感染科"),
    (r"gastroint|hepat|liver|pancreat|colitis|intestin|digest|gastric|esophag", "消化科"),
    (r"neurolog|stroke|cerebral|epilepsy|parkinson|alzheimer|dementia|brain", "神经科"),
    (r"cancer|tumor|oncolog|chemotherapy|lymphoma|leukemia|carcinoma|malignant", "肿瘤科"),
    (r"orthoped|fracture|joint|spine|osteoporosis|rheumat|arthritis", "骨科/风湿科"),
    (r"renal|kidney|nephro|dialysis|proteinuria|CKD|glomerulo", "肾内科"),
    (r"hematolog|anemia|thrombos|coagul|platelet|bone marrow|hemophilia", "血液科"),
    (r"obstetri|gynecolog|maternal|pregnan|uterus|ovarian|cervical|breast", "妇产科"),
    (r"pediatr|children|neonat|infant|adolescent", "儿科"),
    (r"critical|ICU|intensive care|mechanical ventilat|sedation|shock", "重症医学"),
    (r"emergency|trauma|poison|resuscitation|acute care", "急诊科"),
    (r"psychiatr|depression|anxiety|schizophren|bipolar|sleep disorder", "精神科"),
    (r"dermatolog|eczema|psoriasis|skin|dermatitis", "皮肤科"),
    (r"ophthalm|eye|cataract|glaucoma|retinal|cornea", "眼科"),
    (r"surgery|anesthes|perioperative|surgical|operative", "外科/麻醉"),
]

# ── 动态文献库检索策略 ─────────────────────────────────────────────────────────
# 系统评价/Meta分析/指南，中国作者，近3年
DYNAMIC_QUERIES = [
    '(systematic review[pt] OR meta-analysis[pt]) AND ("China"[ad] OR "Chinese"[tiab]) AND 2022:2026[dp]',
    '(guideline[pt] OR practice guideline[pt]) AND ("China"[ad] OR "Chinese"[tiab]) AND 2020:2026[dp]',
    '(consensus statement[ti] OR expert consensus[ti]) AND "China"[ad] AND 2021:2026[dp]',
]

# ── 案例文献库检索策略 ─────────────────────────────────────────────────────────
# 病例报告/病例系列，中国作者，近2年
CASE_QUERIES = [
    'case reports[pt] AND ("China"[ad] OR "Chinese"[tiab]) AND 2023:2026[dp]',
    '("case series"[ti] OR "case presentation"[ti]) AND "China"[ad] AND 2023:2026[dp]',
]


class PubmedLiteratureScraper:
    """PubMed文献爬虫：动态文献库 + 案例文献库"""

    NAME = "pubmed_literature"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "CDSSKnowledgeBase/1.0 (contact: cdss@hospital.org; NCBI E-utilities)"
        })

    # ── 公共入口 ───────────────────────────────────────────────────────────────

    def run(self):
        logger.info("=== PubMed文献爬虫开始 ===")

        # 1. 动态文献库
        dynamic_raw = self._fetch_for_queries(DYNAMIC_QUERIES, "dynamic")
        dynamic = self._process(dynamic_raw, article_type="literature")
        self._merge_into_file("literature_dynamic.json", dynamic, key_field="pmid")
        logger.success(f"动态文献库：{len(dynamic)} 条 → literature_dynamic.json")

        # 2. 案例文献库
        case_raw = self._fetch_for_queries(CASE_QUERIES, "cases")
        cases = self._process(case_raw, article_type="case_report")
        self._merge_into_file("literature_cases.json", cases, key_field="pmid")
        logger.success(f"案例文献库：{len(cases)} 条 → literature_cases.json")

        return {"dynamic": len(dynamic), "cases": len(cases)}

    def run_dynamic(self):
        """只运行动态文献库"""
        raw = self._fetch_for_queries(DYNAMIC_QUERIES, "dynamic")
        result = self._process(raw, article_type="literature")
        self._merge_into_file("literature_dynamic.json", result, key_field="pmid")
        logger.success(f"动态文献库完成：{len(result)} 条")
        return result

    def run_cases(self):
        """只运行案例文献库"""
        raw = self._fetch_for_queries(CASE_QUERIES, "cases")
        result = self._process(raw, article_type="case_report")
        self._merge_into_file("literature_cases.json", result, key_field="pmid")
        logger.success(f"案例文献库完成：{len(result)} 条")
        return result

    # ── 检索 PMIDs ─────────────────────────────────────────────────────────────

    def _fetch_for_queries(self, queries: list[str], tag: str) -> list[dict]:
        """执行多条查询，合并去重后批量获取记录"""
        all_pmids: set[str] = set()

        for i, q in enumerate(queries, 1):
            logger.info(f"[{tag}] 查询 {i}/{len(queries)}: {q[:80]}...")
            pmids = self._esearch(q)
            logger.info(f"[{tag}] 命中 {len(pmids)} 条")
            all_pmids.update(pmids)
            time.sleep(NCBI_DELAY)

        logger.info(f"[{tag}] 合并去重后共 {len(all_pmids)} 个PMID")

        # 加载已有缓存
        cache_file = RAW_DIR / f"pubmed_{tag}_raw.json"
        cached: dict[str, dict] = {}
        if cache_file.exists():
            cached_list = json.loads(cache_file.read_text(encoding="utf-8"))
            cached = {r["pmid"]: r for r in cached_list if r.get("pmid")}
            logger.info(f"[{tag}] 已缓存 {len(cached)} 条，跳过重复")

        new_pmids = [p for p in all_pmids if p not in cached]
        logger.info(f"[{tag}] 待获取 {len(new_pmids)} 条新记录")

        # 批量 efetch
        new_records = self._efetch_batch(new_pmids, tag)
        cached.update({r["pmid"]: r for r in new_records if r.get("pmid")})

        # 保存缓存
        all_records = list(cached.values())
        cache_file.write_text(json.dumps(all_records, ensure_ascii=False, indent=2), encoding="utf-8")

        return all_records

    def _esearch(self, term: str, retmax: int = MAX_RECORDS) -> list[str]:
        """用 esearch 检索 PMIDs"""
        url = f"{EUTILS}/esearch.fcgi"
        params = {
            "db": "pubmed",
            "term": term,
            "retmax": retmax,
            "retmode": "json",
            "sort": "relevance",
        }
        try:
            resp = self.session.get(url, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            return data.get("esearchresult", {}).get("idlist", [])
        except Exception as e:
            logger.warning(f"esearch 失败：{e}")
            return []

    # ── 批量获取记录 ───────────────────────────────────────────────────────────

    def _efetch_batch(self, pmids: list[str], tag: str) -> list[dict]:
        """批量 efetch，返回解析后的记录列表"""
        records = []
        total = len(pmids)
        for start in tqdm(range(0, total, BATCH_SIZE), desc=f"efetch [{tag}]"):
            batch = pmids[start:start + BATCH_SIZE]
            try:
                batch_records = self._efetch(batch)
                records.extend(batch_records)
            except Exception as e:
                logger.warning(f"efetch 批次 {start}-{start+len(batch)} 失败：{e}")
            time.sleep(NCBI_DELAY)
        return records

    def _efetch(self, pmids: list[str]) -> list[dict]:
        """获取一批 PMIDs 的 XML 记录并解析"""
        url = f"{EUTILS}/efetch.fcgi"
        params = {
            "db": "pubmed",
            "id": ",".join(pmids),
            "retmode": "xml",
            "rettype": "abstract",
        }
        resp = self.session.get(url, params=params, timeout=60)
        resp.raise_for_status()
        return self._parse_xml(resp.content)

    # ── XML 解析 ───────────────────────────────────────────────────────────────

    def _parse_xml(self, xml_bytes: bytes) -> list[dict]:
        """解析 PubMed XML，提取关键字段"""
        records = []
        try:
            root = ET.fromstring(xml_bytes)
        except ET.ParseError as e:
            logger.warning(f"XML解析错误：{e}")
            return []

        for article in root.findall(".//PubmedArticle"):
            try:
                rec = self._parse_article(article)
                if rec:
                    records.append(rec)
            except Exception as e:
                logger.debug(f"解析单篇文章失败：{e}")

        return records

    def _parse_article(self, article: ET.Element) -> Optional[dict]:
        mc = article.find("MedlineCitation")
        if mc is None:
            return None

        # PMID
        pmid_el = mc.find("PMID")
        pmid = pmid_el.text.strip() if pmid_el is not None else ""
        if not pmid:
            return None

        art = mc.find("Article")
        if art is None:
            return None

        # 标题
        title_el = art.find("ArticleTitle")
        title = self._el_text(title_el)
        if not title:
            return None

        # 期刊
        journal_el = art.find("Journal")
        journal = ""
        pub_date = ""
        if journal_el is not None:
            j_title = journal_el.find("Title")
            journal = self._el_text(j_title)
            ji = journal_el.find("JournalIssue/PubDate")
            if ji is not None:
                year = self._el_text(ji.find("Year"))
                month = self._el_text(ji.find("Month"))
                pub_date = f"{year}-{month}" if month else year

        # 摘要
        abstract_parts = []
        for abs_text in art.findall(".//AbstractText"):
            label = abs_text.get("Label", "")
            text = self._el_text(abs_text)
            if text:
                abstract_parts.append(f"{label}: {text}" if label else text)
        abstract = "\n".join(abstract_parts)[:3000]

        # 作者
        authors = []
        for author in art.findall(".//Author"):
            last = self._el_text(author.find("LastName"))
            fore = self._el_text(author.find("ForeName"))
            if last:
                authors.append(f"{last} {fore}".strip())
        authors = authors[:6]  # 最多6位

        # DOI + PMC
        doi = ""
        pmc_id = ""
        for art_id in mc.findall(".//ArticleId"):
            id_type = art_id.get("IdType", "")
            if id_type == "doi":
                doi = art_id.text.strip() if art_id.text else ""
            elif id_type == "pmc":
                pmc_id = art_id.text.strip() if art_id.text else ""

        # 文章类型
        pub_types = [self._el_text(pt) for pt in art.findall(".//PublicationType")]
        pub_types = [p for p in pub_types if p]

        # 关键词（MeSH + Author keywords）
        keywords = []
        for kw in mc.findall(".//Keyword"):
            t = self._el_text(kw)
            if t:
                keywords.append(t)
        for mh in mc.findall(".//MeshHeading/DescriptorName"):
            t = self._el_text(mh)
            if t and t not in keywords:
                keywords.append(t)
        keywords = keywords[:15]

        # 全文链接
        full_text_url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
        pmc_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmc_id}/" if pmc_id else ""

        return {
            "pmid": pmid,
            "title": title,
            "authors": authors,
            "journal": journal,
            "publish_date": pub_date,
            "abstract": abstract,
            "keywords": keywords,
            "doi": doi,
            "pmc_id": pmc_id,
            "pub_types": pub_types,
            "full_text_url": full_text_url,
            "pmc_full_text_url": pmc_url,
            "source": "PubMed",
        }

    @staticmethod
    def _el_text(el: Optional[ET.Element]) -> str:
        if el is None:
            return ""
        # itertext() 处理带内联标签（如 <i>...</i>）的文本
        return "".join(el.itertext()).strip()

    # ── 数据处理 ───────────────────────────────────────────────────────────────

    def _process(self, raw: list[dict], article_type: str) -> list[dict]:
        """清洗并补充分类"""
        processed = []
        seen_pmids = set()
        for rec in raw:
            pmid = rec.get("pmid", "")
            if not pmid or pmid in seen_pmids:
                continue
            if not rec.get("title") or not rec.get("abstract"):
                continue  # 无摘要的跳过
            seen_pmids.add(pmid)
            category = self._infer_category(rec.get("title", "") + " " + rec.get("abstract", "")[:200])
            processed.append({
                "pmid": pmid,
                "title": rec["title"],
                "authors": rec.get("authors", []),
                "journal": rec.get("journal", ""),
                "publish_date": rec.get("publish_date", ""),
                "abstract": rec.get("abstract", ""),
                "keywords": rec.get("keywords", []),
                "doi": rec.get("doi", ""),
                "pmc_id": rec.get("pmc_id", ""),
                "pub_types": rec.get("pub_types", []),
                "category": category,
                "article_type": article_type,
                "full_text_url": rec.get("full_text_url", ""),
                "pmc_full_text_url": rec.get("pmc_full_text_url", ""),
                "source": "PubMed",
                "data_type": "scraped",
            })
        return processed

    def _infer_category(self, text: str) -> str:
        text_lower = text.lower()
        for pattern, category in CATEGORY_PATTERNS:
            if re.search(pattern, text_lower):
                return category
        return "综合/其他"

    def _merge_into_file(self, filename: str, new_records: list[dict], key_field: str = "pmid"):
        """将新记录合并入已有 JSON 文件（按 key_field 去重）"""
        path = PROCESSED_DIR / filename
        existing = []
        if path.exists():
            existing = json.loads(path.read_text(encoding="utf-8"))

        existing_keys = {r.get(key_field) for r in existing if r.get(key_field)}
        added = 0
        for rec in new_records:
            k = rec.get(key_field)
            if k and k not in existing_keys:
                existing.append(rec)
                existing_keys.add(k)
                added += 1

        path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info(f"[{filename}] 新增 {added} 条，总计 {len(existing)} 条")
        return len(existing)


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    scraper = PubmedLiteratureScraper()
    result = scraper.run()
    print(f"[OK] 动态文献库: {result['dynamic']} 条，案例文献库: {result['cases']} 条")
