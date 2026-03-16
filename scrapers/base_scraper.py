"""
爬虫基础类
- 统一请求管理（UA池轮换、限速、重试、软封检测）
- 断点续爬（checkpoint 机制，set O(1)查询）
- 统一日志
- 反爬规则：UA轮换、随机延迟、Referer、429/412处理
"""

import json
import time
import random
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from loguru import logger

# ── 路径 ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
CHECKPOINT_DIR = ROOT / "data" / "checkpoints"

for d in [RAW_DIR, PROCESSED_DIR, CHECKPOINT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ── 反爬：User-Agent 池（15个真实浏览器UA，涵盖多平台/版本）─────────────────
USER_AGENTS = [
    # Chrome Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    # Chrome Mac
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    # Firefox
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
    # Safari
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    # Edge
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
    # Mobile Chrome（降低被识别为爬虫的概率）
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
]

# ── 反爬：Accept 头部变体 ─────────────────────────────────────────────────────
ACCEPT_HEADERS = [
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
]

# ── 反爬：封锁特征词（检测软封）─────────────────────────────────────────────
BLOCK_KEYWORDS = [
    "验证码", "captcha", "robot", "403 Forbidden", "Access Denied",
    "请先登录", "您的访问行为异常", "频繁访问", "请稍后再试",
    "系统检测到您正在使用自动化工具",
    "your request has been blocked",
    "cloudflare", "ddos-guard",
]

# ── 反爬：HTTP 状态码策略 ─────────────────────────────────────────────────────
BLOCK_STATUS_CODES = {412, 503, 429, 403}


class BlockedError(Exception):
    """被软封或硬封"""
    pass


class BaseScraper:
    """所有爬虫的基类"""

    NAME = "base"
    REQUEST_DELAY = (1.5, 3.5)   # 请求间隔随机范围（秒）
    MAX_RETRIES = 3
    DOMAIN_MIN_DELAY = 1.0        # 同域名最短间隔（秒）

    def __init__(self):
        self.session = requests.Session()
        self._rotate_headers()
        self.checkpoint_file = CHECKPOINT_DIR / f"{self.NAME}_checkpoint.json"
        self.checkpoint = self._load_checkpoint()
        self._domain_last_req: dict[str, float] = {}  # 域名 → 上次请求时间

    # ── 反爬：请求头随机化 ────────────────────────────────────────────────────

    def _rotate_headers(self):
        """随机化 UA 和 Accept，模拟真实浏览器"""
        self.session.headers.update({
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": random.choice(ACCEPT_HEADERS),
            "Accept-Language": random.choice([
                "zh-CN,zh;q=0.9,en;q=0.8",
                "zh-CN,zh;q=0.9",
                "zh-CN,zh-TW;q=0.9,zh;q=0.8,en-US;q=0.7,en;q=0.6",
            ]),
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        })

    # ── 反爬：检测封锁 ────────────────────────────────────────────────────────

    def _check_blocked(self, resp: requests.Response):
        """检测软封（200状态但内容是验证码/拦截页）"""
        if resp.status_code in BLOCK_STATUS_CODES:
            raise BlockedError(f"HTTP {resp.status_code}: {resp.url}")
        text_lower = resp.text[:2000].lower()
        for kw in BLOCK_KEYWORDS:
            if kw.lower() in text_lower:
                raise BlockedError(f"Soft block detected ('{kw}'): {resp.url}")

    # ── 反爬：域名级别限速 ────────────────────────────────────────────────────

    def _domain_throttle(self, url: str):
        """确保同一域名请求间隔不低于 DOMAIN_MIN_DELAY"""
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        now = time.time()
        last = self._domain_last_req.get(domain, 0)
        wait = self.DOMAIN_MIN_DELAY - (now - last)
        if wait > 0:
            time.sleep(wait)
        self._domain_last_req[domain] = time.time()

    # ── 核心请求 ──────────────────────────────────────────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=3, max=30),
        retry=retry_if_exception_type((requests.RequestException, ConnectionError)),
        reraise=True,
    )
    def get(self, url: str, **kwargs) -> requests.Response:
        self._rotate_headers()
        self._sleep()
        self._domain_throttle(url)
        try:
            resp = self.session.get(url, timeout=25, **kwargs)
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 429:
                wait_time = int(e.response.headers.get("Retry-After", 60))
                logger.warning(f"429 Too Many Requests, 等待 {wait_time}s: {url}")
                time.sleep(wait_time)
                raise  # 触发重试
            raise
        resp.raise_for_status()
        self._check_blocked(resp)
        return resp

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=3, max=30),
        retry=retry_if_exception_type((requests.RequestException, ConnectionError)),
        reraise=True,
    )
    def post(self, url: str, **kwargs) -> requests.Response:
        self._rotate_headers()
        self._sleep()
        self._domain_throttle(url)
        resp = self.session.post(url, timeout=25, **kwargs)
        resp.raise_for_status()
        self._check_blocked(resp)
        return resp

    def get_soup(self, url: str, **kwargs) -> BeautifulSoup:
        resp = self.get(url, **kwargs)
        return BeautifulSoup(resp.text, "lxml")

    def _sleep(self):
        """随机请求间隔 + 偶尔的长间隔（模拟人类阅读行为）"""
        t = random.uniform(*self.REQUEST_DELAY)
        # 每 50 次请求随机插入一次较长停顿（2-5秒额外）
        if random.random() < 0.02:
            t += random.uniform(2, 5)
        time.sleep(t)

    # ── 断点续爬（set 实现 O(1) 查询）──────────────────────────────────────────

    def _load_checkpoint(self) -> dict:
        if self.checkpoint_file.exists():
            with open(self.checkpoint_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            # 兼容旧格式（list → set）
            done = data.get("done", [])
            if isinstance(done, list):
                data["done_set"] = set(done)
            else:
                data["done_set"] = set(done)
            logger.info(f"[{self.NAME}] 恢复断点：已完成 {len(data['done_set'])} 条")
            return data
        return {
            "done": [],
            "done_set": set(),
            "failed": [],
            "started_at": datetime.now().isoformat(),
        }

    def _save_checkpoint(self):
        save_data = {
            "done": list(self.checkpoint["done_set"]),
            "failed": self.checkpoint.get("failed", []),
            "started_at": self.checkpoint.get("started_at", ""),
        }
        with open(self.checkpoint_file, "w", encoding="utf-8") as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)

    def is_done(self, key: str) -> bool:
        return key in self.checkpoint["done_set"]

    def mark_done(self, key: str):
        self.checkpoint["done_set"].add(key)
        # 每 20 次刷盘一次，避免频繁 IO
        if len(self.checkpoint["done_set"]) % 20 == 0:
            self._save_checkpoint()

    def mark_failed(self, key: str, reason: str):
        self.checkpoint.setdefault("failed", []).append({
            "key": key,
            "reason": str(reason)[:200],
            "time": datetime.now().isoformat(),
        })
        self._save_checkpoint()

    def flush_checkpoint(self):
        self._save_checkpoint()

    # ── 数据存储 ──────────────────────────────────────────────────────────────

    def save_raw(self, filename: str, data):
        path = RAW_DIR / filename
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"[{self.NAME}] 原始数据已保存：{path}")

    def save_processed(self, filename: str, data):
        path = PROCESSED_DIR / filename
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.success(f"[{self.NAME}] 处理完成：{path}（{len(data)} 条）")
        return path

    def load_raw(self, filename: str):
        path = RAW_DIR / filename
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    # ── 子类实现 ──────────────────────────────────────────────────────────────

    def run(self):
        raise NotImplementedError


def url_to_key(url: str) -> str:
    """URL 转唯一 key，用于断点标识"""
    return hashlib.md5(url.encode()).hexdigest()[:12]
