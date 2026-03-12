from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from enum import Enum


class ExamType(str, Enum):
    lab = "lab"    # 检验
    exam = "exam"  # 检查


class ReferenceRange(BaseModel):
    gender: Optional[str] = None   # male | female | None（通用）
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    unit: Optional[str] = None
    low: Optional[float] = None
    high: Optional[float] = None
    condition: Optional[str] = None  # 特殊条件说明（如：空腹）


class ExamBase(BaseModel):
    name: str
    code: Optional[str] = None
    type: ExamType = ExamType.lab


class ExamCreate(ExamBase):
    description: Optional[str] = None
    reference_ranges: List[ReferenceRange] = []
    clinical_significance: Optional[str] = None
    indications: Optional[str] = None
    preparation: Optional[str] = None


class ExamUpdate(ExamCreate):
    name: Optional[str] = None


class ExamListItem(ExamBase):
    id: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExamDetail(ExamCreate):
    id: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}
