"""
适配器工厂
通过环境变量 HIS_MODE / LIS_MODE 等切换 Mock 或真实实现
Services 层通过这里的工厂函数获取适配器，无需感知 Mock/真实
"""
from config import settings
from services.adapters.base_adapter import BaseHISAdapter, BaseLISAdapter
from services.adapters.his_adapter import MockHISAdapter, RealHISAdapter
from services.adapters.lis_adapter import MockLISAdapter, RealLISAdapter


def get_his_adapter() -> BaseHISAdapter:
    if settings.his_mode == "real":
        return RealHISAdapter(settings.his_api_url, settings.his_api_key)
    return MockHISAdapter()


def get_lis_adapter() -> BaseLISAdapter:
    if settings.lis_mode == "real":
        return RealLISAdapter(settings.lis_api_url, settings.lis_api_key)
    return MockLISAdapter()
