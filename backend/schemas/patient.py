from typing import List, Optional
from pydantic import BaseModel
from enum import Enum


class Gender(str, Enum):
    male = "male"
    female = "female"
    unknown = "unknown"


class LabResultItem(BaseModel):
    item_name: str
    item_code: Optional[str] = None
    value: float
    unit: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    is_abnormal: bool = False
    abnormal_type: Optional[str] = None  # high | low


class PatientContext(BaseModel):
    """患者上下文（不落库，只存 Redis）"""
    patient_id: str
    name: str
    gender: Gender = Gender.unknown
    age: int = 0
    diagnoses: List[str] = []        # ICD编码列表
    diagnosis_names: List[str] = []  # 诊断名称列表
    allergies: List[str] = []        # 过敏药物/物质
    chief_complaint: Optional[str] = None
    lab_results: List[LabResultItem] = []
    current_medications: List[str] = []


class PatientContextSet(BaseModel):
    """接收来自 HIS 的患者上下文"""
    patient_id: str
    name: Optional[str] = None
    gender: Optional[Gender] = None
    age: Optional[int] = None
    diagnoses: List[str] = []
    allergies: List[str] = []
    chief_complaint: Optional[str] = None
