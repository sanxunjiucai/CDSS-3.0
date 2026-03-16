"""
中药知识库爬虫 —— 杏林医学 (a-hospital.com)
来源：https://www.a-hospital.com
用途：补充中成药 + 中药饮片，以满足磋商文件"西药+中成药+中药饮片"的药品库要求

策略：
1. 从 a-hospital.com MediaWiki 分类 API 获取中成药、中药饮片分类成员
2. 直接用内置关键词构建常用中成药/饮片 URL（保底覆盖）
3. 解析药品页面，提取适应症/用法/禁忌/不良反应/功效等字段
4. 与现有 drugs.json 合并（按 name 去重）后保存

输出字段（与 drug_scraper_ahospital.py 一致）：
  name, category, drug_type(中成药/中药饮片),
  indications, dosage, contraindications,
  adverse_reactions, special_population,
  pharmacology, source, source_url

运行：
  python drug_scraper_tcm.py
  或通过 pipeline.py --drug 调用
"""

import json
import re
import urllib.parse
from pathlib import Path
from typing import Optional

from bs4 import BeautifulSoup
from loguru import logger
from tqdm import tqdm

from base_scraper import BaseScraper, RAW_DIR, PROCESSED_DIR, CHECKPOINT_DIR, url_to_key

BASE_URL = "https://www.a-hospital.com"
API_URL = f"{BASE_URL}/api.php"

# ── 中成药 MediaWiki 分类 ────────────────────────────────────────────────────
TCM_PATENT_CATEGORIES = [
    "中成药",
    "补益类中成药",
    "解表类中成药",
    "清热类中成药",
    "理气类中成药",
    "活血化瘀类中成药",
    "止咳化痰类中成药",
    "消食类中成药",
    "安神类中成药",
    "祛湿类中成药",
    "温里类中成药",
    "开窍类中成药",
    "固涩类中成药",
    "妇科中成药",
    "儿科中成药",
    "骨伤科中成药",
    "心脑血管中成药",
]

# ── 中药饮片 MediaWiki 分类 ──────────────────────────────────────────────────
TCM_HERB_CATEGORIES = [
    "中药",
    "中药材",
    "补益药",
    "解表药",
    "清热药",
    "泻下药",
    "祛风湿药",
    "化湿药",
    "利水渗湿药",
    "温里药",
    "理气药",
    "活血化瘀药",
    "止血药",
    "化痰止咳平喘药",
    "安神药",
    "平肝息风药",
    "开窍药",
    "固涩药",
]

# ── 常用中成药关键词（保底覆盖） ─────────────────────────────────────────────
COMMON_PATENT_DRUGS = [
    # 心脑血管
    "复方丹参片", "丹参滴丸", "通心络胶囊", "麝香保心丸", "速效救心丸",
    "血府逐瘀口服液", "脑心通胶囊", "银杏叶片", "杏灵颗粒",
    "心可舒片", "稳心颗粒", "参松养心胶囊",
    # 呼吸系统
    "双黄连口服液", "连花清瘟胶囊", "板蓝根颗粒", "感冒灵颗粒",
    "急支糖浆", "川贝枇杷膏", "橘红痰咳液", "复方川贝精片",
    "通宣理肺丸", "玉屏风颗粒", "鼻炎康片", "藿香正气水",
    # 消化系统
    "健胃消食片", "保和丸", "香砂养胃丸", "胃苏颗粒",
    "三九胃泰颗粒", "气滞胃痛颗粒", "四磨汤口服液",
    "肠炎宁片", "黄连素片", "六味能消胶囊",
    # 肝胆
    "逍遥丸", "护肝片", "肝复乐片", "茵栀黄口服液",
    "利胆排石片", "消炎利胆片",
    # 骨伤科
    "云南白药", "跌打损伤丸", "接骨七厘散", "独活寄生丸",
    "骨刺片", "壮腰健肾丸", "金乌骨通胶囊",
    # 妇科
    "逍遥颗粒", "乌鸡白凤丸", "妇科千金片", "宫炎平胶囊",
    "艾附暖宫丸", "定坤丸",
    # 泌尿系统
    "三金片", "排石颗粒", "前列康片", "泌尿宁胶囊",
    # 糖尿病
    "消渴丸", "金芪降糖片", "糖脉康颗粒",
    # 神经/精神
    "安神补脑液", "归脾丸", "天王补心丸", "柏子养心丸",
    "脑乐静口服液",
    # 补益
    "六味地黄丸", "金匮肾气丸", "知柏地黄丸", "杞菊地黄丸",
    "生脉饮", "参苓白术散", "四君子丸", "补中益气丸",
    "归脾丸", "八珍颗粒", "人参归脾丸",
    # 外科/皮肤
    "马应龙麝香痔疮膏", "地榆槐角丸", "湿毒清胶囊",
]

