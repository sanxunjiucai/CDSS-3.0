"""
疾病知识库爬虫 —— 默沙东诊疗手册中文专业版
来源：https://www.msdmanuals.cn/professional

策略：
1. 解析 sitemap.xml 获取所有疾病页面URL
2. 逐页爬取结构化内容
3. 输出符合 DB 模型的 JSON

输出字段（对应 backend/db/models/disease.py）：
  name, icd_code, alias, department, system,
  overview, definition, pathogenesis, etiology, symptoms,
  diagnosis_criteria, differential_diagnosis, complications,
  treatment, prognosis, prevention
"""

import re
import json
import time
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from loguru import logger
from tqdm import tqdm

from base_scraper import BaseScraper, RAW_DIR, PROCESSED_DIR, CHECKPOINT_DIR, url_to_key

# ── MSD 系统→科室 映射 ──────────────────────────────────────────────────────
SYSTEM_DEPT_MAP = {
    "cardiovascular-disorders": ("心血管系统", "心内科"),
    "dermatologic-disorders": ("皮肤系统", "皮肤科"),
    "ear-nose-and-throat-disorders": ("耳鼻喉系统", "耳鼻喉科"),
    "endocrine-and-metabolic-disorders": ("内分泌系统", "内分泌科"),
    "eye-disorders": ("眼系统", "眼科"),
    "gastrointestinal-disorders": ("消化系统", "消化科"),
    "genitourinary-disorders": ("泌尿生殖系统", "泌尿科"),
    "gynecology-and-obstetrics": ("生殖系统", "妇产科"),
    "hematology-and-oncology": ("血液肿瘤系统", "血液科"),
    "hepatic-and-biliary-disorders": ("肝胆系统", "肝胆科"),
    "immunology-allergic-disorders": ("免疫系统", "免疫科"),
    "infectious-diseases": ("感染系统", "感染科"),
    "injuries-poisoning": ("损伤中毒", "急诊科"),
    "musculoskeletal-and-connective-tissue-disorders": ("骨骼肌肉系统", "骨科"),
    "neurologic-disorders": ("神经系统", "神经科"),
    "nutritional-disorders": ("营养代谢", "营养科"),
    "pediatrics": ("儿科", "儿科"),
    "psychiatric-disorders": ("精神系统", "精神科"),
    "pulmonary-disorders": ("呼吸系统", "呼吸科"),
    "renal-and-urologic-disorders": ("泌尿系统", "肾内科"),
    "reproductive-health": ("生殖健康", "妇产科"),
    "special-subjects": ("特殊专题", "综合"),
}

BASE_URL = "https://www.msdmanuals.cn"
PROFESSIONAL_URL = f"{BASE_URL}/professional"
SITEMAP_URL = f"{BASE_URL}/sitemap.xml"


