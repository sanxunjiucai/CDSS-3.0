"""
药品补充爬虫 —— 维基百科中文版
来源：zh.wikipedia.org
用途：补充 a-hospital.com 缺失的现代药品（SGLT-2抑制剂、GLP-1激动剂、生物制剂等）

策略：
1. 直接访问 zh.wikipedia.org/wiki/{药品名} 获取药品页面
2. 从 H2 小节提取：适应症、禁忌、不良反应、药理、用法用量
3. 与现有 drugs.json 合并，去重后保存

输出字段（与 drug_scraper_ahospital.py 一致）：
  name, category, indications, dosage, contraindications,
  adverse_reactions, interactions, special_population,
  pharmacology, source, source_url
"""

import json
import re
from pathlib import Path
from typing import Optional

from bs4 import BeautifulSoup
from loguru import logger
from tqdm import tqdm

from base_scraper import BaseScraper, PROCESSED_DIR, RAW_DIR, url_to_key

BASE_URL = "https://zh.wikipedia.org/wiki"

# 需要补充的现代药品（a-hospital.com 中缺失或内容不足）
SUPPLEMENT_DRUGS = [
    # SGLT-2 抑制剂
    {"name": "达格列净", "category": "内分泌/代谢", "aliases": ["达格列净", "Dapagliflozin"]},
    {"name": "恩格列净", "category": "内分泌/代谢", "aliases": ["恩格列净", "Empagliflozin"]},
    {"name": "卡格列净", "category": "内分泌/代谢", "aliases": ["卡格列净", "Canagliflozin"]},
    # GLP-1 受体激动剂
    {"name": "利拉鲁肽", "category": "内分泌/代谢", "aliases": ["利拉鲁肽", "Liraglutide"]},
    {"name": "司美格鲁肽", "category": "内分泌/代谢", "aliases": ["司美格鲁肽", "Semaglutide"]},
    {"name": "度拉糖肽", "category": "内分泌/代谢", "aliases": ["度拉糖肽", "Dulaglutide"]},
    # 他汀类（新一代）
    {"name": "瑞舒伐他汀", "category": "心血管", "aliases": ["瑞舒伐他汀", "Rosuvastatin"]},
    {"name": "匹伐他汀", "category": "心血管", "aliases": ["匹伐他汀", "Pitavastatin"]},
    # DPP-4 抑制剂
    {"name": "西格列汀", "category": "内分泌/代谢", "aliases": ["西格列汀", "Sitagliptin"]},
    {"name": "沙格列汀", "category": "内分泌/代谢", "aliases": ["沙格列汀", "Saxagliptin"]},
    {"name": "维格列汀", "category": "内分泌/代谢", "aliases": ["维格列汀", "Vildagliptin"]},
    # 长效支气管扩张剂
    {"name": "沙美特罗", "category": "呼吸", "aliases": ["沙美特罗", "Salmeterol"]},
    {"name": "福莫特罗", "category": "呼吸", "aliases": ["福莫特罗", "Formoterol"]},
    {"name": "茚达特罗", "category": "呼吸", "aliases": ["茚达特罗", "Indacaterol"]},
    # 生物制剂（抗体类）
    {"name": "利妥昔单抗", "category": "肿瘤/风湿", "aliases": ["利妥昔单抗", "Rituximab"]},
    {"name": "英夫利西单抗", "category": "风湿/消化", "aliases": ["英夫利西单抗", "Infliximab"]},
    {"name": "阿达木单抗", "category": "风湿", "aliases": ["阿达木单抗", "Adalimumab"]},
    {"name": "贝伐珠单抗", "category": "肿瘤", "aliases": ["贝伐珠单抗", "Bevacizumab"]},
    {"name": "曲妥珠单抗", "category": "肿瘤", "aliases": ["曲妥珠单抗", "Trastuzumab"]},
    {"name": "帕博利珠单抗", "category": "肿瘤", "aliases": ["帕博利珠单抗", "Pembrolizumab"]},
    {"name": "纳武利尤单抗", "category": "肿瘤", "aliases": ["纳武利尤单抗", "Nivolumab"]},
    # 神经科新药
    {"name": "美金刚", "category": "神经", "aliases": ["美金刚", "Memantine"]},
    {"name": "多奈哌齐", "category": "神经", "aliases": ["多奈哌齐", "Donepezil"]},
    {"name": "左乙拉西坦", "category": "神经", "aliases": ["左乙拉西坦", "Levetiracetam"]},
    {"name": "拉科酰胺", "category": "神经", "aliases": ["拉科酰胺", "Lacosamide"]},
    # 骨质疏松/骨代谢
    {"name": "唑来膦酸", "category": "骨科", "aliases": ["唑来膦酸", "Zoledronic acid"]},
    {"name": "地诺单抗", "category": "骨科", "aliases": ["地诺单抗", "Denosumab"]},
    # 降脂（非他汀）
    {"name": "依折麦布", "category": "心血管", "aliases": ["依折麦布", "Ezetimibe"]},
    {"name": "依洛尤单抗", "category": "心血管", "aliases": ["依洛尤单抗", "Evolocumab"]},
    # 新型抗凝
    {"name": "达比加群", "category": "血液/心血管", "aliases": ["达比加群", "Dabigatran"]},
    {"name": "利伐沙班", "category": "血液/心血管", "aliases": ["利伐沙班", "Rivaroxaban"]},
    {"name": "阿哌沙班", "category": "血液/心血管", "aliases": ["阿哌沙班", "Apixaban"]},
]

