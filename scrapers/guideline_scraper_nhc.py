"""
临床指南爬虫 —— 国家卫生健康委员会（NHC）官网
来源：
  http://www.nhc.gov.cn/yzygj/s7659/new_list.shtml  （诊疗规范/临床路径）
  http://www.nhc.gov.cn/yzygj/s7653/new_list.shtml  （卫生标准）
  http://www.nhc.gov.cn/ylyjs/pqt/new_list.shtml    （临床诊疗指南）

特点：
- 完全公开免费，官方权威
- 包含临床诊疗指南全文 PDF + 部分 HTML 正文
- 补充 medlive.cn 的内容（medlive 全文需付费）

输出：并入 data/processed/guidelines.json
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

NHC_BASE = "http://www.nhc.gov.cn"

# NHC 指南/规范列表页（每页约20条）
NHC_LIST_URLS = [
    # 临床诊疗指南
    {"base": f"{NHC_BASE}/yzygj/s7659/new_list.shtml", "section": "诊疗规范", "pages": 30},
    # 疾病防治相关
    {"base": f"{NHC_BASE}/jkj/s5873/new_list.shtml",   "section": "疾病防治", "pages": 20},
    # 医疗服务标准
    {"base": f"{NHC_BASE}/yzygj/s3593/new_list.shtml", "section": "卫生标准", "pages": 20},
]

# 分页 URL 格式
# 第1页：new_list.shtml
# 第2页：new_list_1.shtml
# 第N页：new_list_{N-1}.shtml


class NHCGuidelineScraper(BaseScraper):
    """NHC官网临床指南/诊疗规范爬虫"""

    NAME = "guideline_nhc"
    REQUEST_DELAY = (2.0, 4.0)   # 政府网站限速宽松，但礼貌性延迟

    def run(self):
        logger.info("=== NHC临床指南爬虫开始 ===")

        # Step 1: 收集所有文章链接
        all_items = self._collect_all_urls()
        logger.info(f"NHC共收集 {len(all_items)} 个指南链接")

        # Step 2: 爬取每篇详情
        raw = self._scrape_details(all_items)
        self.save_raw("nhc_guidelines_raw.json", raw)

        # Step 3: 处理+合并
        processed = self._process(raw)
        self._merge_into_guidelines(processed)

        logger.success(f"NHC指南爬虫完成：{len(processed)} 条")
        return processed

    # ── URL收集 ────────────────────────────────────────────────────────────────

    def _collect_all_urls(self) -> list[dict]:
        cache_path = RAW_DIR / "nhc_guideline_urls.json"
        if cache_path.exists():
            items = json.loads(cache_path.read_text(encoding="utf-8"))
            logger.info(f"NHC URL缓存加载：{len(items)} 条")
            return items

        items = {}  # url → meta
        for source in NHC_LIST_URLS:
            section_items = self._collect_section_urls(source)
            for it in section_items:
                items[it["url"]] = it
            logger.info(f"[{source['section']}] 收集 {len(section_items)} 条")

        result = list(items.values())
        cache_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        return result

    def _collect_section_urls(self, source: dict) -> list[dict]:
        base_list_url = source["base"]
        section = source["section"]
        max_pages = source["pages"]
        items = []

        for page_idx in range(max_pages):
            # NHC分页规则：第1页 new_list.shtml，第N页 new_list_{N-1}.shtml
            if page_idx == 0:
                url = base_list_url
            else:
                url = base_list_url.replace("new_list.shtml", f"new_list_{page_idx}.shtml")

            try:
                resp = self.get(url)
                soup = BeautifulSoup(resp.content, "lxml")

                # NHC 列表通常是 ul/li > a 结构
                found = 0
                for a in soup.select("ul.zxxx_list li a, .list_con li a, ul li a"):
                    href = a.get("href", "").strip()
                    text = a.get_text(strip=True)
                    if not href or not text or len(text) < 5:
                        continue
                    # 补全相对路径
                    if href.startswith("/"):
                        full_url = NHC_BASE + href
                    elif href.startswith("http"):
                        full_url = href
                    else:
                        continue
                    # 过滤非指南链接
                    if not any(x in href for x in [".shtml", ".htm", ".html"]):
                        continue
                    items.append({"url": full_url, "title": text, "section": section})
                    found += 1

                if found == 0:
                    logger.info(f"[{section}] 第{page_idx+1}页无内容，停止")
                    break

            except Exception as e:
                logger.warning(f"[{section}] 第{page_idx+1}页失败：{e}")

        return items

    # ── 详情爬取 ───────────────────────────────────────────────────────────────

    def _scrape_details(self, items: list[dict]) -> list[dict]:
        raw = []
        raw_path = RAW_DIR / "nhc_guidelines_raw.json"
        if raw_path.exists():
            raw = json.loads(raw_path.read_text(encoding="utf-8"))

        done_keys = {d.get("_url_key") for d in raw}

        for item in tqdm(items, desc="爬取NHC指南详情"):
            url = item["url"]
            key = url_to_key(url)
            if key in done_keys or self.is_done(key):
                continue
            try:
                detail = self._parse_detail(url, item)
                if detail:
                    detail["_url_key"] = key
                    raw.append(detail)
                self.mark_done(key)
            except Exception as e:
                logger.warning(f"NHC跳过 {url}：{e}")
                self.mark_failed(key, str(e))

            if len(raw) % 20 == 0 and raw:
                raw_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")

        self.flush_checkpoint()
        return raw

    def _parse_detail(self, url: str, meta: dict) -> Optional[dict]:
        resp = self.get(url)
        # NHC 使用 GBK 编码
        resp.encoding = resp.apparent_encoding or "gbk"
        soup = BeautifulSoup(resp.text, "lxml")

        # 标题
        title_el = (soup.find("h1") or soup.find(class_="con_tit") or
                    soup.find(class_="article-title"))
        title = title_el.get_text(strip=True) if title_el else meta.get("title", "")
        if not title or len(title) < 4:
            return None

        # 发布日期
        pub_date = ""
        date_patterns = [
            soup.find(class_=re.compile(r"date|time|pub", re.I)),
            soup.find(string=re.compile(r"发布时间|发文时间|印发时间")),
        ]
        for dp in date_patterns:
            if dp:
                text = dp.get_text() if hasattr(dp, "get_text") else str(dp)
                m = re.search(r"(\d{4}[-年]\d{1,2}[-月]\d{1,2})", text)
                if m:
                    pub_date = m.group(1).replace("年", "-").replace("月", "-")
                    break
        if not pub_date:
            m = re.search(r"(20\d{2})", title)
            if m:
                pub_date = m.group(1)

        # 发文机构
        issuer = "国家卫生健康委员会"
        # 尝试从页面提取
        for pattern in [r"(国家卫生健康委|卫生部|国家卫计委|中华医学会[^，。\n]{0,30})", r"(发文机关[：:]\s*[^\n，。]+)"]:
            m = re.search(pattern, soup.get_text()[:3000])
            if m:
                issuer = m.group(1).strip()
                break

        # 正文内容（提取摘要/关键内容，最多3000字）
        content = ""
        # 找正文容器
        for selector in ["div.con_box", "div.article-content", "div#content", "div.TRS_Editor", "div.detail"]:
            el = soup.select_one(selector)
            if el:
                content = el.get_text(separator="\n", strip=True)
                break
        if not content:
            # fallback: 取所有段落
            paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 20]
            content = "\n".join(paragraphs[:20])
        content = content[:3000]

        # PDF链接
        pdf_url = ""
        for a in soup.find_all("a", href=True):
            if ".pdf" in a["href"].lower():
                href = a["href"]
                if href.startswith("/"):
                    pdf_url = NHC_BASE + href
                elif href.startswith("http"):
                    pdf_url = href
                break

        # 科室分类
        category = self._infer_category(title + " " + content[:200])

        return {
            "title": title,
            "category": category,
            "issuer": issuer,
            "publish_date": pub_date,
            "abstract": content[:1500],
            "full_text": content,
            "keywords": self._extract_keywords(title),
            "pdf_url": pdf_url,
            "source_url": url,
            "section": meta.get("section", ""),
            "source": "国家卫生健康委员会",
        }

    # ── 分类/关键词 ────────────────────────────────────────────────────────────

    CATEGORY_PATTERNS_ZH = [
        (r"心血管|心脏|冠心病|高血压|心力衰竭|心肌|心房|血压|房颤", "心血管科"),
        (r"糖尿病|血糖|胰岛素|内分泌|甲状腺|代谢|肥胖|痛风", "内分泌科"),
        (r"呼吸|肺炎|哮喘|慢阻肺|COPD|肺癌|气道|支气管", "呼吸科"),
        (r"感染|抗菌|抗生素|脓毒症|败血症|病毒|细菌|真菌|结核|HIV", "感染科"),
        (r"消化|胃炎|溃疡|肠炎|肝炎|肝硬化|胰腺|胆囊|结肠", "消化科"),
        (r"神经|脑卒中|中风|癫痫|帕金森|痴呆|阿尔茨海默|脑梗", "神经科"),
        (r"肿瘤|癌症|化疗|放疗|靶向|免疫治疗|淋巴瘤|白血病", "肿瘤科"),
        (r"骨科|骨折|关节|脊柱|骨质疏松|类风湿|风湿", "骨科/风湿科"),
        (r"肾脏|肾炎|肾衰|透析|蛋白尿|CKD", "肾内科"),
        (r"血液|贫血|血栓|凝血|白细胞|血小板|骨髓", "血液科"),
        (r"妇产|产科|孕产妇|妊娠|子宫|卵巢|乳腺|宫颈", "妇产科"),
        (r"儿科|新生儿|儿童|小儿|婴幼儿", "儿科"),
        (r"重症|ICU|危重|机械通气|镇痛|休克", "重症医学"),
        (r"急诊|急救|中毒|创伤|急性", "急诊科"),
        (r"精神|抑郁|焦虑|精神分裂|双相|失眠", "精神科"),
        (r"皮肤|湿疹|银屑病|荨麻疹|皮炎", "皮肤科"),
        (r"护理|护士|病房|护理操作|护理规范", "护理"),
        (r"手术|麻醉|围手术|外科", "外科/麻醉"),
        (r"新冠|COVID|冠状病毒|SARS|流感|传染", "传染病/感染科"),
        (r"放射|影像|CT|MRI|超声|内镜|病理", "医技科室"),
    ]

    def _infer_category(self, text: str) -> str:
        for pattern, cat in self.CATEGORY_PATTERNS_ZH:
            if re.search(pattern, text):
                return cat
        return "综合/其他"

    def _extract_keywords(self, title: str) -> list[str]:
        stops = {"指南", "共识", "建议", "规范", "标准", "版", "年", "中国", "专家",
                 "临床", "实践", "诊疗", "诊断", "治疗", "预防", "国家", "卫生",
                 "健康", "委员会", "通知", "关于", "印发"}
        parts = re.split(r"[/（）()\s·，。、《》【】]+", title)
        return [p.strip() for p in parts if p.strip() and p.strip() not in stops and len(p.strip()) > 1][:8]

    # ── 清洗+合并 ──────────────────────────────────────────────────────────────

    def _process(self, raw: list[dict]) -> list[dict]:
        processed = []
        seen = set()
        for item in raw:
            title = item.get("title", "").strip()
            if not title or title in seen or len(title) < 5:
                continue
            # 过滤无关条目（公告、通知等非指南）
            if re.search(r"^(公告|通知|公示|征求意见|关于印发.{0,5}(通知|函))", title):
                continue
            seen.add(title)
            processed.append({
                "title": title,
                "category": item.get("category", "综合/其他"),
                "issuer": item.get("issuer", "国家卫生健康委员会"),
                "publish_date": item.get("publish_date", ""),
                "abstract": item.get("abstract", ""),
                "full_text": item.get("full_text", ""),
                "keywords": item.get("keywords", []),
                "pdf_url": item.get("pdf_url", ""),
                "source_url": item.get("source_url", ""),
                "source": "国家卫生健康委员会",
                "data_type": "scraped",
                "section": item.get("section", ""),
            })
        logger.info(f"NHC处理后：{len(processed)} 条")
        return processed

    def _merge_into_guidelines(self, processed: list[dict]):
        """并入 guidelines.json（按标题去重）"""
        path = PROCESSED_DIR / "guidelines.json"
        existing = []
        if path.exists():
            existing = json.loads(path.read_text(encoding="utf-8"))

        existing_titles = {g.get("title", "") for g in existing}
        added = 0
        for g in processed:
            if g["title"] not in existing_titles:
                existing.append(g)
                existing_titles.add(g["title"])
                added += 1

        path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.success(f"NHC指南并入 guidelines.json：新增 {added} 条，总计 {len(existing)} 条")


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    scraper = NHCGuidelineScraper()
    result = scraper.run()
    print(f"[OK] NHC指南完成：{len(result)} 条")
