"""
临床指南知识库爬虫 —— 医脉通指南库
来源：https://guide.medlive.cn
无需登录，摘要+元数据公开可读

策略：
1. 按 language=zh（中文指南）分页遍历，每页 10 条
2. 优先爬取最新的 500 页（约 5000 条最新中文指南）
3. 每条指南获取：标题、发布时间、发布机构、分类、摘要
4. 全文内容需付费，仅采集元数据+摘要（已足够 CDSS 使用）

输出字段（对应 db/models/guideline.py）：
  title, category, issuer, publish_date, abstract,
  keywords, source_journal, source_url
"""

import re
import json
import time
from pathlib import Path
from typing import Optional

from bs4 import BeautifulSoup
from loguru import logger
from tqdm import tqdm

from base_scraper import BaseScraper, RAW_DIR, PROCESSED_DIR, CHECKPOINT_DIR, url_to_key

BASE_URL = "https://guide.medlive.cn"

# 科室/疾病分类关键词映射（从标题推断）
CATEGORY_PATTERNS = [
    (r"心血管|心脏|冠心病|高血压|心力衰竭|心肌|心房|血压|降压|房颤|心律", "心血管科"),
    (r"糖尿病|血糖|胰岛素|内分泌|甲状腺|代谢|肥胖|痛风|尿酸", "内分泌科"),
    (r"呼吸|肺炎|哮喘|慢阻肺|COPD|肺癌|气道|通气|雾化|支气管", "呼吸科"),
    (r"感染|抗菌|抗生素|脓毒症|败血症|病毒|细菌|真菌|HIV|结核", "感染科"),
    (r"消化|胃炎|溃疡|肠炎|肝炎|肝硬化|胰腺|胆囊|结肠|肠道|幽门螺旋", "消化科"),
    (r"神经|脑卒中|中风|癫痫|帕金森|老年痴呆|阿尔茨海默|脑梗|脑出血", "神经科"),
    (r"肿瘤|癌症|化疗|放疗|靶向|免疫治疗|淋巴瘤|白血病|乳腺癌|肺癌", "肿瘤科"),
    (r"骨科|骨折|关节|脊柱|骨质疏松|骨密度|类风湿|风湿", "骨科/风湿科"),
    (r"肾脏|肾炎|肾衰|透析|肾功能|蛋白尿|CKD", "肾内科"),
    (r"血液|贫血|血栓|凝血|白细胞|血小板|骨髓", "血液科"),
    (r"妇产|产科|孕产妇|妊娠|子宫|卵巢|乳腺|宫颈|妇科", "妇产科"),
    (r"儿科|新生儿|儿童|小儿|婴幼儿", "儿科"),
    (r"重症|ICU|危重|机械通气|镇痛镇静|休克|脓毒", "重症医学"),
    (r"急诊|急救|中毒|创伤|急性", "急诊科"),
    (r"精神|抑郁|焦虑|精神分裂|双相|失眠", "精神科"),
    (r"皮肤|湿疹|银屑病|荨麻疹|皮炎", "皮肤科"),
    (r"眼科|白内障|青光眼|视网膜|角膜", "眼科"),
    (r"手术|麻醉|围手术|外科", "外科/麻醉"),
]