# Wikipedia 章节名 → 字段映射
SECTION_MAP = {
    "indications": [
        "医学用途", "适应症", "适应证", "用途", "临床应用",
        "适应症和适应证", "医疗用途",
    ],
    "contraindications": ["禁忌", "禁忌症", "禁忌证", "注意事项与禁忌"],
    "adverse_reactions": [
        "副作用", "不良反应", "不良效应", "安全性", "副反应",
        "不良反应与副作用",
    ],
    "interactions": ["药物相互作用", "相互作用", "药物交互作用"],
    "pharmacology": [
        "药理", "药理学", "作用机制", "机制", "药效学",
        "药代动力学", "药物动力学",
    ],
    "dosage": ["用法用量", "用法", "剂量", "给药"],
    "special_population": ["特殊人群", "特殊患者", "妊娠", "老年用药"],
}


class DrugWikiScraper(BaseScraper):
    NAME = "drug_wiki"
    REQUEST_DELAY = (1.0, 2.5)

    def run(self):
        logger.info("=== 维基百科药品补充爬取开始 ===")

        # Step 1: 爬取维基百科药品页面
        raw = self._scrape_all()
        self.save_raw("wiki_drugs_raw.json", raw)
        logger.info(f"维基百科原始数据：{len(raw)} 条")

        # Step 2: 与现有 drugs.json 合并
        merged = self._merge_with_existing(raw)
        self.save_processed("drugs.json", merged)
        logger.info(f"合并后药品总数：{len(merged)} 条")
        return merged

    # ── 爬取 ─────────────────────────────────────────────────────────────────

    def _scrape_all(self) -> list[dict]:
        raw = []
        raw_path = RAW_DIR / "wiki_drugs_raw.json"
        if raw_path.exists():
            with open(raw_path, encoding="utf-8") as f:
                raw = json.load(f)

        done_keys = {d.get("_url_key") for d in raw}

        for drug_info in tqdm(SUPPLEMENT_DRUGS, desc="维基百科药品爬取"):
            # 尝试各别名
            detail = None
            for alias in drug_info["aliases"]:
                url = f"{BASE_URL}/{alias}"
                key = url_to_key(url)
                if key in done_keys or self.is_done(key):
                    break
                try:
                    detail = self._parse_wiki_page(url, drug_info)
                    if detail:
                        detail["_url_key"] = key
                        raw.append(detail)
                        self.mark_done(key)
                        break
                except Exception as e:
                    logger.debug(f"  尝试 {alias} 失败：{e}")
                    continue

            if not detail:
                logger.warning(f"[SKIP] {drug_info['name']} 所有别名均未找到内容")

        self.flush_checkpoint()
        return raw

    def _parse_wiki_page(self, url: str, drug_info: dict) -> Optional[dict]:
        resp = self.get(url)
        soup = BeautifulSoup(resp.text, "lxml")

        # 验证是药品页面（不是消歧义页）
        content_div = soup.find("div", {"id": "mw-content-text"})
        if not content_div:
            return None

        # 消歧义页检测
        disambig = soup.find("table", {"class": re.compile("disambig|hatnote", re.I)})
        if disambig or "可以指" in (content_div.get_text()[:200]):
            logger.debug(f"  {url} 是消歧义页，跳过")
            return None

        # 页面标题
        title_tag = soup.find("h1", {"id": "firstHeading"})
        name = title_tag.get_text(strip=True) if title_tag else drug_info["name"]

        # 提取各章节
        sections = self._extract_sections(content_div)

        result = {
            "name": drug_info["name"],  # 使用标准中文名
            "wiki_title": name,
            "category": drug_info.get("category", ""),
            "source": "维基百科中文版",
            "source_url": url,
        }

        # 填入各字段
        for field, section_names in SECTION_MAP.items():
            for sec_name in section_names:
                if sec_name in sections and sections[sec_name].strip():
                    result[field] = sections[sec_name][:3000]
                    break
            else:
                result[field] = ""

        # 至少需要有一个内容字段才算有效
        content_fields = ["indications", "adverse_reactions", "pharmacology",
                          "contraindications", "dosage"]
        if not any(result.get(f) for f in content_fields):
            logger.debug(f"  {url} 无有效药品内容")
            return None

        return result

    def _extract_sections(self, content_div) -> dict[str, str]:
        """提取 Wikipedia 页面各 H2/H3 章节文本"""
        sections = {}
        current_section = None
        current_texts = []

        for elem in content_div.find_all(["h2", "h3", "p", "ul", "ol", "table"]):
            tag = elem.name

            if tag in ("h2", "h3"):
                # 保存上一节
                if current_section and current_texts:
                    sections[current_section] = "\n".join(current_texts).strip()
                # 开始新节（过滤掉 [编辑] 链接）
                heading_text = elem.get_text(separator=" ", strip=True)
                heading_text = re.sub(r"\[编辑\]|\[edit\]", "", heading_text).strip()
                current_section = heading_text
                current_texts = []

            elif tag in ("p", "ul", "ol") and current_section:
                text = elem.get_text(separator="\n", strip=True)
                if text:
                    current_texts.append(text)

        # 最后一节
        if current_section and current_texts:
            sections[current_section] = "\n".join(current_texts).strip()

        return sections

    # ── 合并 ─────────────────────────────────────────────────────────────────

    def _merge_with_existing(self, wiki_raw: list[dict]) -> list[dict]:
        """将维基百科数据合并到现有 drugs.json，去重"""
        existing_path = PROCESSED_DIR / "drugs.json"
        existing = []
        if existing_path.exists():
            with open(existing_path, encoding="utf-8") as f:
                existing = json.load(f)
            logger.info(f"现有药品库：{len(existing)} 条")

        # 建立现有药品名称集合（用于去重）
        existing_names = {d.get("name", "").strip() for d in existing}

        added = 0
        updated = 0
        for wiki_drug in wiki_raw:
            drug_name = wiki_drug.get("name", "").strip()
            if not drug_name:
                continue

            # 规范化为 drugs.json 格式
            formatted = {
                "name": drug_name,
                "category": wiki_drug.get("category", ""),
                "indications": wiki_drug.get("indications", ""),
                "dosage": wiki_drug.get("dosage", ""),
                "contraindications": wiki_drug.get("contraindications", ""),
                "adverse_reactions": wiki_drug.get("adverse_reactions", ""),
                "interactions": wiki_drug.get("interactions", ""),
                "special_population": wiki_drug.get("special_population", ""),
                "pharmacology": wiki_drug.get("pharmacology", ""),
                "source": wiki_drug.get("source", "维基百科中文版"),
                "source_url": wiki_drug.get("source_url", ""),
            }

            if drug_name not in existing_names:
                existing.append(formatted)
                existing_names.add(drug_name)
                added += 1
            else:
                # 对现有条目补充空字段
                for i, d in enumerate(existing):
                    if d.get("name") == drug_name:
                        changed = False
                        for field in ["indications", "dosage", "contraindications",
                                      "adverse_reactions", "interactions",
                                      "pharmacology", "special_population"]:
                            if not d.get(field) and formatted.get(field):
                                existing[i][field] = formatted[field]
                                changed = True
                        if changed:
                            updated += 1
                        break

        logger.info(f"合并结果：新增 {added} 条，补充更新 {updated} 条")
        return existing


if __name__ == "__main__":
    scraper = DrugWikiScraper()
    result = scraper.run()
    print(f"[OK] drug_wiki done: {len(result)} total records")
