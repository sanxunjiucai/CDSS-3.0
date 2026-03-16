"""
检验检查知识库爬虫
来源：
  1. 默沙东诊疗手册中文版 - 实验室正常参考值页面
     https://www.msdmanuals.cn/professional/resources/normal-laboratory-values
  2. 内置标准数据（国家卫健委 WS/T 系列行业标准）

输出字段（对应 backend/db/models/exam.py）：
  name, code, type(lab/exam), description,
  reference_ranges (JSON), clinical_significance,
  indications, preparation
"""

import re
import json
from pathlib import Path
from typing import Optional

from loguru import logger
from tqdm import tqdm
from bs4 import BeautifulSoup

from base_scraper import BaseScraper, RAW_DIR, PROCESSED_DIR

MSD_LAB_BASE = "https://www.msdmanuals.cn/professional/resources/normal-laboratory-values"

# MSD 实验室参考值各分类页
MSD_LAB_PAGES = [
    f"{MSD_LAB_BASE}/normal-laboratory-values",   # 主汇总页（含血液）
    f"{MSD_LAB_BASE}/urine-tests-normal-values",
    f"{MSD_LAB_BASE}/stool-tests-normal-values",
    f"{MSD_LAB_BASE}/commonly-used-panels",
]


class ExamScraper(BaseScraper):
    NAME = "exam"
    REQUEST_DELAY = (2.0, 3.5)

    def run(self):
        logger.info("=== 检验检查知识库爬取开始 ===")

        # Part 1: 从 MSD 爬取参考值
        msd_items = self._scrape_msd_lab_values()

        # Part 2: 内置卫健委标准数据（血常规、生化、凝血等核心项目）
        builtin_items = self._get_builtin_lab_standards()

        # 合并去重
        all_items = self._merge(msd_items, builtin_items)
        self.save_raw("exams_raw.json", all_items)

        # 清洗
        processed = self._process(all_items)
        self.save_processed("exams.json", processed)
        return processed

    # ── MSD 爬取 ──────────────────────────────────────────────────────────────

    def _scrape_msd_lab_values(self) -> list[dict]:
        items = []
        for url in tqdm(MSD_LAB_PAGES, desc="爬取MSD参考值"):
            if self.is_done(url):
                continue
            try:
                soup = self.get_soup(url)
                page_items = self._parse_lab_table(soup, url)
                items.extend(page_items)
                logger.info(f"{url.split('/')[-1]}：{len(page_items)} 条")
                self.mark_done(url)
            except Exception as e:
                logger.warning(f"跳过 {url}：{e}")
                self.mark_failed(url, str(e))
        return items

    def _parse_lab_table(self, soup: BeautifulSoup, url: str) -> list[dict]:
        """解析 MSD 参考值页面中的表格"""
        items = []
        tables = soup.find_all("table")

        for table in tables:
            rows = table.find_all("tr")
            headers = []

            for i, row in enumerate(rows):
                cells = row.find_all(["th", "td"])
                texts = [c.get_text(strip=True) for c in cells]

                if i == 0 or any(
                    kw in " ".join(texts).lower()
                    for kw in ["检验项目", "参考", "单位", "test", "reference", "unit"]
                ):
                    headers = texts
                    continue

                if len(texts) < 2:
                    continue

                item = self._row_to_exam(texts, headers, url)
                if item:
                    items.append(item)

        # 如果没有表格，尝试解析定义列表
        if not items:
            items = self._parse_definition_list(soup, url)

        return items

    def _row_to_exam(self, cells: list, headers: list, url: str) -> Optional[dict]:
        """将表格行转为检验项目字典"""
        if not cells[0].strip():
            return None

        name = cells[0].strip()
        # 过滤非项目名行
        if len(name) < 2 or name.isdigit():
            return None

        # 提取参考范围
        reference_ranges = []
        unit = ""

        # 尝试按列名解析
        if headers:
            row_dict = dict(zip(headers, cells))
            for k, v in row_dict.items():
                k_lower = k.lower()
                if "单位" in k or "unit" in k_lower:
                    unit = v
                elif "参考" in k or "normal" in k_lower or "reference" in k_lower or "range" in k_lower:
                    ref = self._parse_range_text(v, unit)
                    if ref:
                        reference_ranges.append(ref)
                elif "男" in k or "male" in k_lower:
                    ref = self._parse_range_text(v, unit, gender="M")
                    if ref:
                        reference_ranges.append(ref)
                elif "女" in k or "female" in k_lower:
                    ref = self._parse_range_text(v, unit, gender="F")
                    if ref:
                        reference_ranges.append(ref)
        else:
            # 无表头，尝试从第2列解析
            if len(cells) >= 2:
                ref = self._parse_range_text(cells[1], unit)
                if ref:
                    reference_ranges.append(ref)
            if len(cells) >= 3:
                unit = cells[2]

        return {
            "name": name,
            "code": "",
            "type": "lab",
            "description": "",
            "unit": unit,
            "reference_ranges": reference_ranges,
            "clinical_significance": "",
            "indications": "",
            "preparation": "",
            "source_url": url,
        }

    def _parse_range_text(self, text: str, unit: str = "",
                          gender: str = "", condition: str = "") -> Optional[dict]:
        """解析参考范围文本，返回标准化 dict"""
        text = text.strip()
        if not text or text in ["-", "—", "N/A", "/"]:
            return None

        result = {
            "gender": gender,    # M/F/空=不限
            "age_min": None,
            "age_max": None,
            "unit": unit,
            "low": None,
            "high": None,
            "condition": condition,
            "text": text,        # 原始文本备用
        }

        # 数值范围：如 "4.5–11.0" 或 "4.5-11.0"
        m = re.search(r"([\d.]+)\s*[–—\-~～]\s*([\d.]+)", text)
        if m:
            result["low"] = float(m.group(1))
            result["high"] = float(m.group(2))

        # 上限：如 "< 100" 或 "≤100"
        elif re.search(r"[<＜≤]\s*([\d.]+)", text):
            m2 = re.search(r"[<＜≤]\s*([\d.]+)", text)
            result["high"] = float(m2.group(1))

        # 下限：如 "> 60"
        elif re.search(r"[>＞≥]\s*([\d.]+)", text):
            m2 = re.search(r"[>＞≥]\s*([\d.]+)", text)
            result["low"] = float(m2.group(1))

        return result

    def _parse_definition_list(self, soup: BeautifulSoup, url: str) -> list[dict]:
        """解析定义列表格式的参考值"""
        items = []
        for dt in soup.find_all("dt"):
            dd = dt.find_next_sibling("dd")
            if dt and dd:
                item = {
                    "name": dt.get_text(strip=True),
                    "code": "",
                    "type": "lab",
                    "description": "",
                    "unit": "",
                    "reference_ranges": [],
                    "clinical_significance": dd.get_text(strip=True),
                    "indications": "",
                    "preparation": "",
                    "source_url": url,
                }
                items.append(item)
        return items

    # ── 内置标准数据（卫健委 WS/T 系列）──────────────────────────────────────

    def _get_builtin_lab_standards(self) -> list[dict]:
        """
        内置核心检验项目标准参考值
        数据来源：
        - WS/T 405-2012 血细胞分析参考区间
        - WS/T 404系列 常用生化检验项目参考区间
        - WS/T 780-2021 儿童生化检验参考区间
        """
        return BUILTIN_LAB_STANDARDS

    # ── 合并去重 ──────────────────────────────────────────────────────────────

    def _merge(self, msd: list, builtin: list) -> list[dict]:
        result = {item["name"]: item for item in builtin}  # 内置优先
        for item in msd:
            if item["name"] not in result:
                result[item["name"]] = item
        return list(result.values())

    # ── 数据清洗 ──────────────────────────────────────────────────────────────

    def _process(self, raw: list[dict]) -> list[dict]:
        processed = []
        for item in raw:
            name = item.get("name", "").strip()
            if not name:
                continue
            processed.append({
                "name": name,
                "code": item.get("code", ""),
                "type": item.get("type", "lab"),
                "description": item.get("description", ""),
                "unit": item.get("unit", ""),
                "reference_ranges": item.get("reference_ranges", []),
                "clinical_significance": item.get("clinical_significance", ""),
                "indications": item.get("indications", ""),
                "preparation": item.get("preparation", ""),
                "source": item.get("source", "默沙东诊疗手册"),
                "source_url": item.get("source_url", ""),
            })
        logger.info(f"清洗后：{len(processed)} 条检验检查记录")
        return processed