# ── 常用中药饮片关键词（保底覆盖） ───────────────────────────────────────────
COMMON_HERBS = [
    # 补气药
    "人参", "党参", "太子参", "黄芪", "白术", "山药", "甘草", "大枣",
    # 补阳药
    "附子", "干姜", "肉桂", "鹿茸", "菟丝子", "补骨脂", "淫羊藿", "巴戟天",
    # 补阴药
    "麦冬", "天冬", "沙参", "玉竹", "百合", "石斛", "枸杞子", "女贞子",
    # 补血药
    "当归", "熟地黄", "白芍", "阿胶", "何首乌", "龙眼肉",
    # 解表药
    "麻黄", "桂枝", "荆芥", "防风", "柴胡", "葛根", "升麻", "薄荷", "牛蒡子",
    # 清热药
    "黄连", "黄芩", "黄柏", "龙胆草", "金银花", "连翘", "蒲公英",
    "大青叶", "板蓝根", "穿心莲", "栀子", "石膏", "知母",
    # 活血化瘀药
    "川芎", "丹参", "红花", "桃仁", "益母草", "牛膝", "乳香", "没药",
    "三七", "水蛭", "土鳖虫",
    # 止血药
    "三七", "白及", "仙鹤草", "茜草", "侧柏叶", "艾叶", "炮姜",
    # 化痰止咳平喘药
    "半夏", "天南星", "陈皮", "桔梗", "川贝母", "浙贝母", "杏仁",
    "苏子", "白芥子", "款冬花", "枇杷叶",
    # 利水渗湿药
    "茯苓", "泽泻", "薏苡仁", "猪苓", "车前子", "木通", "滑石",
    # 平肝息风药
    "天麻", "钩藤", "石决明", "牡蛎", "地龙", "全蝎", "蜈蚣",
    # 理气药
    "陈皮", "厚朴", "枳实", "枳壳", "木香", "香附", "川楝子", "沉香",
    # 祛湿药
    "苍术", "厚朴", "藿香", "佩兰", "砂仁", "豆蔻",
    # 泻下药
    "大黄", "芒硝", "番泻叶", "火麻仁", "郁李仁",
    # 安神药
    "酸枣仁", "柏子仁", "远志", "合欢皮", "朱砂", "磁石",
    # 消食药
    "山楂", "神曲", "麦芽", "莱菔子", "鸡内金",
]

# 章节名 → 字段映射
SECTION_MAP = {
    "indications": ["速查应用", "适应症", "适应证", "功能主治", "功效主治", "功能与主治",
                    "临床应用", "应用", "主治", "功能", "功效"],
    "dosage": ["用法用量", "用法", "剂量", "给药方法", "用量"],
    "contraindications": ["禁忌", "禁忌症", "禁忌证", "注意事项", "慎用"],
    "adverse_reactions": ["不良反应", "副作用", "毒副作用"],
    "pharmacology": ["药物说明", "药理作用", "作用机制", "性味归经", "炮制", "性状",
                     "化学成分", "药理毒理"],
    "special_population": ["特殊人群", "妊娠", "孕妇", "儿童用药", "老年用药"],
}