class GuidelineScraper(BaseScraper):
    NAME = "guideline"
    REQUEST_DELAY = (1.5, 3.0)

    def __init__(self, max_pages: int = 500):
        super().__init__()
        self.max_pages = max_pages  # 最多爬多少页（每页10条）

    def run(self):
        logger.info("=== 临床指南知识库爬取开始（医脉通指南库）===")

        # Step 1: 收集所有指南 URL（分页遍历）
        guideline_urls = self._collect_guideline_urls()
        logger.info(f"共收集 {len(guideline_urls)} 条指南 URL")

        # Step 2: 爬取每条指南详情
        raw = self._scrape_details(guideline_urls)
        self.save_raw("guidelines_raw.json", raw)

        # Step 3: 清洗
        processed = self._process(raw)
        self.save_processed("guidelines.json", processed)
        return processed

    # ── URL 收集 ────────────────────────────────────────────────────────────

    def _collect_guideline_urls(self) -> list[dict]:
        """分页遍历列表页，收集指南 URL + 基本元数据"""
        cache_path = RAW_DIR / "guideline_urls.json"
        if cache_path.exists():
            with open(cache_path, encoding="utf-8") as f:
                items = json.load(f)
            logger.info(f"从缓存加载 {len(items)} 个指南 URL")
            return items

        items = {}  # url → {title, url, list_meta}

        for page in tqdm(range(1, self.max_pages + 1), desc="收集指南列表"):
            try:
                url = f"{BASE_URL}/guide/filter?language=zh&page={page}"
                resp = self.get(url)
                soup = BeautifulSoup(resp.text, "lxml")
                cards = soup.find_all("a", href=True)
                has_items = False
                for a in cards:
                    title_tag = a.find(class_="guideTitle")
                    if not title_tag:
                        continue
                    href = a.get("href", "").strip()
                    if not href or "/guideline/" not in href:
                        continue
                    title = title_tag.get_text(strip=True)
                    if href not in items:
                        items[href] = {"title": title, "url": href}
                    has_items = True

                if not has_items:
                    logger.info(f"第 {page} 页无内容，停止分页")
                    break

            except Exception as e:
                logger.warning(f"第 {page} 页失败：{e}")

        result = list(items.values())
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        logger.info(f"收集完成，共 {len(result)} 条指南")
        return result

    # ── 详情爬取 ─────────────────────────────────────────────────────────────

    def _scrape_details(self, items: list[dict]) -> list[dict]:
        raw = []
        raw_path = RAW_DIR / "guidelines_raw.json"

        if raw_path.exists():
            with open(raw_path, encoding="utf-8") as f:
                raw = json.load(f)

        done_keys = {d.get("_url_key") for d in raw}

        for item in tqdm(items, desc="爬取指南详情"):
            url = item["url"]
            key = url_to_key(url)
            if key in done_keys or self.is_done(key):
                continue
            try:
                detail = self._parse_guideline_page(url, item.get("title", ""))
                if detail:
                    detail["_url_key"] = key
                    raw.append(detail)
                self.mark_done(key)
            except Exception as e:
                logger.warning(f"跳过 {url}：{e}")
                self.mark_failed(key, str(e))

            if len(raw) % 30 == 0 and raw:
                with open(raw_path, "w", encoding="utf-8") as f:
                    json.dump(raw, f, ensure_ascii=False, indent=2)

        self.flush_checkpoint()
        return raw

    def _parse_guideline_page(self, url: str, hint_title: str = "") -> Optional[dict]:
        resp = self.get(url)
        soup = BeautifulSoup(resp.text, "lxml")

        # 标题
        title_tag = (soup.find(class_="guideTitle") or
                     soup.find(class_="guide-title") or
                     soup.find("h1"))
        title = title_tag.get_text(strip=True) if title_tag else hint_title
        if not title:
            return None

        # 发布时间
        date_tag = soup.find(class_=re.compile(r"date|time|publish", re.I))
        if not date_tag:
            date_tag = soup.find(string=re.compile(r"\d{4}-\d{2}-\d{2}"))
        publish_date = ""
        if date_tag:
            m = re.search(r"\d{4}[-/年]\d{1,2}[-/月]\d{1,2}", date_tag.get_text() if hasattr(date_tag, "get_text") else str(date_tag))
            if m:
                publish_date = m.group(0)
        # fallback: 从标题或内容正则提取年份
        if not publish_date:
            m = re.search(r"(20\d{2})", title)
            if m:
                publish_date = m.group(1)

        # 发布机构
        issuer = ""
        issuer_tag = soup.find(class_=re.compile(r"issuer|organ|publisher|author", re.I))
        if issuer_tag:
            issuer = issuer_tag.get_text(strip=True)
        else:
            # 从摘要提取常见机构名
            body = soup.get_text()
            m = re.search(r"(中华医学会[^，。\n]{0,30}|中国医师协会[^，。\n]{0,30}|中国专家共识[^，。\n]{0,20})", body)
            if m:
                issuer = m.group(1)

        # 摘要
        abstract = ""
        # 找 guideAbstract 或 摘要 section
        abs_tag = soup.find(class_=re.compile(r"abstract|summary|摘要", re.I))
        if abs_tag:
            abstract = abs_tag.get_text(separator="\n", strip=True)
        else:
            # 取正文第一个较长段落
            for p in soup.find_all("p"):
                t = p.get_text(strip=True)
                if len(t) > 100:
                    abstract = t[:1000]
                    break

        # 来源期刊
        source_journal = ""
        journal_patterns = [
            r"(中华[^，。\n]+杂志)",
            r"(《[^》]+》)",
            r"(\w+\s+Journal\s+of\s+\w+)",
        ]
        body = soup.get_text()
        for pat in journal_patterns:
            m = re.search(pat, body[:3000])
            if m:
                source_journal = m.group(1)
                break

        # 科室分类（从标题推断）
        category = self._infer_category(title)

        return {
            "title": title,
            "category": category,
            "issuer": issuer,
            "publish_date": publish_date,
            "abstract": abstract[:2000],
            "keywords": self._extract_keywords(title),
            "source_journal": source_journal,
            "source_url": url,
            "source": "医脉通指南库",
        }

    def _infer_category(self, title: str) -> str:
        for pattern, category in CATEGORY_PATTERNS:
            if re.search(pattern, title):
                return category
        return "综合/其他"

    def _extract_keywords(self, title: str) -> list[str]:
        """从标题提取关键词"""
        # 常见停用词
        stops = {"指南", "共识", "建议", "规范", "标准", "版", "年", "中国", "专家",
                 "临床", "实践", "诊疗", "更新", "解读", "摘要"}
        # 分词（简单按括号/空格/标点切分）
        parts = re.split(r"[/（）()\s·，。、]+", title)
        return [p.strip() for p in parts if p.strip() and p.strip() not in stops and len(p.strip()) > 1][:8]

    # ── 数据清洗 ─────────────────────────────────────────────────────────────

    def _process(self, raw: list[dict]) -> list[dict]:
        processed = []
        seen = set()
        for item in raw:
            title = item.get("title", "").strip()
            if not title or title in seen:
                continue
            seen.add(title)
            processed.append({
                "title": title,
                "category": item.get("category", "综合/其他"),
                "issuer": item.get("issuer", ""),
                "publish_date": item.get("publish_date", ""),
                "abstract": item.get("abstract", ""),
                "keywords": item.get("keywords", []),
                "source_journal": item.get("source_journal", ""),
                "evidence_level": "",
                "recommendation_grade": "",
                "source": item.get("source", "医脉通指南库"),
                "source_url": item.get("source_url", ""),
            })
        logger.info(f"清洗后：{len(processed)} 条临床指南")
        return processed


if __name__ == "__main__":
    # 爬取前 300 页（约 3000 条最新中文指南）
    scraper = GuidelineScraper(max_pages=300)
    result = scraper.run()
    print(f"[OK] guidelines done: {len(result)} records")
