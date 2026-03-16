from sqlalchemy import String, Text, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from uuid import uuid4, UUID
from datetime import datetime
from typing import List

from db.database import Base


class Disease(Base):
    __tablename__ = "diseases"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    icd_code: Mapped[str | None] = mapped_column(String(20), index=True)
    alias: Mapped[list] = mapped_column(JSON, default=list)
    department: Mapped[str | None] = mapped_column(String(100))
    system: Mapped[str | None] = mapped_column(String(100))

    # 分类扩展
    disease_type: Mapped[str | None] = mapped_column(String(50))   # 感染性/慢性/急症/肿瘤/遗传/免疫
    specialty: Mapped[str | None] = mapped_column(String(100))      # 细化专科

    # 知识内容
    overview: Mapped[str | None] = mapped_column(Text)
    definition: Mapped[str | None] = mapped_column(Text)
    etiology: Mapped[str | None] = mapped_column(Text)
    pathogenesis: Mapped[str | None] = mapped_column(Text)
    symptoms: Mapped[str | None] = mapped_column(Text)              # 临床表现
    diagnosis_criteria: Mapped[str | None] = mapped_column(Text)
    differential_diagnosis: Mapped[str | None] = mapped_column(Text)
    complications: Mapped[str | None] = mapped_column(Text)
    treatment: Mapped[str | None] = mapped_column(Text)             # 治疗概述（保留兼容）
    prognosis: Mapped[str | None] = mapped_column(Text)
    prevention: Mapped[str | None] = mapped_column(Text)
    follow_up: Mapped[str | None] = mapped_column(Text)             # 随访建议

    # 内容管理
    source: Mapped[str | None] = mapped_column(String(200))         # 数据来源
    version_no: Mapped[str | None] = mapped_column(String(20))      # 版本号

    # 关联（存储 UUID 列表）
    related_drug_ids: Mapped[list] = mapped_column(JSON, default=list)
    related_exam_ids: Mapped[list] = mapped_column(JSON, default=list)
    related_guideline_ids: Mapped[list] = mapped_column(JSON, default=list)

    is_published: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关联治疗方案
    treatment_plans: Mapped[List["DiseaseTreatmentPlan"]] = relationship(
        "DiseaseTreatmentPlan", back_populates="disease", order_by="DiseaseTreatmentPlan.sort_order"
    )


class DiseaseTreatmentPlan(Base):
    __tablename__ = "disease_treatment_plans"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    disease_id: Mapped[UUID] = mapped_column(ForeignKey("diseases.id", ondelete="CASCADE"), nullable=False, index=True)

    plan_name: Mapped[str] = mapped_column(String(100), nullable=False)  # 如"一线治疗方案"
    plan_type: Mapped[str] = mapped_column(String(50), nullable=False)   # 药物治疗/非药物治疗/手术/介入/对症支持

    # 适用条件
    applicable_condition: Mapped[str | None] = mapped_column(Text)       # 适用条件文字说明
    severity: Mapped[str | None] = mapped_column(String(20))             # 轻度/中度/重度/危重/通用
    patient_group: Mapped[str | None] = mapped_column(String(50))        # 通用/儿童/老年/孕妇/肾功能不全

    # 方案内容
    treatment_content: Mapped[str | None] = mapped_column(Text)          # 治疗方案描述
    drug_refs: Mapped[list] = mapped_column(JSON, default=list)          # 关联药品ID列表

    # 循证支持
    evidence_level: Mapped[str | None] = mapped_column(String(10))       # A/B/C/D 或 Ⅰ/Ⅱ/Ⅲ
    guideline_ref: Mapped[str | None] = mapped_column(String(200))       # 指南来源

    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    disease: Mapped["Disease"] = relationship("Disease", back_populates="treatment_plans")