class DrugScraperTCM(BaseScraper):
    NAME = "drug_tcm"
    REQUEST_DELAY = (1.0, 2.5)

    def run(self):
        logger.info("=== 中药知识库爬取开始（中成药 + 中药饮片）===")

        # Step 1: 收集 URL
        patent_pages = self._collect_pages("中成药", TCM_PATENT_CATEGORIES, COMMON_PATENT_DRUGS,
                                           "tcm_patent_pages.json")
        herb_pages = self._collect_pages("中药饮片", TCM_HERB_CATEGORIES, COMMON_HERBS,
                                         "tcm_herb_pages.json")

        all_pages = patent_pages + herb_pages
        logger.info(f"共收集 {len(all_pages)} 个中药页面（中成药 {len(patent_pages)}，饮片 {len(herb_pages)}）")

        # Step 2: 逐条爬取
        raw = self._scrape_all(all_pages)
        self.save_raw("tcm_drugs_raw.json", raw)
        logger.info(f"原始中药数据：{len(raw)} 条")

        # Step 3: 清洗
        processed = self._process(raw)
        logger.info(f"清洗后中药数据：{len(processed)} 条")

        # Step 4: 与现有 drugs.json 合并
        merged = self._merge_with_existing(processed)
        self.save_processed("drugs.json", merged)
        logger.info(f"合并后药品总数：{len(merged)} 条")
        return merged

    # ── URL 收集 ──────────────────────────────────────────────────────────────

    def _collect_pages(self, drug_type: str, categories: list, keywords: list,
                       cache_filename: str) -> list[dict]:
        cache_path = RAW_DIR / cache_filename
        if cache_path.exists():
            with open(cache_path, encoding="utf-8") as f:
                pages = json.load(f)
            logger.info(f"从缓存加载 {drug_type} {len(pages)} 条")
            return pages

        pages_dict = {}

        # 1) 分类 API
        for cat in tqdm(categories, desc=f"获取{drug_type}分类"):
            try:
                members = self._get_category_members(cat)
                for m in members:
                    name = m.get("title", "").strip()
                    if name and ":" not in name:
                        url = f"{BASE_URL}/w/{urllib.parse.quote(name)}"
                        pages_dict[name] = {"name": name, "url": url, "drug_type": drug_type}
            except Exception as e:
                logger.warning(f"分类 '{cat}' 失败：{e}")

        # 2) 关键词保底
        for kw in keywords:
            if kw not in pages_dict:
                url = f"{BASE_URL}/w/{urllib.parse.quote(kw)}"
                pages_dict[kw] = {"name": kw, "url": url, "drug_type": drug_type}

        pages = list(pages_dict.values())
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(pages, f, ensure_ascii=False, indent=2)
        return pages

    def _get_category_members(self, category: str) -> list[dict]:
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

    # ── 详情爬取 ──────────────────────────────────────────────────────────────

    def _scrape_all(self, pages: list[dict]) -> list[dict]:
        raw = []
        raw_path = RAW_DIR / "tcm_drugs_raw.json"
        if raw_path.exists():
            with open(raw_path, encoding="utf-8") as f:
                raw = json.load(f)

        done_keys = {d.get("_url_key") for d in raw}

        for page in tqdm(pages, desc="爬取中药详情"):
            url = page["url"]
            key = url_to_key(url)
            if key in done_keys or self.is_done(key):
                continue
            try:
                drug = self._parse_drug_page(url, page["name"], page["drug_type"])
                if drug:
                    drug["_url_key"] = key
                    raw.append(drug)
                self.mark_done(key)
            except Exception as e:
                logger.warning(f"跳过 {url}：{e}")
                self.mark_failed(key, str(e))

            if len(raw) % 50 == 0 and raw:
                with open(raw_path, "w", encoding="utf-8") as f:
                    json.dump(raw, f, ensure_ascii=False, indent=2)

        self.flush_checkpoint()
        with open(raw_path, "w", encoding="utf-8") as f:
            json.dump(raw, f, ensure_ascii=False, indent=2)
        return raw

    def _parse_drug_page(self, url: str, name: str, drug_type: str) -> Optional[dict]:
        resp = self.get(url)
        if resp.status_code == 404:
            return None

        soup = BeautifulSoup(resp.text, "lxml")
        # a-hospital.com 使用 bodyContent（非 mw-content-text）
        content = (soup.find("div", {"id": "bodyContent"}) or
                   soup.find("div", {"id": "mw-content-text"}) or
                   soup.find("div", {"id": "content"}))
        if not content:
            return None

        # 检查是否是有效药品页面
        page_text = content.get_text()
        if len(page_text.strip()) < 80:
            return None

        # 提取药品简介（位于第一个h2之前的段落，通常是最关键的一句）
        intro = ""
        for p in content.find_all("p"):
            t = p.get_text(strip=True)
            if len(t) > 15 and name[:2] in t:
                intro = t[:500]
                break

        # 按 H2/H3 章节分割（a-hospital.com 章节名带药品前缀，需模糊匹配）
        sections = self._extract_sections(content)

        drug = {
            "name": name,
            "drug_type": drug_type,
            "category": self._infer_category(name, drug_type, page_text[:300]),
            "source": "杏林医学 (a-hospital.com)",
            "source_url": url,
        }

        # 简介作为适应症兜底
        if intro:
            drug["indications"] = intro

        # 模糊匹配章节名（章节名可能带药品名前缀）
        for field, section_names in SECTION_MAP.items():
            for sec_name in section_names:
                # 先尝试精确匹配，再尝试子串匹配
                matched_text = sections.get(sec_name)
                if not matched_text:
                    for sec_key, sec_val in sections.items():
                        if sec_name in sec_key:
                            matched_text = sec_val
                            break
                if matched_text:
                    drug[field] = self._clean_text(matched_text)
                    break

        # 如果字段仍为空，用全文兜底
        if not any(drug.get(f) for f in ["indications", "pharmacology", "dosage"]):
            full_text = self._clean_text(page_text)
            if len(full_text) < 50:
                return None
            drug["indications"] = full_text[:500]

        return drug

    def _extract_sections(self, content) -> dict:
        sections = {}
        current_section = None
        current_text = []

        for element in content.find_all(["h2", "h3", "p", "ul", "ol", "table"]):
            if element.name in ("h2", "h3"):
                if current_section and current_text:
                    sections[current_section] = " ".join(current_text)
                current_section = element.get_text(strip=True).rstrip("[编辑]").strip()
                current_text = []
            elif current_section:
                text = element.get_text(separator=" ", strip=True)
                if text:
                    current_text.append(text)

        if current_section and current_text:
            sections[current_section] = " ".join(current_text)

        return sections

    def _clean_text(self, text: str) -> str:
        text = re.sub(r"\s+", " ", text).strip()
        text = re.sub(r"\[编辑\]", "", text)
        text = re.sub(r"\[(\d+)\]", "", text)  # 去除引用标记
        return text[:2000]  # 限制字段长度

    def _infer_category(self, name: str, drug_type: str, text: str) -> str:
        """根据名称/文本推断药品分类"""
        if drug_type == "中药饮片":
            # 根据功效推断饮片分类
            keywords_map = [
                ("补气药", ["补气", "益气", "健脾"]),
                ("补阳药", ["温阳", "助阳", "补肾阳"]),
                ("补阴药", ["滋阴", "养阴", "补阴"]),
                ("补血药", ["补血", "养血", "生血"]),
                ("活血化瘀", ["活血", "化瘀", "行血"]),
                ("清热药", ["清热", "解毒", "泻火"]),
                ("解表药", ["发散", "解表", "发汗"]),
                ("化痰止咳", ["化痰", "止咳", "平喘"]),
                ("利水渗湿", ["利水", "渗湿", "通淋"]),
                ("安神药", ["安神", "宁心", "镇静"]),
            ]
            combined = (name + text)[:200]
            for cat, kws in keywords_map:
                if any(kw in combined for kw in kws):
                    return f"中药饮片/{cat}"
            return "中药饮片"
        else:
            # 中成药分类
            keywords_map = [
                ("中成药/心脑血管", ["心", "脑", "血管", "血压", "心肌"]),
                ("中成药/呼吸", ["肺", "咳", "喘", "感冒", "鼻"]),
                ("中成药/消化", ["胃", "肠", "消化", "食积", "便"]),
                ("中成药/妇科", ["妇", "月经", "子宫", "妇科"]),
                ("中成药/骨伤", ["骨", "关节", "跌打", "腰"]),
                ("中成药/补益", ["补", "益气", "滋阴", "补肾"]),
                ("中成药/肝胆", ["肝", "胆", "黄疸"]),
                ("中成药/泌尿", ["肾", "膀胱", "尿"]),
            ]
            combined = (name + text)[:200]
            for cat, kws in keywords_map:
                if any(kw in combined for kw in kws):
                    return cat
            return "中成药"

    # ── 清洗 ──────────────────────────────────────────────────────────────────

    def _process(self, raw: list[dict]) -> list[dict]:
        processed = []
        seen = set()
        for item in raw:
            name = item.get("name", "").strip()
            if not name or name in seen:
                continue
            seen.add(name)

            drug = {
                "name": name,
                "drug_type": item.get("drug_type", "中成药"),
                "category": item.get("category", "中药"),
                "indications": item.get("indications", ""),
                "dosage": item.get("dosage", ""),
                "contraindications": item.get("contraindications", ""),
                "adverse_reactions": item.get("adverse_reactions", ""),
                "pharmacology": item.get("pharmacology", ""),
                "special_population": item.get("special_population", ""),
                "interactions": item.get("interactions", ""),
                "source": item.get("source", "杏林医学 (a-hospital.com)"),
                "source_url": item.get("source_url", ""),
            }

            # 过滤空条目（至少需要 indications 或 pharmacology）
            if drug["indications"] or drug["pharmacology"]:
                processed.append(drug)

        return processed

    # ── 合并 ──────────────────────────────────────────────────────────────────

    def _merge_with_existing(self, new_drugs: list[dict]) -> list[dict]:
        existing_path = PROCESSED_DIR / "drugs.json"
        existing = []
        if existing_path.exists():
            with open(existing_path, encoding="utf-8") as f:
                existing = json.load(f)

        existing_names = {d.get("name", "") for d in existing}
        added = 0
        for drug in new_drugs:
            if drug["name"] not in existing_names:
                existing.append(drug)
                existing_names.add(drug["name"])
                added += 1

        logger.info(f"新增中药 {added} 条，总药品数 {len(existing)} 条")
        return existing


if __name__ == "__main__":
    scraper = DrugScraperTCM()
    result = scraper.run()
    print(f"[OK] 中药知识库完成：{len(result)} 条（含中成药+中药饮片）")
