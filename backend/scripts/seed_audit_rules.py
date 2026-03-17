"""
审核规则种子数据
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from db.database import AsyncSessionLocal
from db.models.audit_rule import AuditRule


SEED_RULES = [
    {
        "name": "STEMI患者禁用NSAIDs",
        "code": "STEMI_NSAID_CONTRAINDICATION",
        "scenario": "medication_safety",
        "level": "danger",
        "rule_type": "medication_warning",
        "trigger_scene": "prescribing",
        "message": "急性ST段抬高型心肌梗死（STEMI）患者禁用非甾体抗炎药（NSAIDs）",
        "suggestion": "建议使用阿片类镇痛药（如吗啡）替代NSAIDs进行疼痛管理",
        "condition": {
            "all": [
                {"op": "contains_any", "field": "diagnoses", "values": ["急性ST段抬高型心肌梗死", "STEMI", "心肌梗死"]}
            ],
            "any": [
                {"op": "contains_any", "field": "drug_names", "values": ["布洛芬", "双氯芬酸", "吲哚美辛", "塞来昔布"]}
            ],
            "not": []
        },
        "enabled": True,
        "is_published": True,
    },
    {
        "name": "青霉素过敏患者用药检查",
        "code": "PENICILLIN_ALLERGY_CHECK",
        "scenario": "medication_safety",
        "level": "block",
        "rule_type": "allergy_check",
        "trigger_scene": "prescribing",
        "message": "患者对青霉素过敏，禁止使用青霉素类及头孢类抗生素",
        "suggestion": "建议使用大环内酯类（如阿奇霉素）或喹诺酮类抗生素",
        "condition": {
            "all": [
                {"op": "contains_any", "field": "patient_allergies", "values": ["青霉素"]}
            ],
            "any": [
                {"op": "contains_any", "field": "drug_names", "values": ["阿莫西林", "青霉素", "头孢", "头孢菌素"]}
            ],
            "not": []
        },
        "enabled": True,
        "is_published": True,
    },
    {
        "name": "心肌梗死必查心电图",
        "code": "MI_ECG_REQUIRED",
        "scenario": "exam_appropriateness",
        "level": "warning",
        "rule_type": "exam_recommend",
        "trigger_scene": "diagnosis_entry",
        "message": "诊断心肌梗死时必须完成心电图检查",
        "suggestion": "建议立即开具心电图检查，并关注ST段变化",
        "condition": {
            "all": [
                {"op": "contains_any", "field": "diagnoses", "values": ["心肌梗死", "急性冠脉综合征", "STEMI", "NSTEMI"]}
            ],
            "any": [
                {"op": "not_contains_any", "field": "exam_names", "values": ["心电图", "ECG"]}
            ],
            "not": []
        },
        "enabled": True,
        "is_published": True,
    },
    {
        "name": "肌钙蛋白异常升高预警",
        "code": "TROPONIN_ELEVATED_ALERT",
        "scenario": "diagnosis_consistency",
        "level": "danger",
        "rule_type": "risk_alert",
        "trigger_scene": "lab_review",
        "message": "肌钙蛋白I（TNI）显著升高，提示急性心肌损伤",
        "suggestion": "建议立即评估患者是否存在急性冠脉综合征，必要时启动胸痛中心流程",
        "condition": {
            "all": [
                {"op": "lab_value_ge", "item_code": "TNI", "value": "0.5"}
            ],
            "any": [],
            "not": []
        },
        "enabled": True,
        "is_published": True,
    },
    {
        "name": "华法林与阿司匹林联用出血风险",
        "code": "WARFARIN_ASPIRIN_INTERACTION",
        "scenario": "medication_safety",
        "level": "warning",
        "rule_type": "drug_interaction",
        "trigger_scene": "prescribing",
        "message": "华法林与阿司匹林联用会显著增加出血风险",
        "suggestion": "建议密切监测INR值和出血征象，必要时调整剂量或更换抗凝方案",
        "condition": {
            "all": [
                {"op": "contains_any", "field": "drug_names", "values": ["华法林"]},
                {"op": "contains_any", "field": "drug_names", "values": ["阿司匹林"]}
            ],
            "any": [],
            "not": []
        },
        "enabled": True,
        "is_published": True,
    },
]


async def seed_audit_rules():
    async with AsyncSessionLocal() as session:
        try:
            for rule_data in SEED_RULES:
                rule = AuditRule(**rule_data)
                session.add(rule)

            await session.commit()
            print(f"✅ 成功插入 {len(SEED_RULES)} 条审核规则")

        except Exception as e:
            await session.rollback()
            print(f"❌ 插入失败: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_audit_rules())