# ═══════════════════════════════════════════════════════════════════════════════
# 内置标准数据（核心检验项目）
# 来源：卫健委行业标准 WS/T 系列
# ═══════════════════════════════════════════════════════════════════════════════
BUILTIN_LAB_STANDARDS = [
    # ── 血常规 ──────────────────────────────────────────────────────────────
    {
        "name": "白细胞计数（WBC）",
        "code": "WBC",
        "type": "lab",
        "description": "白细胞是血液中的免疫细胞，主要功能是防御感染。",
        "unit": "×10⁹/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 3.5, "high": 9.5, "unit": "×10⁹/L", "condition": "成人", "text": "3.5–9.5"},
            {"gender": "", "age_min": 0, "age_max": 28, "low": 15.0, "high": 20.0, "unit": "×10⁹/L", "condition": "新生儿", "text": "15.0–20.0"},
        ],
        "clinical_significance": "升高见于细菌感染、炎症、白血病；降低见于病毒感染、骨髓抑制、自身免疫病。",
        "indications": "感染筛查、血液病筛查、化疗监测",
        "preparation": "无特殊准备，避免剧烈运动后立即采血",
        "source": "WS/T 405-2012",
    },
    {
        "name": "红细胞计数（RBC）",
        "code": "RBC",
        "type": "lab",
        "description": "红细胞负责携带氧气从肺部输送到全身组织。",
        "unit": "×10¹²/L",
        "reference_ranges": [
            {"gender": "M", "age_min": 18, "age_max": None, "low": 4.3, "high": 5.8, "unit": "×10¹²/L", "condition": "成年男性", "text": "4.3–5.8"},
            {"gender": "F", "age_min": 18, "age_max": None, "low": 3.8, "high": 5.1, "unit": "×10¹²/L", "condition": "成年女性", "text": "3.8–5.1"},
        ],
        "clinical_significance": "升高见于真性红细胞增多症、高原居住；降低见于各类贫血。",
        "indications": "贫血评估、红细胞增多症诊断",
        "preparation": "无特殊要求",
        "source": "WS/T 405-2012",
    },
    {
        "name": "血红蛋白（HGB/Hb）",
        "code": "HGB",
        "type": "lab",
        "description": "血红蛋白是红细胞中负责携氧的蛋白质。",
        "unit": "g/L",
        "reference_ranges": [
            {"gender": "M", "age_min": 18, "age_max": None, "low": 130, "high": 175, "unit": "g/L", "condition": "成年男性", "text": "130–175"},
            {"gender": "F", "age_min": 18, "age_max": None, "low": 115, "high": 150, "unit": "g/L", "condition": "成年女性", "text": "115–150"},
            {"gender": "", "age_min": 0, "age_max": 28, "low": 170, "high": 200, "unit": "g/L", "condition": "新生儿", "text": "170–200"},
        ],
        "clinical_significance": "降低（贫血）：<120g/L（女）/<130g/L（男）；升高：见于脱水、红细胞增多症。",
        "indications": "贫血诊断与分级、手术前评估",
        "preparation": "无特殊要求",
        "source": "WS/T 405-2012",
    },
    {
        "name": "血小板计数（PLT）",
        "code": "PLT",
        "type": "lab",
        "description": "血小板参与止血过程，通过聚集形成血凝块。",
        "unit": "×10⁹/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 100, "high": 300, "unit": "×10⁹/L", "condition": "成人", "text": "100–300"},
        ],
        "clinical_significance": "<100×10⁹/L为血小板减少；>400×10⁹/L为血小板增多。<50时出血风险显著增加。",
        "indications": "出血倾向评估、血液病筛查、化疗监测",
        "preparation": "无特殊要求",
        "source": "WS/T 405-2012",
    },
    {
        "name": "中性粒细胞百分比（NEUT%）",
        "code": "NEUT%",
        "type": "lab",
        "description": "中性粒细胞是最主要的抗感染白细胞。",
        "unit": "%",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 40, "high": 75, "unit": "%", "condition": "成人", "text": "40–75%"},
        ],
        "clinical_significance": "升高：细菌感染、炎症、应激；降低：病毒感染、粒细胞缺乏。",
        "indications": "感染类型鉴别",
        "preparation": "无特殊要求",
        "source": "WS/T 405-2012",
    },
    {
        "name": "淋巴细胞百分比（LYMPH%）",
        "code": "LYMPH%",
        "type": "lab",
        "description": "淋巴细胞包括T细胞、B细胞，参与适应性免疫。",
        "unit": "%",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 20, "high": 50, "unit": "%", "condition": "成人", "text": "20–50%"},
        ],
        "clinical_significance": "升高：病毒感染、淋巴细胞白血病；降低：化疗、免疫抑制。",
        "indications": "感染类型鉴别、免疫评估",
        "preparation": "无特殊要求",
        "source": "WS/T 405-2012",
    },
    # ── 肝功能 ──────────────────────────────────────────────────────────────
    {
        "name": "丙氨酸氨基转移酶（ALT）",
        "code": "ALT",
        "type": "lab",
        "description": "ALT主要存在于肝细胞中，是肝损伤的高度特异性指标。",
        "unit": "U/L",
        "reference_ranges": [
            {"gender": "M", "age_min": 18, "age_max": None, "low": 9, "high": 50, "unit": "U/L", "condition": "成年男性", "text": "9–50"},
            {"gender": "F", "age_min": 18, "age_max": None, "low": 7, "high": 40, "unit": "U/L", "condition": "成年女性", "text": "7–40"},
        ],
        "clinical_significance": "显著升高（>3倍正常值上限）提示急性肝损伤、肝炎、药物性肝损害。",
        "indications": "肝病筛查、药物肝毒性监测、肝炎随访",
        "preparation": "空腹8小时采血",
        "source": "WS/T 404.1-2012",
    },
    {
        "name": "天冬氨酸氨基转移酶（AST）",
        "code": "AST",
        "type": "lab",
        "description": "AST存在于心肌、肝脏、骨骼肌中，特异性低于ALT。",
        "unit": "U/L",
        "reference_ranges": [
            {"gender": "M", "age_min": 18, "age_max": None, "low": 15, "high": 40, "unit": "U/L", "condition": "成年男性", "text": "15–40"},
            {"gender": "F", "age_min": 18, "age_max": None, "low": 13, "high": 35, "unit": "U/L", "condition": "成年女性", "text": "13–35"},
        ],
        "clinical_significance": "AST/ALT>2提示酒精性肝病；心梗时AST升高早于ALT。",
        "indications": "肝病评估、心肌损伤鉴别",
        "preparation": "空腹8小时采血",
        "source": "WS/T 404.1-2012",
    },
    {
        "name": "总胆红素（TBIL）",
        "code": "TBIL",
        "type": "lab",
        "description": "总胆红素是直接胆红素和间接胆红素之和，反映胆红素代谢。",
        "unit": "μmol/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 3.4, "high": 17.1, "unit": "μmol/L", "condition": "成人", "text": "3.4–17.1"},
            {"gender": "", "age_min": 0, "age_max": 28, "low": None, "high": 220, "unit": "μmol/L", "condition": "新生儿（生理性黄疸上限）", "text": "<220"},
        ],
        "clinical_significance": "升高见于肝炎、胆道梗阻、溶血性疾病。>34μmol/L时临床出现黄疸。",
        "indications": "黄疸鉴别诊断、肝功能评估",
        "preparation": "空腹8小时，避光处理",
        "source": "WS/T 404.2-2012",
    },
    {
        "name": "白蛋白（ALB）",
        "code": "ALB",
        "type": "lab",
        "description": "白蛋白是血浆中含量最多的蛋白质，反映肝脏合成功能和营养状态。",
        "unit": "g/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 40, "high": 55, "unit": "g/L", "condition": "成人", "text": "40–55"},
        ],
        "clinical_significance": "<35g/L为低蛋白血症，见于肝硬化、肾病综合征、营养不良。",
        "indications": "肝功能评估、营养状态评估、慢性病预后",
        "preparation": "无特殊要求（避免溶血）",
        "source": "WS/T 404.2-2012",
    },
    # ── 肾功能 ──────────────────────────────────────────────────────────────
    {
        "name": "血肌酐（SCr）",
        "code": "SCr",
        "type": "lab",
        "description": "肌酐是肌肉代谢产物，经肾小球滤过排出，是评估肾功能的核心指标。",
        "unit": "μmol/L",
        "reference_ranges": [
            {"gender": "M", "age_min": 18, "age_max": None, "low": 57, "high": 111, "unit": "μmol/L", "condition": "成年男性", "text": "57–111"},
            {"gender": "F", "age_min": 18, "age_max": None, "low": 41, "high": 81, "unit": "μmol/L", "condition": "成年女性", "text": "41–81"},
        ],
        "clinical_significance": "升高提示肾功能损害，结合eGFR分期；急性升高提示AKI。",
        "indications": "肾功能筛查、CKD分期、肾毒性药物监测",
        "preparation": "清晨空腹，避免大量肉食",
        "source": "WS/T 404.3-2012",
    },
    {
        "name": "血尿素氮（BUN）",
        "code": "BUN",
        "type": "lab",
        "description": "尿素氮是蛋白质代谢终产物，反映肾小球滤过功能。",
        "unit": "mmol/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 3.1, "high": 8.0, "unit": "mmol/L", "condition": "成人", "text": "3.1–8.0"},
        ],
        "clinical_significance": "升高见于肾功能不全、高蛋白饮食、上消化道出血；降低见于低蛋白饮食、肝衰竭。",
        "indications": "肾功能评估、蛋白质代谢评估",
        "preparation": "空腹8小时，避免高蛋白饮食",
        "source": "WS/T 404.3-2012",
    },
    {
        "name": "尿酸（UA）",
        "code": "UA",
        "type": "lab",
        "description": "尿酸是嘌呤代谢终产物，高尿酸血症与痛风密切相关。",
        "unit": "μmol/L",
        "reference_ranges": [
            {"gender": "M", "age_min": 18, "age_max": None, "low": 208, "high": 428, "unit": "μmol/L", "condition": "成年男性", "text": "208–428"},
            {"gender": "F", "age_min": 18, "age_max": None, "low": 155, "high": 357, "unit": "μmol/L", "condition": "成年女性", "text": "155–357"},
        ],
        "clinical_significance": ">420μmol/L（男）/>360μmol/L（女）为高尿酸血症，痛风风险增加。",
        "indications": "痛风筛查与随访、肾功能评估",
        "preparation": "空腹，避免高嘌呤食物",
        "source": "WS/T 404.3-2012",
    },
    # ── 血糖血脂 ──────────────────────────────────────────────────────────────
    {
        "name": "空腹血糖（FBG/GLU）",
        "code": "FBG",
        "type": "lab",
        "description": "空腹血糖是诊断糖尿病和糖代谢异常的基础指标。",
        "unit": "mmol/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 3.9, "high": 6.1, "unit": "mmol/L", "condition": "正常空腹", "text": "3.9–6.1"},
            {"gender": "", "age_min": 18, "age_max": None, "low": 6.1, "high": 7.0, "unit": "mmol/L", "condition": "空腹血糖受损（IFG）", "text": "6.1–7.0"},
        ],
        "clinical_significance": "≥7.0mmol/L（两次）可诊断糖尿病；6.1-7.0为IFG（糖调节受损）。",
        "indications": "糖尿病筛查与诊断、血糖监测",
        "preparation": "空腹8–10小时",
        "source": "WS/T 404.4-2012",
    },
    {
        "name": "糖化血红蛋白（HbA1c）",
        "code": "HbA1c",
        "type": "lab",
        "description": "反映过去2-3个月平均血糖水平，是糖尿病长期控制的金标准指标。",
        "unit": "%",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 6.0, "unit": "%", "condition": "正常", "text": "<6.0%"},
            {"gender": "", "age_min": 18, "age_max": None, "low": 6.0, "high": 6.5, "unit": "%", "condition": "糖尿病前期", "text": "6.0–6.5%"},
        ],
        "clinical_significance": "≥6.5%支持糖尿病诊断；糖尿病患者控制目标通常<7%。",
        "indications": "糖尿病诊断、血糖长期控制评估",
        "preparation": "无需空腹",
        "source": "WS/T 461-2015",
    },
    {
        "name": "总胆固醇（TC）",
        "code": "TC",
        "type": "lab",
        "description": "总胆固醇包括LDL、HDL等各类胆固醇，是心血管风险评估基础指标。",
        "unit": "mmol/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 5.2, "unit": "mmol/L", "condition": "合适水平", "text": "<5.2"},
            {"gender": "", "age_min": 18, "age_max": None, "low": 5.2, "high": 6.2, "unit": "mmol/L", "condition": "边缘升高", "text": "5.2–6.2"},
        ],
        "clinical_significance": "≥6.2mmol/L为高胆固醇血症，心血管疾病风险显著增加。",
        "indications": "心血管风险评估、血脂异常筛查",
        "preparation": "空腹12小时，3天内保持普通饮食",
        "source": "WS/T 404.6-2015",
    },
    {
        "name": "低密度脂蛋白胆固醇（LDL-C）",
        "code": "LDL-C",
        "type": "lab",
        "description": "LDL-C是动脉粥样硬化的核心风险因素，俗称'坏胆固醇'。",
        "unit": "mmol/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 3.4, "unit": "mmol/L", "condition": "合适水平（一般人群）", "text": "<3.4"},
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 1.8, "unit": "mmol/L", "condition": "目标值（心血管高危）", "text": "<1.8"},
        ],
        "clinical_significance": "是他汀类药物治疗的主要靶点；心血管高危患者目标<1.8mmol/L。",
        "indications": "心血管风险分层、血脂治疗监测",
        "preparation": "空腹12小时",
        "source": "WS/T 404.6-2015",
    },
    {
        "name": "高密度脂蛋白胆固醇（HDL-C）",
        "code": "HDL-C",
        "type": "lab",
        "description": "HDL-C具有心血管保护作用，俗称'好胆固醇'。",
        "unit": "mmol/L",
        "reference_ranges": [
            {"gender": "M", "age_min": 18, "age_max": None, "low": 1.0, "high": None, "unit": "mmol/L", "condition": "成年男性（最低值）", "text": "≥1.0"},
            {"gender": "F", "age_min": 18, "age_max": None, "low": 1.3, "high": None, "unit": "mmol/L", "condition": "成年女性（最低值）", "text": "≥1.3"},
        ],
        "clinical_significance": "<1.0mmol/L（男）/<1.3mmol/L（女）为低HDL-C，心血管风险增加。",
        "indications": "心血管风险评估",
        "preparation": "空腹12小时",
        "source": "WS/T 404.6-2015",
    },
    {
        "name": "甘油三酯（TG）",
        "code": "TG",
        "type": "lab",
        "description": "甘油三酯是血脂的重要组成，与代谢综合征和胰腺炎相关。",
        "unit": "mmol/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 1.7, "unit": "mmol/L", "condition": "合适水平", "text": "<1.7"},
            {"gender": "", "age_min": 18, "age_max": None, "low": 1.7, "high": 2.3, "unit": "mmol/L", "condition": "边缘升高", "text": "1.7–2.3"},
        ],
        "clinical_significance": "≥5.6mmol/L急性胰腺炎风险显著增加。",
        "indications": "代谢综合征筛查、胰腺炎风险评估",
        "preparation": "空腹12小时，3天内避免高脂饮食和饮酒",
        "source": "WS/T 404.6-2015",
    },
    # ── 凝血功能 ──────────────────────────────────────────────────────────────
    {
        "name": "凝血酶原时间（PT）",
        "code": "PT",
        "type": "lab",
        "description": "PT反映外源性凝血途径功能，用于评估肝脏合成凝血因子能力。",
        "unit": "s",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 11, "high": 14, "unit": "s", "condition": "成人", "text": "11–14s"},
        ],
        "clinical_significance": "延长见于肝功能损害、维生素K缺乏、华法林治疗。INR=PT/正常对照PT。",
        "indications": "抗凝治疗监测（华法林）、术前评估、肝功能评估",
        "preparation": "采血前不做剧烈运动",
        "source": "WS/T 406-2024",
    },
    {
        "name": "活化部分凝血活酶时间（APTT）",
        "code": "APTT",
        "type": "lab",
        "description": "APTT反映内源性凝血途径功能，用于肝素治疗监测。",
        "unit": "s",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 25, "high": 35, "unit": "s", "condition": "成人", "text": "25–35s"},
        ],
        "clinical_significance": "延长见于因子缺乏、肝素过量、DIC；用于监测普通肝素治疗（目标1.5-2.5倍正常值）。",
        "indications": "肝素治疗监测、出血性疾病筛查",
        "preparation": "采血前不做剧烈运动",
        "source": "WS/T 406-2024",
    },
    {
        "name": "D-二聚体（D-Dimer）",
        "code": "D-Dimer",
        "type": "lab",
        "description": "D-二聚体是纤维蛋白降解产物，反映体内纤溶活性。",
        "unit": "μg/L（FEU）",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 500, "unit": "μg/L", "condition": "正常（FEU）", "text": "<500"},
        ],
        "clinical_significance": "升高见于DVT、PE、DIC、感染；阴性可排除DVT/PE（敏感性高，特异性低）。",
        "indications": "DVT/PE筛查（排除诊断）、DIC诊断",
        "preparation": "无特殊要求",
        "source": "WS/T 406-2024",
    },
    # ── 电解质 ──────────────────────────────────────────────────────────────
    {
        "name": "血钠（Na⁺）",
        "code": "Na",
        "type": "lab",
        "description": "钠是细胞外液的主要阳离子，维持渗透压和水平衡。",
        "unit": "mmol/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 137, "high": 147, "unit": "mmol/L", "condition": "成人", "text": "137–147"},
        ],
        "clinical_significance": "<135低钠血症；>145高钠血症，两者均需评估液体状态。",
        "indications": "水电解质平衡评估、神经系统症状鉴别",
        "preparation": "无特殊要求",
        "source": "WS/T 404.5-2015",
    },
    {
        "name": "血钾（K⁺）",
        "code": "K",
        "type": "lab",
        "description": "钾是细胞内液的主要阳离子，对心肌电生理至关重要。",
        "unit": "mmol/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 3.5, "high": 5.3, "unit": "mmol/L", "condition": "成人", "text": "3.5–5.3"},
        ],
        "clinical_significance": "<3.5低钾血症（肌无力、心律失常）；>5.5高钾血症（致命性心律失常风险）。",
        "indications": "电解质紊乱评估、利尿剂治疗监测、肾功能评估",
        "preparation": "避免溶血（溶血可导致假性高钾）",
        "source": "WS/T 404.5-2015",
    },
    # ── 心肌标志物 ──────────────────────────────────────────────────────────
    {
        "name": "肌钙蛋白I（cTnI）",
        "code": "cTnI",
        "type": "lab",
        "description": "心肌特异性标志物，心肌损伤时释放入血，是AMI诊断的金标准。",
        "unit": "ng/mL",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 0.04, "unit": "ng/mL", "condition": "正常上限（第99百分位）", "text": "<0.04"},
        ],
        "clinical_significance": ">正常上限99th百分位，结合临床症状和ECG，诊断NSTEMI/STEMI。",
        "indications": "急性心肌梗死诊断、心肌损伤评估",
        "preparation": "急诊检测，无需空腹",
        "source": "ACC/AHA指南",
    },
    {
        "name": "B型脑钠肽（BNP）",
        "code": "BNP",
        "type": "lab",
        "description": "BNP由心室肌细胞分泌，反映心室壁张力，是心衰的生物标志物。",
        "unit": "pg/mL",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 100, "unit": "pg/mL", "condition": "心衰排除（BNP）", "text": "<100"},
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 300, "unit": "pg/mL", "condition": "心衰排除（NT-proBNP）", "text": "<300（NT-proBNP）"},
        ],
        "clinical_significance": "<100pg/mL基本排除心衰；>400pg/mL高度提示心衰失代偿。",
        "indications": "心衰诊断与分级、心衰治疗监测、急性呼吸困难鉴别",
        "preparation": "无特殊要求",
        "source": "中国心力衰竭诊断和治疗指南2018",
    },
    # ── 甲状腺功能 ──────────────────────────────────────────────────────────
    {
        "name": "促甲状腺激素（TSH）",
        "code": "TSH",
        "type": "lab",
        "description": "TSH是筛查甲状腺功能最敏感的指标。",
        "unit": "mIU/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 0.27, "high": 4.2, "unit": "mIU/L", "condition": "成人", "text": "0.27–4.2"},
            {"gender": "F", "age_min": 0, "age_max": None, "low": 0.1, "high": 2.5, "unit": "mIU/L", "condition": "孕早期目标值", "text": "0.1–2.5（孕早期）"},
        ],
        "clinical_significance": "升高提示甲减；降低提示甲亢。TSH异常时进一步查FT4/FT3。",
        "indications": "甲状腺功能筛查、甲状腺激素替代治疗监测",
        "preparation": "无特殊要求，建议清晨采血",
        "source": "WS/T 404.7-2015",
    },
    {
        "name": "游离甲状腺素（FT4）",
        "code": "FT4",
        "type": "lab",
        "description": "FT4是生理活性甲状腺激素，不受甲状腺结合蛋白影响。",
        "unit": "pmol/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": 12, "high": 22, "unit": "pmol/L", "condition": "成人", "text": "12–22"},
        ],
        "clinical_significance": "降低（+TSH升高）=甲减；升高（+TSH降低）=甲亢。",
        "indications": "甲状腺功能异常进一步评估",
        "preparation": "无特殊要求",
        "source": "WS/T 404.7-2015",
    },
    # ── 炎症标志物 ──────────────────────────────────────────────────────────
    {
        "name": "C反应蛋白（CRP）",
        "code": "CRP",
        "type": "lab",
        "description": "急性时相反应蛋白，感染/炎症时迅速升高，半衰期19小时。",
        "unit": "mg/L",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 10, "unit": "mg/L", "condition": "正常", "text": "<10"},
        ],
        "clinical_significance": "10–100：局部细菌感染/炎症；>100：严重细菌感染/脓毒症。病毒感染通常轻度升高。",
        "indications": "感染和炎症评估、治疗反应监测",
        "preparation": "无特殊要求",
        "source": "WS/T 404-2012",
    },
    {
        "name": "降钙素原（PCT）",
        "code": "PCT",
        "type": "lab",
        "description": "细菌感染特异性标志物，对脓毒症诊断和抗生素治疗指导有价值。",
        "unit": "ng/mL",
        "reference_ranges": [
            {"gender": "", "age_min": 18, "age_max": None, "low": None, "high": 0.1, "unit": "ng/mL", "condition": "正常", "text": "<0.1"},
            {"gender": "", "age_min": 18, "age_max": None, "low": 0.1, "high": 0.5, "unit": "ng/mL", "condition": "低度细菌感染风险", "text": "0.1–0.5"},
        ],
        "clinical_significance": ">0.5：中高度细菌感染；>2：脓毒症可能；>10：严重脓毒症/感染性休克。",
        "indications": "脓毒症诊断、抗生素治疗指导（停药时机）",
        "preparation": "无特殊要求",
        "source": "中国脓毒症指南",
    },
]


if __name__ == "__main__":
    scraper = ExamScraper()
    result = scraper.run()
    print(f"\n[OK] exam done: {len(result)} records")
