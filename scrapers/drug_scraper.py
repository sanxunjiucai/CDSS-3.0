"""
药品知识库爬虫 —— 国家药监局（NMPA）
来源：https://www.nmpa.gov.cn/datasearch/

策略：
1. 主路径：调用 NMPA 数据查询接口分页爬取境内药品数据
2. 数据来源：国药准字批准文号 → 药品基本信息 → 说明书详情
3. 反爬处理：使用 Playwright 无头浏览器获取动态签名

输出字段（对应 backend/db/models/drug.py）：
  name, trade_name, category, approval_number,
  indications, dosage, contraindications,
  interactions, adverse_reactions, special_population
"""

import re
import json
import asyncio
from pathlib import Path
from typing import Optional

from loguru import logger
from tqdm import tqdm
from bs4 import BeautifulSoup

from base_scraper import BaseScraper, RAW_DIR, PROCESSED_DIR, url_to_key

# NMPA 数据查询接口
NMPA_SEARCH_URL = "https://www.nmpa.gov.cn/datasearch/data/nmpadata/search"
NMPA_DETAIL_URL = "https://www.nmpa.gov.cn/datasearch/data/nmpadata/getDetailById"
NMPA_CONFIG_URL = "https://www.nmpa.gov.cn/datasearch/config/NMPA_DATA.json"

# 境内药品分类 itemId（从 NMPA_DATA.json 解析）
# 常用类别（运行时动态获取，此处为已知值）
DRUG_ITEM_IDS = {
    "境内生产药品": "ff80808183cad75001840881f84817xx",  # 运行时从 config 获取
    "进口药品": "ff80808183cad75001840881f84818xx",
}

# 药品分类映射（APT类型编码）
CATEGORY_MAP = {
    "H": "化学药品",
    "Z": "中成药",
    "S": "生物制品",
    "J": "进口药品",
    "B": "保健食品",
}


