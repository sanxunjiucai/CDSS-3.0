"""
药品知识库爬虫 —— 丁香园用药助手
来源：https://drugs.dxy.cn/pc/

策略：
1. 按药品分类页面获取药品列表（ATС分类/治疗分类）
2. 逐一爬取药品详情页（说明书内容）
3. 同时爬取 NMPA 公开的药品目录（批准文号 + 基本信息）

字段：name, trade_name, category, indications, dosage,
      contraindications, interactions, adverse_reactions, special_population
"""

import re
import json
import time
import random
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup
from loguru import logger
from tqdm import tqdm

from base_scraper import BaseScraper, RAW_DIR, PROCESSED_DIR, url_to_key

BASE_URL = "https://drugs.dxy.cn"

# 丁香园药品分类入口（ATC一级分类）
CATEGORY_PAGES = {
    "抗感染药物":      f"{BASE_URL}/pc/category/anti-infection",
    "心血管系统药物":   f"{BASE_URL}/pc/category/cardiovascular",
    "消化系统药物":     f"{BASE_URL}/pc/category/digestive",
    "呼吸系统药物":     f"{BASE_URL}/pc/category/respiratory",
    "神经系统药物":     f"{BASE_URL}/pc/category/nervous",
    "内分泌代谢药物":   f"{BASE_URL}/pc/category/endocrine",
    "血液系统药物":     f"{BASE_URL}/pc/category/hematology",
    "泌尿系统药物":     f"{BASE_URL}/pc/category/urinary",
    "免疫调节药物":     f"{BASE_URL}/pc/category/immune",
    "肿瘤用药":        f"{BASE_URL}/pc/category/oncology",
    "解热镇痛抗炎药":   f"{BASE_URL}/pc/category/analgesic",
    "维生素矿物质":     f"{BASE_URL}/pc/category/vitamins",
}

# 高频搜索词（常用药物，保证基础覆盖）
COMMON_DRUG_KEYWORDS = [
    "阿莫西林", "头孢", "青霉素", "阿奇霉素", "左氧氟沙星",
    "美洛西林", "哌拉西林", "万古霉素", "利奈唑胺", "莫西沙星",
    "阿司匹林", "氯吡格雷", "华法林", "肝素", "低分子肝素",
    "阿托伐他汀", "瑞舒伐他汀", "辛伐他汀", "依折麦布",
    "氨氯地平", "硝苯地平", "维拉帕米", "地尔硫䓬",
    "厄贝沙坦", "缬沙坦", "氯沙坦", "替米沙坦",
    "依那普利", "贝那普利", "卡托普利", "培哚普利",
    "美托洛尔", "比索洛尔", "卡维地洛", "阿替洛尔",
    "呋塞米", "氢氯噻嗪", "螺内酯", "托拉塞米",
    "地高辛", "胺碘酮", "利多卡因", "普罗帕酮",
    "硝酸甘油", "单硝酸异山梨酯", "尼可地尔",
    "二甲双胍", "格列本脲", "格列吡嗪", "格列齐特",
    "胰岛素", "门冬胰岛素", "甘精胰岛素",
    "西格列汀", "达格列净", "恩格列净", "利拉鲁肽",
    "奥美拉唑", "兰索拉唑", "泮托拉唑", "雷贝拉唑", "艾司奥美拉唑",
    "西咪替丁", "雷尼替丁", "法莫替丁",
    "多潘立酮", "甲氧氯普胺", "莫沙必利",
    "蒙脱石散", "洛哌丁胺", "口服补液盐",
    "布洛芬", "洛索洛芬", "双氯芬酸", "塞来昔布", "依托考昔",
    "对乙酰氨基酚", "曲马多", "吗啡", "芬太尼",
    "氨溴索", "溴己新", "乙酰半胱氨酸",
    "沙丁胺醇", "特布他林", "沙美特罗", "福莫特罗",
    "噻托溴铵", "异丙托溴铵", "布地奈德",
    "孟鲁司特", "氯雷他定", "西替利嗪", "地氯雷他定",
    "泼尼松", "甲泼尼龙", "地塞米松", "氢化可的松",
    "左甲状腺素", "甲巯咪唑", "丙硫氧嘧啶",
    "碳酸钙", "骨化三醇", "阿仑膦酸钠", "唑来膦酸",
    "氨甲喋呤", "来氟米特", "羟氯喹", "柳氮磺吡啶",
    "利妥昔单抗", "英夫利西单抗", "阿达木单抗",
    "苯妥英钠", "卡马西平", "丙戊酸", "拉莫三嗪",
    "左乙拉西坦", "奥卡西平", "加巴喷丁", "普瑞巴林",
    "阿尔普唑仑", "地西泮", "艾司唑仑", "氯硝西泮",
    "奥氮平", "利培酮", "喹硫平", "氯氮平",
    "舍曲林", "氟西汀", "帕罗西汀", "文拉法辛", "度洛西汀",
    "阿司他唑仑", "艾地苯醌", "多奈哌齐", "美金刚",
    "甲钴胺", "维生素B12", "叶酸", "铁剂",
    "利尿酸", "甘露醇", "白蛋白", "右旋糖酐",
    "头孢曲松", "头孢他啶", "头孢哌酮", "头孢唑林",
    "亚胺培南", "美罗培南", "厄他培南",
    "替加环素", "多黏菌素", "达托霉素",
    "氟康唑", "伊曲康唑", "伏立康唑", "卡泊芬净",
    "阿昔洛韦", "更昔洛韦", "奥司他韦", "利巴韦林",
]


