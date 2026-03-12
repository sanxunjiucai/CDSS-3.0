from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class DiseaseBase(BaseModel):
    name: str
    icd_code: Optional[str] = None
    alias: List[str] = []
    department: Optional[str] = None
    system: Optional[str] = None


class DiseaseCreate(DiseaseBase):
    overview: Optional[str] = None
    etiology: Optional[str] = None
    symptoms: Optional[str] = None
    diagnosis_criteria: Optional[str] = None
    treatment: Optional[str] = None
    prognosis: Optional[str] = None


class DiseaseUpdate(DiseaseCreate):
    name: Optional[str] = None


class DiseaseListItem(DiseaseBase):
    id: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiseaseDetail(DiseaseCreate):
    id: UUID
    related_drugs: List[dict] = []
    related_exams: List[dict] = []
    related_guidelines: List[dict] = []
    updated_at: datetime

    model_config = {"from_attributes": True}
