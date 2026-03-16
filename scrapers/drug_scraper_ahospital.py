"""
药品知识库爬虫 —— 杏林医学 (a-hospital.com)
来源：https://www.a-hospital.com
基于 MediaWiki，内容开放，无反爬

策略：
1. 用 MediaWiki API 获取 WHO必需药物 + 抗生素 + 其他分类的药品列表
2. 直接用 COMMON_DRUG_KEYWORDS 关键词构建 URL
3. 解析 H2 章节提取药品信息
"""

import re
import json
import urllib.parse
from pathlib import Path
from typing import Optional

from bs4 import BeautifulSoup
from loguru import logger
from tqdm import tqdm

from base_scraper import BaseScraper, RAW_DIR, PROCESSED_DIR, CHECKPOINT_DIR, url_to_key

BASE_URL = "https://www.a-hospital.com"
API_URL = f"{BASE_URL}/api.php"

# MediaWiki 药品分类（已验证可用）
DRUG_CATEGORIES = [
    "世界卫生组织基本药物标准清单入选药品",
    "抗生素",
    "β受体阻断药",
    "β阻滞药",
    "H1受体阻断药",
    "H2受体阻断药",
    "(抗)甲状腺激素类药物",
    "α受体阻断药",
    "M受体阻断药",
    "丁酰苯类抗精神病药",
]

# 常用药物关键词（直接构造 URL）
COMMON_DRUG_KEYWORDS = [
    "阿莫西林", "头孢曲松", "头孢他啶", "头孢哌酮", "头孢唑林",
    "青霉素", "阿奇霉素", "左氧氟沙星", "美洛西林", "哌拉西林",
    "万古霉素", "利奈唑胺", "莫西沙星", "亚胺培南", "美罗培南",
    "厄他培南", "替加环素", "氟康唑", "伊曲康唑", "伏立康唑",
    "阿昔洛韦", "更昔洛韦", "奥司他韦", "利巴韦林",
    "阿司匹林", "氯吡格雷", "华法林", "肝素", "低分子肝素",
    "阿托伐他汀", "瑞舒伐他汀", "辛伐他汀",
    "氨氯地平", "硝苯地平", "维拉帕米", "地尔硫䓬",
    "厄贝沙坦", "缬沙坦", "氯沙坦", "依那普利", "卡托普利",
    "美托洛尔", "比索洛尔", "卡维地洛",
    "呋塞米", "氢氯噻嗪", "螺内酯",
    "地高辛", "胺碘酮", "硝酸甘油", "单硝酸异山梨酯",
    "二甲双胍", "格列本脲", "格列吡嗪",
    "胰岛素", "门冬胰岛素", "甘精胰岛素",
    "西格列汀", "达格列净", "恩格列净",
    "奥美拉唑", "兰索拉唑", "泮托拉唑", "艾司奥美拉唑",
    "多潘立酮", "甲氧氯普胺", "莫沙必利",
    "布洛芬", "洛索洛芬", "双氯芬酸", "塞来昔布",
    "对乙酰氨基酚", "曲马多", "吗啡", "芬太尼",
    "氨溴索", "乙酰半胱氨酸", "沙丁胺醇", "噻托溴铵",
    "布地奈德", "孟鲁司特", "氯雷他定", "西替利嗪",
    "泼尼松", "甲泼尼龙", "地塞米松",
    "左甲状腺素", "甲巯咪唑",
    "碳酸钙", "骨化三醇", "阿仑膦酸钠",
    "氨甲喋呤", "来氟米特", "羟氯喹",
    "苯妥英钠", "卡马西平", "丙戊酸", "拉莫三嗪",
    "左乙拉西坦", "加巴喷丁", "普瑞巴林",
    "地西泮", "艾司唑仑", "氯硝西泮",
    "奥氮平", "利培酮", "喹硫平",
    "舍曲林", "氟西汀", "帕罗西汀", "文拉法辛",
    "多奈哌齐", "美金刚", "甲钴胺",
    "甘露醇", "白蛋白", "右旋糖酐",
    "利妥昔单抗", "英夫利西单抗",
]

