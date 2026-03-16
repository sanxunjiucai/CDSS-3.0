"""
药品知识库爬虫 —— Playwright 版（绕过瑞数安全）
来源：国家药监局 https://www.nmpa.gov.cn/datasearch/

策略：
  用 Playwright 打开真实浏览器页面，拦截 XHR 响应直接获取JSON数据，
  避免逆向 sign 签名机制。

按首字拼音分批搜索（A-Z），每批获取全部分页结果。
"""

import json
import time
import asyncio
from pathlib import Path

from loguru import logger

RAW_DIR = Path(__file__).parent / "data" / "raw"
PROCESSED_DIR = Path(__file__).parent / "data" / "processed"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

ITEM_ID_DOMESTIC = "ff80808183cad75001840881f848179f"   # 境内生产药品
ITEM_ID_IMPORTED  = "ff80808183cad7500184088665711800"  # 境外生产药品

# 中文常用药名首字拼音（覆盖多数品种）
SEARCH_TERMS = [
    # 按拼音首字母覆盖常用药物
    "阿", "艾", "氨", "安", "奥",
    "巴", "贝", "苯", "布", "吡",
    "头", "替", "铁", "甲", "酮",
    "氯", "磷", "利", "来", "洛",
    "美", "氢", "米", "莫", "那",
    "盐", "硫", "碳", "钙", "钠",
    "维", "普", "曲", "沙", "司",
    "他", "多", "地", "丁", "对",
    "非", "呋", "复", "福", "氟",
    "格", "谷", "贡", "胍", "胡",
    "红", "华", "环", "磺", "霉",
    "吗", "尼", "诺", "哌", "培",
    "泼", "葡", "茶", "辛", "乙",
    "右", "左", "依", "异", "西",
]

CATEGORY_MAP = {"H": "化学药品", "Z": "中成药", "S": "生物制品", "J": "进口药品"}


async def scrape_drugs():
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.error("请先安装：python -m playwright install chromium")
        return []

    all_drugs = []
    raw_path = RAW_DIR / "drugs_raw.json"

    # 恢复进度
    done_terms = set()
    if raw_path.exists():
        with open(raw_path, encoding="utf-8") as f:
            all_drugs = json.load(f)
        logger.info(f"从进度恢复：已有 {len(all_drugs)} 条药品")
        # 已完成的搜索词（根据保存的元数据推断）
        done_terms = {d.get("_search_term", "") for d in all_drugs}

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = await ctx.new_page()

        # 首次打开页面，让瑞数安全完成初始化
        logger.info("初始化浏览器会话...")
        await page.goto("https://www.nmpa.gov.cn/datasearch/home-index.html", timeout=30000)
        await page.wait_for_timeout(3000)

        for term in SEARCH_TERMS:
            if term in done_terms:
                logger.info(f"跳过（已完成）：{term}")
                continue

            logger.info(f"搜索：{term}")
            term_drugs = await _search_term(page, term, ITEM_ID_DOMESTIC)

            for drug in term_drugs:
                drug["_search_term"] = term

            all_drugs.extend(term_drugs)
            done_terms.add(term)
            logger.info(f"'{term}' 获取 {len(term_drugs)} 条，累计 {len(all_drugs)} 条")

            # 每个词保存一次
            with open(raw_path, "w", encoding="utf-8") as f:
                json.dump(all_drugs, f, ensure_ascii=False, indent=2)

            await page.wait_for_timeout(2000)

        await browser.close()

    logger.info(f"药品原始数据共 {len(all_drugs)} 条")
    return all_drugs


async def _search_term(page, term: str, item_id: str, max_pages: int = 10) -> list[dict]:
    """搜索某个关键词，拦截所有分页响应"""
    results = []
    captured = asyncio.Event()

    async def on_response(resp):
        if "nmpadata/search" in resp.url:
            try:
                data = await resp.json()
                items = (
                    data.get("data", {}).get("list", []) or
                    data.get("list", []) or
                    []
                )
                if items:
                    results.extend(items)
                    captured.set()
            except Exception:
                pass

    page.on("response", on_response)

    try:
        # 定位搜索框并输入
        await page.fill('input[type="text"], input[placeholder*="请输入"], .search-input', term, timeout=5000)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(3000)

        # 等待结果
        try:
            await asyncio.wait_for(captured.wait(), timeout=8)
        except asyncio.TimeoutError:
            logger.warning(f"'{term}' 无结果或超时")

    except Exception as e:
        logger.warning(f"'{term}' 搜索失败：{e}")
    finally:
        page.remove_listener("response", on_response)

    return results


def process(raw: list[dict]) -> list[dict]:
    """清洗为标准格式"""
    seen = set()
    processed = []

    for item in raw:
        name = (
            item.get("ypmc") or item.get("genericName") or
            item.get("productName") or item.get("drugName") or
            item.get("name") or ""
        ).strip()
        if not name or name in seen:
            continue
        seen.add(name)

        approval = (
            item.get("pzwh") or item.get("approvalNumber") or
            item.get("zcbh") or ""
        ).strip()

        prefix = approval[2:3] if len(approval) > 2 else ""
        category = CATEGORY_MAP.get(prefix, "其他")

        def g(keys):
            for k in keys:
                v = item.get(k)
                if v and isinstance(v, str) and v.strip():
                    return v.strip()
            return ""

        processed.append({
            "name": name,
            "trade_name": (item.get("spmc") or item.get("tradeName") or "").strip(),
            "approval_number": approval,
            "category": category,
            "manufacturer": (item.get("shengchanqiye") or item.get("manufacturer") or "").strip(),
            "indications": g(["yszz", "indications", "功能主治", "适应症"]),
            "dosage": g(["yffy", "dosage", "用法用量"]),
            "contraindications": g(["jjz", "contraindications", "禁忌"]),
            "interactions": g(["ywxhzy", "interactions", "药物相互作用"]),
            "adverse_reactions": g(["blfyx", "adverse_reactions", "不良反应"]),
            "special_population": g(["special_population", "特殊人群用药"]),
            "source": "国家药品监督管理局",
        })

    logger.info(f"清洗后：{len(processed)} 条药品")
    return processed


async def main():
    logger.info("=== 药品知识库爬取开始（Playwright版）===")
    raw = await scrape_drugs()

    with open(RAW_DIR / "drugs_raw.json", "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)

    processed = process(raw)
    output = PROCESSED_DIR / "drugs.json"
    with open(output, "w", encoding="utf-8") as f:
        json.dump(processed, f, ensure_ascii=False, indent=2)

    logger.success(f"药品知识库完成：{len(processed)} 条 -> {output}")


if __name__ == "__main__":
    asyncio.run(main())
