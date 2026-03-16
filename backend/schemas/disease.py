from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# ─── 治疗方案 ───────────────────────────────────────────────────────────────

class TreatmentPlanBase(BaseModel):
    plan_name: str
    plan_type: str                          # 药物治疗/非药物治疗/手术/介入/对症支持
    applicable_condition: Optional[str] = None
    severity: Optional[str] = None          # 轻度/中度/重度/危重/通用
    patient_group: Optional[str] = None     # 通用/儿童/老年/孕妇/肾功能不全
    treatment_content: Optional[str] = None
    drug_refs: List[str] = []
    evidence_level: Optional[str] = None    # A/B/C/D
    guideline_ref: Optional[str] = None
    sort_order: int = 0


class TreatmentPlanCreate(TreatmentPlanBase):
    disease_id: UUID


class TreatmentPlanUpdate(BaseModel):
    plan_name: Optional[str] = None
    plan_type: Optional[str] = None
    applicable_condition: Optional[str] = None
    severity: Optional[str] = None
    patient_group: Optional[str] = None
    treatment_content: Optional[str] = None
    drug_refs: Optional[List[str]] = None
    evidence_level: Optional[str] = None
    guideline_ref: Optional[str] = None
    sort_order: Optional[int] = None


class TreatmentPlanItem(TreatmentPlanBase):
    id: UUID
    disease_id: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── 疾病 ────────────────────────────────────────────────────────────────────

class DiseaseBase(BaseModel):
    name: str
    icd_code: Optional[str] = None
    alias: List[str] = []
    department: Optional[str] = None
    system: Optional[str] = None
    disease_type: Optional[str] = None
    specialty: Optional[str] = None


class DiseaseCreate(DiseaseBase):
    overview: Optional[str] = None
    definition: Optional[str] = None
    etiology: Optional[str] = None
    pathogenesis: Optional[str] = None
    symptoms: Optional[str] = None
    diagnosis_criteria: Optional[str] = None
    differential_diagnosis: Optional[str] = None
    complications: Optional[str] = None
    treatment: Optional[str] = None
    prognosis: Optional[str] = None
    prevention: Optional[str] = None
    follow_up: Optional[str] = None
    source: Optional[str] = None
    version_no: Optional[str] = None


class DiseaseUpdate(DiseaseCreate):
    name: Optional[str] = None


class DiseaseListItem(DiseaseBase):
    id: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiseaseDetail(DiseaseCreate):
    id: UUID
    related_drug_ids: List[str] = []
    related_exam_ids: List[str] = []
    related_guideline_ids: List[str] = []
    treatment_plans: List[TreatmentPlanItem] = []
    updated_at: datetime

    model_config = {"from_attributes": True}