# H2 章节标题 → 字段映射
SECTION_MAP = {
    "indications":       ["速查应用", "适应症", "适应证", "功能主治", "临床应用", "应用"],
    "dosage":            ["用法用量", "用法", "剂量", "给药方法"],
    "contraindications": ["禁忌", "禁忌症", "禁忌证", "配伍禁忌"],
    "adverse_reactions": ["不良反应", "副作用", "不良反应、配伍禁忌"],
    "interactions":      ["药物相互作用", "相互作用", "配伍"],
    "special_population":["注意事项", "特殊人群", "妊娠", "哺乳", "老年", "儿童"],
    "pharmacology":      ["药物说明", "药理作用", "药理毒理", "作用机制"],
}


class DrugScraperAhospital(BaseScraper):
    NAME = "drug_ahospital"
    REQUEST_DELAY = (1.0, 2.5)

    def run(self):
        logger.info("=== 药品知识库爬取开始（杏林医学）===")

        # Step 1: 收集所有药品 URL
        drug_pages = self._collect_drug_pages()
        logger.info(f"共收集到 {len(drug_pages)} 个药品页面")

        # Step 2: 逐条爬取
        raw_drugs = self._scrape_all(drug_pages)
        self.save_raw("drugs_raw.json", raw_drugs)

        # Step 3: 清洗
        processed = self._process(raw_drugs)
        self.save_processed("drugs.json", processed)
        return processed

    # ── URL 收集 ────────────────────────────────────────────────────────

    def _collect_drug_pages(self) -> list[dict]:
        """返回 [{name, url}, ...] 列表"""
        cache_path = RAW_DIR / "drug_pages.json"
        if cache_path.exists():
            with open(cache_path, encoding="utf-8") as f:
                pages = json.load(f)
            logger.info(f"从缓存加载 {len(pages)} 个药品页面")
            return pages

        pages_dict = {}  # name -> url，用于去重

        # 1) 从分类 API 获取
        for cat in tqdm(DRUG_CATEGORIES, desc="获取分类药品"):
            try:
                members = self._get_category_members(cat)
                for m in members:
                    name = m.get("title", "").strip()
                    if name and ":" not in name:
                        url = f"{BASE_URL}/w/{urllib.parse.quote(name)}"
                        pages_dict[name] = url
            except Exception as e:
                logger.warning(f"分类 '{cat}' 失败：{e}")

        # 2) 从关键词直接构建 URL
        for kw in COMMON_DRUG_KEYWORDS:
            if kw not in pages_dict:
                pages_dict[kw] = f"{BASE_URL}/w/{urllib.parse.quote(kw)}"

        pages = [{"name": n, "url": u} for n, u in pages_dict.items()]
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(pages, f, ensure_ascii=False, indent=2)
        return pages

    def _get_category_members(self, category: str) -> list[dict]:
        """用 MediaWiki API 获取分类成员"""
        members = []
        continue_param = None
        while True:
            params = {
                "action": "query",
                "list": "categorymembers",
                "cmtitle": f"Category:{category}",
                "cmlimit": "500",
                "format": "json",
            }
            if continue_param:
                params["cmcontinue"] = continue_param
            resp = self.get(API_URL, params=params)
            data = resp.json()
            batch = data.get("query", {}).get("categorymembers", [])
            members.extend(batch)
            if "continue" in data:
                continue_param = data["continue"].get("cmcontinue")
            else:
                break
        return members

    # ── 详情爬取 ────────────────────────────────────────────────────────

    def _scrape_all(self, pages: list[dict]) -> list[dict]:
        raw_drugs = []
        raw_path = RAW_DIR / "drugs_raw.json"

        if raw_path.exists():
            with open(raw_path, encoding="utf-8") as f:
                raw_drugs = json.load(f)

        done_keys = {d.get("_url_key") for d in raw_drugs}

        for page in tqdm(pages, desc="爬取药品详情"):
            url = page["url"]
            key = url_to_key(url)
            if key in done_keys or self.is_done(key):
                continue
            try:
                drug = self._parse_drug_page(url, page["name"])
                if drug:
                    drug["_url_key"] = key
                    raw_drugs.append(drug)
                self.mark_done(key)
            except Exception as e:
                logger.warning(f"跳过 {url}：{e}")
                self.mark_failed(key, str(e))

            if len(raw_drugs) % 25 == 0 and raw_drugs:
                with open(raw_path, "w", encoding="utf-8") as f:
                    json.dump(raw_drugs, f, ensure_ascii=False, indent=2)

        return raw_drugs

    def _parse_drug_page(self, url: str, hint_name: str = "") -> Optional[dict]:
        soup = self.get_soup(url)

        # 药品名称：H1 或 URL 中的名称
        h1 = soup.find("h1")
        name = h1.get_text(strip=True) if h1 else ""
        # 清除括号内规格信息
        name = re.sub(r"[（(].*?[）)]", "", name).strip()

        if not name:
            name = hint_name  # fallback to keyword

        if not name:
            return None

        # 跳过非药品页面（404 回显、disambiguation 等）
        body_text = soup.get_text(" ", strip=True)
        if "该页面不存在" in body_text or "页面尚未创建" in body_text:
            return None

        # 提取章节
        sections = self._extract_sections(soup)

        # 推断分类（从目录链接/导航栏）
        category = self._infer_category(soup, url)

        return {
            "name": name,
            "trade_name": "",
            "category": category,
            "indications": sections.get("indications", ""),
            "dosage": sections.get("dosage", ""),
            "contraindications": sections.get("contraindications", ""),
            "interactions": sections.get("interactions", ""),
            "adverse_reactions": sections.get("adverse_reactions", ""),
            "special_population": sections.get("special_population", ""),
            "pharmacology": sections.get("pharmacology", ""),
            "source_url": url,
            "source": "杏林医学",
        }

    def _extract_sections(self, soup: BeautifulSoup) -> dict:
        result = {k: "" for k in SECTION_MAP}

        for heading in soup.find_all(re.compile(r"^h[2-4]$")):
            heading_text = heading.get_text(strip=True)
            matched_key = None
            for key, keywords in SECTION_MAP.items():
                if any(kw in heading_text for kw in keywords):
                    matched_key = key
                    break
            if not matched_key:
                continue

            content = []
            for sib in heading.find_next_siblings():
                if sib.name and re.match(r"^h[2-4]$", sib.name):
                    break
                text = sib.get_text(separator="\n", strip=True)
                if text:
                    content.append(text)
            if content:
                result[matched_key] = "\n".join(content)

        return result

    def _infer_category(self, soup: BeautifulSoup, url: str) -> str:
        # 从页面底部的 categories 提取
        cat_div = soup.find(id=re.compile(r"mw-normal-catlinks|catlinks", re.I))
        if cat_div:
            cats = [a.get_text(strip=True) for a in cat_div.find_all("a")]
            # 优先返回药物类别
            for c in cats:
                if any(kw in c for kw in ["药", "素", "剂", "抗", "激素"]):
                    return c
        return "其他"

    # ── 数据清洗 ────────────────────────────────────────────────────────

    def _process(self, raw: list[dict]) -> list[dict]:
        processed = []
        seen = set()
        for item in raw:
            name = item.get("name", "").strip()
            if not name or name in seen:
                continue
            # 过滤掉非药品条目（如公司名、疾病名）
            if not self._is_drug(item):
                continue
            seen.add(name)
            processed.append({
                "name": name,
                "trade_name": item.get("trade_name", ""),
                "approval_number": "",
                "category": item.get("category", "其他"),
                "manufacturer": "",
                "indications": item.get("indications", ""),
                "dosage": item.get("dosage", ""),
                "contraindications": item.get("contraindications", ""),
                "interactions": item.get("interactions", ""),
                "adverse_reactions": item.get("adverse_reactions", ""),
                "special_population": item.get("special_population", ""),
                "source": item.get("source", "杏林医学"),
                "source_url": item.get("source_url", ""),
            })
        logger.info(f"清洗后：{len(processed)} 条药品")
        return processed

    def _is_drug(self, item: dict) -> bool:
        """简单判断是否是药品条目（有至少一个实质内容字段）"""
        return any(item.get(f, "") for f in [
            "indications", "dosage", "contraindications",
            "adverse_reactions", "pharmacology"
        ])


if __name__ == "__main__":
    scraper = DrugScraperAhospital()
    result = scraper.run()
    print(f"[OK] drug done: {len(result)} records")
