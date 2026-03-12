"""
外部系统适配器基类
定义所有外部系统交互的标准接口
Services 层只依赖这些接口，不感知 Mock 还是真实实现
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from schemas.patient import PatientContext, LabResultItem


class BaseHISAdapter(ABC):
    """HIS 系统适配器接口"""

    @abstractmethod
    async def get_patient_info(self, patient_id: str) -> Optional[PatientContext]:
        """获取患者基本信息、诊断、过敏史"""
        ...

    @abstractmethod
    async def get_current_diagnosis(self, patient_id: str) -> List[str]:
        """获取患者当前诊断（ICD编码列表）"""
        ...

    @abstractmethod
    async def get_prescriptions(self, patient_id: str) -> List[dict]:
        """获取患者当前用药列表"""
        ...


class BaseLISAdapter(ABC):
    """LIS 检验系统适配器接口"""

    @abstractmethod
    async def get_lab_results(self, patient_id: str) -> List[LabResultItem]:
        """获取患者最新检验结果"""
        ...

    @abstractmethod
    async def get_result_by_id(self, result_id: str) -> Optional[LabResultItem]:
        """获取指定检验结果"""
        ...


class BasePACSAdapter(ABC):
    """PACS 影像系统适配器接口"""

    @abstractmethod
    async def get_report(self, patient_id: str) -> Optional[dict]:
        """获取影像报告"""
        ...


class BaseEMRAdapter(ABC):
    """电子病历系统适配器接口"""

    @abstractmethod
    async def get_medical_history(self, patient_id: str) -> Optional[dict]:
        """获取病历摘要"""
        ...

    @abstractmethod
    async def get_chief_complaint(self, patient_id: str) -> Optional[str]:
        """获取主诉"""
        ...