class DrugScraperDxy(BaseScraper):
    NAME = "drug_dxy"
    REQUEST_DELAY = (1.5, 3.0)

    def run(self):
        logger.info("=== 药品知识库爬取开始（丁香园用药助手）===")

        # Step 1: 从搜索词收集药品URL
        drug_detail_urls = self._collect_drug_urls()
        logger.info(f"收集到 {len(drug_detail_urls)} 个药品详情URL")

        # Step 2: 逐条爬取详情
        raw_drugs = self._scrape_details(drug_detail_urls)
        self.save_raw("drugs_raw.json", raw_drugs)

        # Step 3: 清洗
        processed = self._process(raw_drugs)
        self.save_processed("drugs.json", processed)
        return processed

    # ── URL 收集 ──────────────────────────────────────────────────────────

    def _collect_drug_urls(self) -> list[str]:
        """通过搜索词收集药品详情页URL"""
        cache_path = RAW_DIR / "drug_urls.json"
        if cache_path.exists():
            with open(cache_path, encoding="utf-8") as f:
                urls = json.load(f)
            logger.info(f"从缓存加载 {len(urls)} 个药品URL")
            return urls

        url_set = set()
        for keyword in tqdm(COMMON_DRUG_KEYWORDS, desc="收集药品URL"):
            try:
                new_urls = self._search_drug(keyword)
                url_set.update(new_urls)
            except Exception as e:
                logger.warning(f"搜索 '{keyword}' 失败：{e}")

        urls = list(url_set)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(urls, f, ensure_ascii=False, indent=2)
        return urls

    def _search_drug(self, keyword: str) -> list[str]:
        """搜索关键词，返回药品详情页URL列表"""
        import urllib.parse
        encoded = urllib.parse.quote(keyword)
        search_url = f"{BASE_URL}/pc/search?keyword={encoded}"

        resp = self.get(search_url)
        soup = BeautifulSoup(resp.text, "lxml")

        urls = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/pc/drug/" in href:
                full_url = f"{BASE_URL}{href}" if href.startswith("/") else href
                # 去掉查询参数只保留路径
                full_url = full_url.split("?")[0]
                urls.append(full_url)
        return urls

    # ── 详情爬取 ──────────────────────────────────────────────────────────

    def _scrape_details(self, urls: list[str]) -> list[dict]:
        raw_drugs = []
        raw_path = RAW_DIR / "drugs_raw.json"

        if raw_path.exists():
            with open(raw_path, encoding="utf-8") as f:
                raw_drugs = json.load(f)

        done_keys = {d.get("_url_key") for d in raw_drugs}

        for url in tqdm(urls, desc="爬取药品详情"):
            key = url_to_key(url)
            if key in done_keys:
                continue
            if self.is_done(key):
                continue
            try:
                drug = self._parse_drug_page(url)
                if drug:
                    drug["_url_key"] = key
                    raw_drugs.append(drug)
                self.mark_done(key)
            except Exception as e:
                logger.warning(f"跳过 {url}：{e}")
                self.mark_failed(key, str(e))

            if len(raw_drugs) % 20 == 0:
                with open(raw_path, "w", encoding="utf-8") as f:
                    json.dump(raw_drugs, f, ensure_ascii=False, indent=2)

        return raw_drugs

    def _parse_drug_page(self, url: str) -> Optional[dict]:
        """解析丁香园药品详情页"""
        soup = self.get_soup(url)

        # 药品名称（通常在 h1）
        h1 = soup.find("h1")
        name = h1.get_text(strip=True) if h1 else ""

        # 清洗药品名（去除括号内的规格等）
        name = re.sub(r"[（(].*?[）)]", "", name).strip()
        if not name:
            return None

        # 商品名
        trade_name = ""
        trade_tag = soup.find(string=re.compile(r"商品名|品牌名|Brand"))
        if trade_tag:
            next_el = trade_tag.parent.find_next_sibling()
            if next_el:
                trade_name = next_el.get_text(strip=True)

        # 提取说明书各章节
        sections = self._extract_sections(soup)

        # 药品分类
        category = self._infer_category(soup, url)

        return {
            "name": name,
            "trade_name": trade_name,
            "category": category,
            "indications": sections.get("indications", ""),
            "dosage": sections.get("dosage", ""),
            "contraindications": sections.get("contraindications", ""),
            "interactions": sections.get("interactions", ""),
            "adverse_reactions": sections.get("adverse_reactions", ""),
            "special_population": sections.get("special_population", ""),
            "pharmacology": sections.get("pharmacology", ""),
            "source_url": url,
            "source": "丁香园用药助手",
        }

    def _extract_sections(self, soup: BeautifulSoup) -> dict:
        """提取说明书各章节"""
        section_map = {
            "indications":       ["适应症", "适应证", "功能主治", "indications"],
            "dosage":            ["用法用量", "dosage", "用法", "剂量"],
            "contraindications": ["禁忌", "contraindications", "禁忌证"],
            "interactions":      ["药物相互作用", "interactions", "相互作用"],
            "adverse_reactions": ["不良反应", "adverse reactions", "副作用"],
            "special_population":["特殊人群用药", "妊娠", "哺乳", "老年", "儿童"],
            "pharmacology":      ["药理毒理", "药理作用", "pharmacology"],
        }
        result = {k: "" for k in section_map}

        # 找所有标题
        for heading in soup.find_all(re.compile(r"^h[2-6]$")):
            heading_text = heading.get_text(strip=True)
            matched_key = None
            for key, keywords in section_map.items():
                if any(kw in heading_text for kw in keywords):
                    matched_key = key
                    break
            if not matched_key:
                continue

            content = []
            for sib in heading.find_next_siblings():
                if sib.name and re.match(r"^h[2-6]$", sib.name):
                    break
                text = sib.get_text(separator="\n", strip=True)
                if text:
                    content.append(text)
            result[matched_key] = "\n".join(content)

        return result

    def _infer_category(self, soup: BeautifulSoup, url: str) -> str:
        """从面包屑或分类标签推断药品分类"""
        breadcrumb = soup.find(class_=re.compile(r"breadcrumb|crumb|category", re.I))
        if breadcrumb:
            return breadcrumb.get_text(" > ", strip=True).split(" > ")[-2]
        return "其他"

    # ── 数据清洗 ──────────────────────────────────────────────────────────

    def _process(self, raw: list[dict]) -> list[dict]:
        processed = []
        seen = set()
        for item in raw:
            name = item.get("name", "").strip()
            if not name or name in seen:
                continue
            seen.add(name)
            processed.append({
                "name": name,
                "trade_name": item.get("trade_name", ""),
                "approval_number": item.get("approval_number", ""),
                "category": item.get("category", "其他"),
                "manufacturer": "",
                "indications": item.get("indications", ""),
                "dosage": item.get("dosage", ""),
                "contraindications": item.get("contraindications", ""),
                "interactions": item.get("interactions", ""),
                "adverse_reactions": item.get("adverse_reactions", ""),
                "special_population": item.get("special_population", ""),
                "source": item.get("source", "丁香园用药助手"),
                "source_url": item.get("source_url", ""),
            })
        logger.info(f"清洗后：{len(processed)} 条药品")
        return processed


if __name__ == "__main__":
    scraper = DrugScraperDxy()
    result = scraper.run()
    print(f"[OK] drug done: {len(result)} records")