class DiseaseScraper(BaseScraper):
    NAME = "disease"
    REQUEST_DELAY = (2.0, 4.0)

    def run(self):
        logger.info("=== 疾病知识库爬取开始（默沙东中文专业版）===")

        # Step 1: 获取所有疾病页面URL
        disease_urls = self._get_disease_urls()
        logger.info(f"共发现 {len(disease_urls)} 个疾病页面")

        # Step 2: 逐页爬取
        raw_diseases = []
        raw_path = RAW_DIR / "diseases_raw.json"

        # 加载已有进度
        if raw_path.exists():
            with open(raw_path, "r", encoding="utf-8") as f:
                raw_diseases = json.load(f)
            logger.info(f"从上次进度恢复，已有 {len(raw_diseases)} 条")

        done_keys = {d["_url_key"] for d in raw_diseases}

        for url in tqdm(disease_urls, desc="爬取疾病"):
            key = url_to_key(url)
            if key in done_keys:
                continue
            try:
                disease = self._scrape_disease_page(url)
                if disease:
                    disease["_url_key"] = key
                    raw_diseases.append(disease)
                    # 每10条保存一次
                    if len(raw_diseases) % 10 == 0:
                        self.save_raw("diseases_raw.json", raw_diseases)
                self.mark_done(key)
            except Exception as e:
                logger.warning(f"跳过 {url}：{e}")
                self.mark_failed(key, str(e))

        self.save_raw("diseases_raw.json", raw_diseases)

        # Step 3: 清洗为标准格式
        processed = self._process(raw_diseases)
        self.save_processed("diseases.json", processed)
        return processed

    # ── URL 收集 ──────────────────────────────────────────────────────────────

    def _get_disease_urls(self) -> list[str]:
        """优先从预处理的 URL 缓存读取，fallback 从 sitemap 实时解析"""
        cache_file = CHECKPOINT_DIR / "disease_urls_clean.json"
        if cache_file.exists():
            with open(cache_file, "r", encoding="utf-8") as f:
                urls = json.load(f)
            logger.info(f"从缓存加载 {len(urls)} 个URL")
            return urls
        urls = self._from_sitemap()
        if len(urls) < 50:
            logger.warning("sitemap 获取不足，改用分类页爬取")
            urls = self._from_category_pages()
        return list(set(urls))

    def _from_sitemap(self) -> list[str]:
        try:
            resp = self.get(SITEMAP_URL)
            soup = BeautifulSoup(resp.text, "lxml-xml")
            urls = []
            for loc in soup.find_all("loc"):
                url = loc.text.strip()
                if "/professional/" in url and self._is_disease_url(url):
                    urls.append(url)
            logger.info(f"从 sitemap 获取到 {len(urls)} 个URL")
            return urls
        except Exception as e:
            logger.warning(f"sitemap 获取失败：{e}")
            return []

    def _from_category_pages(self) -> list[str]:
        """从各系统分类页遍历获取"""
        urls = []
        for system_slug in SYSTEM_DEPT_MAP:
            cat_url = f"{PROFESSIONAL_URL}/{system_slug}"
            try:
                soup = self.get_soup(cat_url)
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    full_url = urljoin(BASE_URL, href)
                    if self._is_disease_url(full_url):
                        urls.append(full_url)
                logger.debug(f"{system_slug}: 发现 {len(urls)} 个URL")
            except Exception as e:
                logger.warning(f"分类页失败 {system_slug}：{e}")
        return urls

    def _is_disease_url(self, url: str) -> bool:
        """判断是否是疾病内容页（非目录、非资源页）"""
        skip_patterns = [
            "/resourcespages/", "/resources/", "/multimedia/", "/quiz/",
            "/news/", "/videos/", "#", "?", "/home/", "/consumer/"
        ]
        if not url.startswith(f"{BASE_URL}/professional/"):
            return False
        parts = url.replace(f"{BASE_URL}/professional/", "").split("/")
        if len(parts) < 2:
            return False  # 只有分类，没有文章
        for pat in skip_patterns:
            if pat in url:
                return False
        return True

    # ── 页面解析 ──────────────────────────────────────────────────────────────

    def _scrape_disease_page(self, url: str) -> Optional[dict]:
        soup = self.get_soup(url)

        # 标题
        h1 = soup.find("h1")
        name = h1.get_text(strip=True) if h1 else ""
        if not name:
            return None

        # 从 URL 推断系统/科室
        system, department = self._infer_system_dept(url)

        # ICD 编码（页面内有时会提到）
        icd_code = self._extract_icd(soup)

        # 别名
        alias = self._extract_alias(soup, name)

        # 正文各章节
        sections = self._extract_sections(soup)

        return {
            "name": name,
            "icd_code": icd_code,
            "alias": alias,
            "department": department,
            "system": system,
            "overview": sections.get("overview", ""),
            "definition": sections.get("definition", ""),
            "pathogenesis": sections.get("pathogenesis", ""),
            "etiology": sections.get("etiology", ""),
            "symptoms": sections.get("symptoms", ""),
            "diagnosis_criteria": sections.get("diagnosis_criteria", ""),
            "differential_diagnosis": sections.get("differential_diagnosis", ""),
            "complications": sections.get("complications", ""),
            "treatment": sections.get("treatment", ""),
            "prognosis": sections.get("prognosis", ""),
            "prevention": sections.get("prevention", ""),
            "source_url": url,
        }

    def _infer_system_dept(self, url: str) -> tuple[str, str]:
        for slug, (system, dept) in SYSTEM_DEPT_MAP.items():
            if f"/{slug}/" in url:
                return system, dept
        return "综合", "综合"

    def _extract_icd(self, soup: BeautifulSoup) -> str:
        text = soup.get_text()
        m = re.search(r"ICD[- ]?10[- ]?[：:\s]*([A-Z]\d{2}\.?\d*)", text)
        return m.group(1) if m else ""

    def _extract_alias(self, soup: BeautifulSoup, main_name: str) -> list[str]:
        alias = []
        # 常见的别名标注位置
        for tag in soup.find_all(["p", "div"], class_=re.compile(r"alias|synonym|aka", re.I)):
            text = tag.get_text(strip=True)
            if text and text != main_name:
                alias.append(text)
        # 括号内别名
        h1 = soup.find("h1")
        if h1:
            m = re.search(r"[（(]([^）)]+)[）)]", h1.get_text())
            if m:
                alias.append(m.group(1))
        return list(set(alias))

    def _extract_sections(self, soup: BeautifulSoup) -> dict:
        """提取各章节内容"""
        # 关键词映射
        section_map = {
            "overview":           ["概述", "简介", "overview"],
            "definition":         ["定义", "definition"],
            "etiology":           ["病因", "病因学", "etiology"],
            "pathogenesis":       ["发病机制", "病理生理", "pathophysiology"],
            "symptoms":           ["症状", "体征", "临床表现", "症状和体征", "症状与体征", "symptoms"],
            "diagnosis_criteria": ["诊断", "诊断标准", "diagnosis", "检查"],
            "differential_diagnosis": ["鉴别诊断", "differential diagnosis"],
            "complications":      ["并发症", "complication", "complications"],
            "treatment":          ["治疗", "处理", "management", "treatment"],
            "prognosis":          ["预后", "prognosis"],
            "prevention":         ["预防", "预后与预防", "预防和治疗", "prevention"],
        }

        result = {k: "" for k in section_map}

        # 找到所有标题
        headings = soup.find_all(re.compile(r"^h[2-4]$"))

        for i, heading in enumerate(headings):
            heading_text = heading.get_text(strip=True).lower()
            matched_key = None
            for key, keywords in section_map.items():
                if any(kw in heading_text for kw in keywords):
                    matched_key = key
                    break
            if not matched_key:
                continue

            # 收集该标题后的内容，直到下一个同级标题
            content_parts = []
            for sibling in heading.find_next_siblings():
                if sibling.name and re.match(r"^h[2-4]$", sibling.name):
                    break
                text = sibling.get_text(separator="\n", strip=True)
                if text:
                    content_parts.append(text)

            result[matched_key] = "\n\n".join(content_parts)

        # 如果没有找到概述，取第一段正文
        if not result["overview"]:
            first_p = soup.find("div", class_=re.compile(r"content|article|main", re.I))
            if first_p:
                paragraphs = first_p.find_all("p")
                if paragraphs:
                    result["overview"] = paragraphs[0].get_text(strip=True)

        return result

    # ── 数据清洗 ──────────────────────────────────────────────────────────────

    def _process(self, raw: list[dict]) -> list[dict]:
        processed = []
        seen_names = set()
        for item in raw:
            name = item.get("name", "").strip()
            if not name or name in seen_names:
                continue
            seen_names.add(name)
            processed.append({
                "name": name,
                "icd_code": item.get("icd_code", ""),
                "alias": item.get("alias", []),
                "department": item.get("department", "综合"),
                "system": item.get("system", "综合"),
                "overview": self._clean_text(item.get("overview", "")),
                "definition": self._clean_text(item.get("definition", "")),
                "pathogenesis": self._clean_text(item.get("pathogenesis", "")),
                "etiology": self._clean_text(item.get("etiology", "")),
                "symptoms": self._clean_text(item.get("symptoms", "")),
                "diagnosis_criteria": self._clean_text(item.get("diagnosis_criteria", "")),
                "differential_diagnosis": self._clean_text(item.get("differential_diagnosis", "")),
                "complications": self._clean_text(item.get("complications", "")),
                "treatment": self._clean_text(item.get("treatment", "")),
                "prognosis": self._clean_text(item.get("prognosis", "")),
                "prevention": self._clean_text(item.get("prevention", "")),
                "related_drugs": [],
                "related_exams": [],
                "related_guidelines": [],
                "source": "默沙东诊疗手册中文专业版",
                "source_url": item.get("source_url", ""),
            })
        logger.info(f"清洗后：{len(processed)} 条疾病记录")
        return processed

    def _clean_text(self, text: str) -> str:
        if not text:
            return ""
        # 去除多余空行
        lines = [l.strip() for l in text.splitlines()]
        lines = [l for l in lines if l]
        return "\n".join(lines)


if __name__ == "__main__":
    scraper = DiseaseScraper()
    result = scraper.run()
    print(f"\n[OK] disease done: {len(result)} records")