class DrugScraper(BaseScraper):
    NAME = "drug"
    REQUEST_DELAY = (2.5, 5.0)

    def run(self):
        logger.info("=== 药品知识库爬取开始（国家药监局）===")

        # Step 1: 获取动态配置（itemId）
        item_id = self._get_item_id()
        logger.info(f"境内药品 itemId：{item_id}")

        # Step 2: 批量获取药品列表
        drug_list = self._fetch_drug_list(item_id)
        logger.info(f"获取到 {len(drug_list)} 条药品记录")

        # Step 3: 逐条获取药品详情（含说明书）
        raw_drugs = self._fetch_drug_details(drug_list)

        self.save_raw("drugs_raw.json", raw_drugs)

        # Step 4: 清洗为标准格式
        processed = self._process(raw_drugs)
        self.save_processed("drugs.json", processed)
        return processed

    # ── 配置获取 ──────────────────────────────────────────────────────────────

    def _get_item_id(self) -> str:
        """动态获取境内药品的 itemId"""
        try:
            import time
            ts = int(time.time() * 1000)
            resp = self.get(f"{NMPA_CONFIG_URL}?date={ts}")
            config = resp.json()
            # 遍历配置找到境内药品
            for item in config:
                name = item.get("name", "") or item.get("itemName", "")
                if "境内" in name and "药品" in name:
                    return item.get("id") or item.get("itemId", "")
            # fallback: 返回所有 item 供调试
            logger.warning(f"未找到境内药品itemId，配置keys：{[i.get('name','') for i in config[:5]]}")
        except Exception as e:
            logger.warning(f"获取配置失败：{e}")
        # 使用 Playwright 兜底方案
        return self._get_item_id_via_browser()

    def _get_item_id_via_browser(self) -> str:
        """用 Playwright 从浏览器获取 itemId"""
        try:
            from playwright.sync_api import sync_playwright
            logger.info("使用 Playwright 获取 itemId...")
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                item_id_found = []

                def handle_request(request):
                    if "nmpadata/search" in request.url:
                        try:
                            body = request.post_data_json
                            if body and body.get("itemId"):
                                item_id_found.append(body["itemId"])
                        except Exception:
                            pass

                page.on("request", handle_request)
                page.goto("https://www.nmpa.gov.cn/datasearch/home-index.html", timeout=30000)
                page.wait_for_timeout(3000)

                # 点击境内药品按钮
                page.click("text=境内生产药品", timeout=5000)
                page.wait_for_timeout(2000)
                browser.close()

                if item_id_found:
                    logger.info(f"通过浏览器获取到 itemId：{item_id_found[0]}")
                    return item_id_found[0]
        except Exception as e:
            logger.error(f"Playwright 获取 itemId 失败：{e}")
        return ""

    # ── 列表爬取 ──────────────────────────────────────────────────────────────

    def _fetch_drug_list(self, item_id: str) -> list[dict]:
        """分页获取所有药品基础信息"""
        raw_path = RAW_DIR / "drugs_list.json"
        if raw_path.exists():
            with open(raw_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            logger.info(f"从缓存加载药品列表：{len(data)} 条")
            return data

        all_drugs = []
        page = 1
        page_size = 20

        while True:
            try:
                records = self._search_page(item_id, page, page_size)
                if not records:
                    break
                all_drugs.extend(records)
                logger.info(f"第 {page} 页，累计 {len(all_drugs)} 条")

                if len(records) < page_size:
                    break
                page += 1

                # 每100条保存一次
                if len(all_drugs) % 100 == 0:
                    with open(raw_path, "w", encoding="utf-8") as f:
                        json.dump(all_drugs, f, ensure_ascii=False, indent=2)

            except Exception as e:
                logger.error(f"第 {page} 页获取失败：{e}")
                break

        with open(raw_path, "w", encoding="utf-8") as f:
            json.dump(all_drugs, f, ensure_ascii=False, indent=2)

        return all_drugs

    def _search_page(self, item_id: str, page: int, page_size: int) -> list[dict]:
        """调用 NMPA 搜索接口获取一页数据"""
        payload = {
            "isSenior": "N",
            "itemId": item_id,
            "pageNum": str(page),
            "pageSize": str(page_size),
            "searchValue": "",
        }
        # 需要 sign 头，用 Playwright 获取
        return self._search_via_browser(page, page_size)

    def _search_via_browser(self, page: int, page_size: int) -> list[dict]:
        """通过 Playwright 拦截 XHR 获取数据"""
        try:
            from playwright.sync_api import sync_playwright
            results = []
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                ctx = browser.new_context()
                pg = ctx.new_page()

                def handle_response(response):
                    if "nmpadata/search" in response.url:
                        try:
                            data = response.json()
                            items = data.get("data", {}).get("list", []) or data.get("list", [])
                            results.extend(items)
                        except Exception:
                            pass

                pg.on("response", handle_response)

                if page == 1:
                    pg.goto("https://www.nmpa.gov.cn/datasearch/home-index.html", timeout=30000)
                    pg.wait_for_timeout(2000)
                    pg.click("text=境内生产药品")
                    pg.wait_for_timeout(3000)
                else:
                    # 翻页
                    pg.evaluate(f"window.__page = {page}")

                browser.close()
            return results
        except Exception as e:
            logger.error(f"浏览器搜索失败 page={page}：{e}")
            return []

    # ── 详情爬取 ──────────────────────────────────────────────────────────────

    def _fetch_drug_details(self, drug_list: list[dict]) -> list[dict]:
        """逐条获取药品详情，重点获取说明书字段"""
        details = []
        done_ids = {d.get("_id") for d in details}

        for item in tqdm(drug_list, desc="获取药品详情"):
            drug_id = item.get("id") or item.get("ypxxId") or item.get("ID")
            if not drug_id or drug_id in done_ids:
                continue
            if self.is_done(str(drug_id)):
                continue
            try:
                detail = self._get_detail(drug_id, item)
                if detail:
                    detail["_id"] = drug_id
                    details.append(detail)
                self.mark_done(str(drug_id))
            except Exception as e:
                logger.warning(f"跳过 {drug_id}：{e}")
                self.mark_failed(str(drug_id), str(e))

            if len(details) % 50 == 0:
                self.save_raw("drugs_raw.json", details)

        return details

    def _get_detail(self, drug_id: str, base_info: dict) -> Optional[dict]:
        """获取单条药品详情"""
        detail = dict(base_info)

        # 尝试通过详情接口获取说明书
        try:
            resp = self.post(NMPA_DETAIL_URL, json={"id": drug_id})
            data = resp.json().get("data", {})
            detail.update(data)
        except Exception:
            pass

        # 尝试爬取药品详情页面（如有URL）
        detail_url = base_info.get("detailUrl") or base_info.get("url")
        if detail_url:
            try:
                soup = self.get_soup(detail_url)
                detail.update(self._parse_detail_page(soup))
            except Exception:
                pass

        return detail

    def _parse_detail_page(self, soup: BeautifulSoup) -> dict:
        """解析药品详情页 HTML"""
        result = {}
        field_map = {
            "适应症": "indications",
            "功能主治": "indications",
            "用法用量": "dosage",
            "禁忌": "contraindications",
            "药物相互作用": "interactions",
            "不良反应": "adverse_reactions",
            "特殊人群用药": "special_population",
            "注意事项": "notes",
            "药理毒理": "pharmacology",
        }
        for label, field in field_map.items():
            pattern = re.compile(label)
            tag = soup.find(string=pattern)
            if tag:
                # 取标签后的文本
                parent = tag.parent
                if parent:
                    next_text = parent.find_next_sibling()
                    if next_text:
                        result[field] = next_text.get_text(strip=True)
        return result

    # ── 数据清洗 ──────────────────────────────────────────────────────────────

    def _process(self, raw: list[dict]) -> list[dict]:
        processed = []
        seen = set()

        for item in raw:
            # 提取通用名
            name = (
                item.get("ypmc") or item.get("genericName") or
                item.get("productName") or item.get("drugName") or
                item.get("name") or ""
            ).strip()
            if not name or name in seen:
                continue
            seen.add(name)

            # 商品名
            trade_name = (
                item.get("spmc") or item.get("tradeName") or
                item.get("brandName") or ""
            ).strip()

            # 批准文号
            approval = (
                item.get("pzwh") or item.get("approvalNumber") or
                item.get("zcbh") or ""
            ).strip()

            # 药品分类
            category = self._infer_category(approval, name)

            processed.append({
                "name": name,
                "trade_name": trade_name,
                "approval_number": approval,
                "category": category,
                "manufacturer": (item.get("shengchanqiye") or item.get("manufacturer") or "").strip(),
                "indications": self._extract_field(item, ["indications", "适应症", "yszz", "功能主治"]),
                "dosage": self._extract_field(item, ["dosage", "用法用量", "yffy"]),
                "contraindications": self._extract_field(item, ["contraindications", "禁忌", "jjz"]),
                "interactions": self._extract_field(item, ["interactions", "药物相互作用", "ywxhzy"]),
                "adverse_reactions": self._extract_field(item, ["adverse_reactions", "不良反应", "blfyx"]),
                "special_population": self._extract_field(item, ["special_population", "特殊人群用药"]),
                "source": "国家药品监督管理局",
                "source_url": item.get("url") or item.get("detailUrl") or "",
            })

        logger.info(f"清洗后：{len(processed)} 条药品记录")
        return processed

    def _infer_category(self, approval: str, name: str) -> str:
        if not approval:
            return "未分类"
        prefix = approval[2:3] if len(approval) > 2 else ""
        return CATEGORY_MAP.get(prefix, "其他")

    def _extract_field(self, item: dict, keys: list) -> str:
        for k in keys:
            v = item.get(k)
            if v and isinstance(v, str) and v.strip():
                return v.strip()
        return ""


if __name__ == "__main__":
    scraper = DrugScraper()
    result = scraper.run()
    print(f"\n✅ 药品知识库爬取完成：{len(result)} 条")
