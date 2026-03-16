"""
适配器工厂
通过环境变量 HIS_MODE / LIS_MODE / PACS_MODE / EMR_MODE 切换 Mock 或真实实现
Services 层通过这里的工厂函数获取适配器，无需感知 Mock/真实
"""
from config import settings
from services.adapters.base_adapter import BaseHISAdapter, BaseLISAdapter, BasePACSAdapter, BaseEMRAdapter
from services.adapters.his_adapter import MockHISAdapter, RealHISAdapter
from services.adapters.lis_adapter import MockLISAdapter, RealLISAdapter
from services.adapters.pacs_adapter import MockPACSAdapter, RealPACSAdapter
from services.adapters.emr_adapter import MockEMRAdapter, RealEMRAdapter


def get_his_adapter() -> BaseHISAdapter:
    if settings.his_mode == "real":
        return RealHISAdapter(settings.his_api_url, settings.his_api_key)
    return MockHISAdapter()


def get_lis_adapter() -> BaseLISAdapter:
    if settings.lis_mode == "real":
        return RealLISAdapter(settings.lis_api_url, settings.lis_api_key)
    return MockLISAdapter()


def get_pacs_adapter() -> BasePACSAdapter:
    pacs_mode = getattr(settings, "pacs_mode", "mock")
    if pacs_mode == "real":
        pacs_url = getattr(settings, "pacs_api_url", "")
        pacs_key = getattr(settings, "pacs_api_key", "")
        return RealPACSAdapter(pacs_url, pacs_key)
    return MockPACSAdapter()


def get_emr_adapter() -> BaseEMRAdapter:
    emr_mode = getattr(settings, "emr_mode", "mock")
    if emr_mode == "real":
        emr_url = getattr(settings, "emr_api_url", "")
        emr_key = getattr(settings, "emr_api_key", "")
        return RealEMRAdapter(emr_url, emr_key)
    return MockEMRAdapter()
