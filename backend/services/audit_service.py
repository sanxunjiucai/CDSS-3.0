"""
诊断合理性审核 + 实时预警服务
MVP阶段：基于规则引擎（药物禁忌、适应症不符、必要检查缺口等）
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from schemas.patient import PatientContext
from services.audit_rule_service import AuditRuleService


class AuditWarning:
    def __init__(self, rule_id: str, level: str, code: str, message: str, suggestion: str):
        self.rule_id = rule_id      # 规则唯一 ID，供前端去重
        self.level = level          # "error" | "warning" | "info"
        self.code = code            # 规则分类代码
        self.message = message      # 提示文本
        self.suggestion = suggestion  # 建议操作


# ── 规则引擎数据 ──────────────────────────────────────────────────────────────
# 每条规则结构：
#   id       : 唯一标识
#   level    : error / warning / info
#   code     : 分类标签
#   check    : fn(diagnoses, drug_names, exam_names, patient_context) -> bool
#   message  : str
#   suggestion: str

def _has_dx(diagnoses: List[str], *keywords) -> bool:
    """诊断列表中包含任一关键词"""
    return any(kw in d for d in diagnoses for kw in keywords)

def _has_drug(drug_names: List[str], *keywords) -> bool:
    """用药列表中包含任一关键词"""
    return any(kw in drug for drug in drug_names for kw in keywords)

def _has_exam(exam_names: List[str], lab_results, *keywords) -> bool:
    """检查单或已有检验结果中包含任一关键词"""
    in_order = any(kw in e for e in exam_names for kw in keywords)
    in_lab   = any(kw in (lab.item_name or "") for lab in (lab_results or []) for kw in keywords)
    return in_order or in_lab


_CONSISTENCY_RULES = [

    # ── A 类：药物 × 诊断禁忌（error 级别） ──────────────────────────────────

    {
        "id": "nsaid_stemi",
        "level": "error",
        "code": "DRUG_CONTRAINDICATED",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "心肌梗死") and
            _has_drug(rx, "布洛芬", "吲哚美辛", "双氯芬酸", "塞来昔布", "萘普生")
        ),
        "message": "NSAIDs 禁用于急性心肌梗死",
        "suggestion": "NSAIDs 可增加 STEMI 死亡率及心衰风险，请立即停用，改用吗啡等替代镇痛方案。",
    },
    {
        "id": "anticoag_active_bleeding",
        "level": "error",
        "code": "DRUG_CONTRAINDICATED",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "活动性出血", "消化道出血", "脑出血") and
            _has_drug(rx, "华法林", "肝素", "利伐沙班", "阿哌沙班", "达比加群")
        ),
        "message": "活动性出血患者禁用抗凝药",
        "suggestion": "当前诊断存在活动性出血，禁用华法林/肝素/新型口服抗凝药，请立即评估出血风险。",
    },
    {
        "id": "corticosteroid_infection",
        "level": "error",
        "code": "DRUG_CONTRAINDICATED",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "脓毒症", "败血症", "严重感染") and
            _has_drug(rx, "地塞米松", "甲泼尼龙", "泼尼松") and
            not _has_dx(dx, "肾上腺皮质功能")  # 排除肾上腺危象适应症
        ),
        "message": "脓毒症患者慎用大剂量糖皮质激素",
        "suggestion": "除感染性休克外，脓毒症使用糖皮质激素可能加重感染扩散，请会诊评估。",
    },

    # ── B 类：药物 × 诊断需谨慎（warning 级别） ─────────────────────────────

    {
        "id": "metformin_stemi",
        "level": "warning",
        "code": "DRUG_CAUTION",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "心肌梗死") and
            _has_drug(rx, "二甲双胍")
        ),
        "message": "STEMI 急性期建议暂停二甲双胍",
        "suggestion": "急性期肾灌注不稳定，二甲双胍有乳酸酸中毒风险，建议改用胰岛素控糖，请内分泌科会诊。",
    },
    {
        "id": "betablocker_bradycardia",
        "level": "warning",
        "code": "DRUG_CAUTION",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "心动过缓", "房室传导阻滞") and
            _has_drug(rx, "美托洛尔", "比索洛尔", "阿替洛尔", "普萘洛尔")
        ),
        "message": "β受体阻滞剂慎用于心动过缓/传导阻滞",
        "suggestion": "β受体阻滞剂可加重心动过缓及传导阻滞，请评估心率和心电图后决定是否使用。",
    },
    {
        "id": "ace_hyperkalemia",
        "level": "warning",
        "code": "DRUG_CAUTION",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "高钾血症") and
            _has_drug(rx, "依那普利", "卡托普利", "培哚普利", "雷米普利", "贝那普利")
        ),
        "message": "高钾血症患者慎用 ACEI",
        "suggestion": "ACEI 可进一步升高血钾，请复查电解质后决定是否使用，密切监测血钾水平。",
    },
    {
        "id": "nephrotoxic_renal_failure",
        "level": "warning",
        "code": "DRUG_CAUTION",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "急性肾损伤", "慢性肾功能不全", "肾功能衰竭") and
            _has_drug(rx, "庆大霉素", "阿米卡星", "万古霉素", "两性霉素")
        ),
        "message": "肾功能不全患者慎用肾毒性药物",
        "suggestion": "当前肾功能诊断与所开药物存在肾毒性风险，请调整剂量或选择替代药物，监测肾功能。",
    },

    # ── C 类：过敏冲突（error 级别） ─────────────────────────────────────────

    {
        "id": "allergy_penicillin",
        "level": "error",
        "code": "DRUG_ALLERGY",
        "check": lambda dx, rx, ex, pt: (
            pt is not None and
            any("青霉素" in a for a in (pt.allergies or [])) and
            _has_drug(rx, "青霉素", "阿莫西林", "氨苄西林", "哌拉西林")
        ),
        "message": "患者青霉素过敏，禁止使用青霉素类药物",
        "suggestion": "患者有青霉素过敏史，当前处方含青霉素类药物，请立即更换为非β-内酰胺类抗生素。",
    },
    {
        "id": "allergy_sulfa",
        "level": "error",
        "code": "DRUG_ALLERGY",
        "check": lambda dx, rx, ex, pt: (
            pt is not None and
            any("磺胺" in a for a in (pt.allergies or [])) and
            _has_drug(rx, "磺胺", "复方新诺明", "SMZ")
        ),
        "message": "患者磺胺过敏，禁止使用磺胺类药物",
        "suggestion": "患者有磺胺过敏史，请更换为其他类抗生素，并记录过敏信息。",
    },

    # ── D 类：必要药物缺口（warning 级别） ───────────────────────────────────

    {
        "id": "stemi_antiplatelet_missing",
        "level": "warning",
        "code": "REQUIRED_DRUG_MISSING",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "心肌梗死") and
            not _has_drug(rx, "阿司匹林", "氯吡格雷", "替格瑞洛")
        ),
        "message": "STEMI 患者尚未使用抗血小板药物",
        "suggestion": "指南推荐尽早启动双联抗血小板治疗（阿司匹林 + P2Y12 抑制剂），建议 PCI 前给药。",
    },
    {
        "id": "stemi_statin_missing",
        "level": "info",
        "code": "RECOMMENDED_DRUG_MISSING",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "心肌梗死") and
            not _has_drug(rx, "他汀", "阿托伐他汀", "瑞舒伐他汀", "匹伐他汀", "辛伐他汀")
        ),
        "message": "STEMI 患者尚未使用他汀类药物",
        "suggestion": "STEMI 指南推荐尽早启动高强度他汀治疗（阿托伐他汀 40-80mg/d），有助于稳定斑块。",
    },
    {
        "id": "af_anticoag_missing",
        "level": "warning",
        "code": "REQUIRED_DRUG_MISSING",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "心房颤动", "房颤") and
            not _has_drug(rx, "华法林", "利伐沙班", "阿哌沙班", "达比加群", "艾多沙班")
        ),
        "message": "房颤患者尚未使用抗凝药物",
        "suggestion": "房颤患者卒中风险较高，请根据 CHA₂DS₂-VASc 评分评估抗凝适应症，及时启动抗凝治疗。",
    },
    {
        "id": "dm_hypoglycemic_missing",
        "level": "info",
        "code": "RECOMMENDED_DRUG_MISSING",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "糖尿病") and
            not _has_drug(rx, "胰岛素", "二甲双胍", "格列", "西格列", "达格列", "恩格列")
        ),
        "message": "糖尿病患者尚未使用降糖药物",
        "suggestion": "请确认患者是否已有院外降糖方案，或评估是否需要院内血糖管理。",
    },

    # ── E 类：必要检查缺口（warning / info 级别） ─────────────────────────────

    {
        "id": "stemi_troponin_missing",
        "level": "warning",
        "code": "REQUIRED_EXAM_MISSING",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "心肌梗死") and
            not _has_exam(ex, pt.lab_results if pt else [], "肌钙蛋白", "TNI", "TNT", "cTn")
        ),
        "message": "STEMI 患者肌钙蛋白尚未检测",
        "suggestion": "肌钙蛋白（cTnI/cTnT）是确诊 STEMI 的关键指标，建议立即开具动态检测（0h/3h/6h）。",
    },
    {
        "id": "stemi_ecg_missing",
        "level": "warning",
        "code": "REQUIRED_EXAM_MISSING",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "心肌梗死") and
            not _has_exam(ex, pt.lab_results if pt else [], "心电图", "ECG", "EKG")
        ),
        "message": "STEMI 患者尚未开具心电图",
        "suggestion": "急性胸痛患者应立即行 12 导联心电图，明确 ST 段改变，评估再灌注治疗时机。",
    },
    {
        "id": "dm_hba1c_missing",
        "level": "info",
        "code": "RECOMMENDED_EXAM_MISSING",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "糖尿病") and
            not _has_exam(ex, pt.lab_results if pt else [], "糖化", "HbA1c", "糖化血红蛋白")
        ),
        "message": "糖尿病患者尚未检测 HbA1c",
        "suggestion": "HbA1c 反映近3个月血糖控制水平，建议检测以指导降糖方案调整。",
    },
    {
        "id": "hypertension_renal_function",
        "level": "info",
        "code": "RECOMMENDED_EXAM_MISSING",
        "check": lambda dx, rx, ex, pt: (
            _has_dx(dx, "高血压") and
            not _has_exam(ex, pt.lab_results if pt else [], "肌酐", "尿素氮", "肾功能", "Cr")
        ),
        "message": "高血压患者尚未检测肾功能",
        "suggestion": "高血压可导致肾损害，建议检测血肌酐、尿素氮评估靶器官损害。",
    },
]


class AuditService:
    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session

    def _get_field_values(
        self,
        field: str,
        diagnoses: List[str],
        drug_names: List[str],
        exam_names: List[str],
        patient_context: Optional[PatientContext],
    ):
        if field == "diagnoses":
            return diagnoses
        if field == "drug_names":
            return drug_names
        if field == "exam_names":
            return exam_names
        if field == "patient_allergies":
            return (patient_context.allergies if patient_context else []) or []
        if field == "lab_item_names":
            return [i.item_name or "" for i in ((patient_context.lab_results if patient_context else []) or [])]
        if field == "lab_item_codes":
            return [i.item_code or "" for i in ((patient_context.lab_results if patient_context else []) or [])]
        if field == "patient_gender":
            return (patient_context.gender.value if patient_context and patient_context.gender else "")
        if field == "patient_age":
            return patient_context.age if patient_context else None
        return []

    def _match_keyword_list(self, source_values, keywords, mode: str) -> bool:
        source = [str(v).lower() for v in (source_values or []) if v is not None]
        targets = [str(v).lower() for v in (keywords or []) if v is not None]
        if mode == "contains_all":
            return all(any(t in s for s in source) for t in targets)
        if mode == "not_contains_any":
            return not any(any(t in s for s in source) for t in targets)
        return any(any(t in s for s in source) for t in targets)

    def _match_condition_item(
        self,
        item: dict,
        diagnoses: List[str],
        drug_names: List[str],
        exam_names: List[str],
        patient_context: Optional[PatientContext],
    ) -> bool:
        if not isinstance(item, dict):
            return False
        op = str(item.get("op") or "").strip().lower()
        field = str(item.get("field") or "").strip()

        if op in {"contains_any", "contains_all", "not_contains_any"}:
            values = self._get_field_values(field, diagnoses, drug_names, exam_names, patient_context)
            return self._match_keyword_list(values, item.get("values") or [], op)

        if op == "equals":
            value = self._get_field_values(field, diagnoses, drug_names, exam_names, patient_context)
            if isinstance(value, list):
                return str(item.get("value")) in [str(v) for v in value]
            return str(value) == str(item.get("value"))

        if op == "in":
            value = self._get_field_values(field, diagnoses, drug_names, exam_names, patient_context)
            candidates = [str(v) for v in (item.get("values") or [])]
            if isinstance(value, list):
                return any(str(v) in candidates for v in value)
            return str(value) in candidates

        if op in {"lab_ratio_ge", "lab_value_ge", "lab_value_le", "lab_is_abnormal"}:
            if not patient_context:
                return False
            item_code = str(item.get("item_code") or "").upper()
            lab = next((i for i in (patient_context.lab_results or []) if (i.item_code or "").upper() == item_code), None)
            if not lab:
                return False
            if op == "lab_is_abnormal":
                return bool(lab.is_abnormal) == bool(item.get("value", True))
            threshold = float(item.get("value", 0))
            if op == "lab_ratio_ge":
                if not lab.reference_high or lab.reference_high <= 0:
                    return False
                return (lab.value / lab.reference_high) >= threshold
            if op == "lab_value_ge":
                return float(lab.value) >= threshold
            if op == "lab_value_le":
                return float(lab.value) <= threshold
        return False

    def _evaluate_runtime_condition(
        self,
        condition: dict,
        diagnoses: List[str],
        drug_names: List[str],
        exam_names: List[str],
        patient_context: Optional[PatientContext],
    ) -> bool:
        if not isinstance(condition, dict):
            return False
        all_items = condition.get("all") or []
        any_items = condition.get("any") or []
        not_items = condition.get("not") or []

        all_passed = all(
            self._match_condition_item(i, diagnoses, drug_names, exam_names, patient_context)
            for i in all_items
        ) if all_items else True
        any_passed = any(
            self._match_condition_item(i, diagnoses, drug_names, exam_names, patient_context)
            for i in any_items
        ) if any_items else True
        not_passed = all(
            not self._match_condition_item(i, diagnoses, drug_names, exam_names, patient_context)
            for i in not_items
        ) if not_items else True
        return all_passed and any_passed and not_passed

    async def _run_runtime_rules(
        self,
        diagnoses: List[str],
        drug_names: List[str],
        exam_names: List[str],
        patient_context: Optional[PatientContext],
    ):
        if not self.session:
            return False, []
        service = AuditRuleService(self.session)
        runtime_rules = await service.get_runtime_rules("diagnosis_consistency")
        if not runtime_rules:
            return False, []

        warnings = []
        for rule in runtime_rules:
            try:
                matched = self._evaluate_runtime_condition(
                    rule.condition or {},
                    diagnoses,
                    drug_names,
                    exam_names,
                    patient_context,
                )
            except Exception:
                matched = False
            if matched:
                warnings.append(AuditWarning(
                    rule_id=str(rule.id),
                    level=rule.level,
                    code=rule.code,
                    message=rule.message,
                    suggestion=rule.suggestion or "",
                ))
        return True, warnings

    async def check_drug_order(
        self,
        drug_name: str,
        drug_id: Optional[str],
        patient_context: Optional[PatientContext],
    ) -> List[AuditWarning]:
        """开药时审核：过敏、禁忌检查"""
        warnings = []
        if patient_context:
            for allergy in patient_context.allergies:
                if allergy and drug_name and allergy.lower() in drug_name.lower():
                    warnings.append(AuditWarning(
                        rule_id=f"allergy_{allergy}",
                        level="error",
                        code="DRUG_ALLERGY",
                        message=f"患者对【{allergy}】过敏，当前开具的【{drug_name}】可能存在过敏风险！",
                        suggestion="请更换药物或在知情同意后谨慎使用。",
                    ))
        return warnings

    async def check_exam_order(
        self,
        exam_name: str,
        patient_context: Optional[PatientContext],
    ) -> List[AuditWarning]:
        """开单时审核：适应症检查（MVP阶段简化）"""
        return []

    async def check_diagnosis_consistency(
        self,
        diagnoses: List[str],
        drug_names: List[str],
        exam_names: List[str],
        patient_context: Optional[PatientContext],
    ) -> List[AuditWarning]:
        """
        诊断与处置一致性审核（规则引擎）
        - diagnoses  : 当前诊断名称列表
        - drug_names : 即将开具/已有用药列表
        - exam_names : 即将开具检查列表
        - patient_context : 患者上下文（含过敏史、检验结果）
        """
        runtime_on, warnings = await self._run_runtime_rules(
            diagnoses,
            drug_names,
            exam_names,
            patient_context,
        )
        if not runtime_on:
            warnings = []
            for rule in _CONSISTENCY_RULES:
                try:
                    triggered = rule["check"](diagnoses, drug_names, exam_names, patient_context)
                except Exception:
                    continue
                if triggered:
                    warnings.append(AuditWarning(
                        rule_id=rule["id"],
                        level=rule["level"],
                        code=rule["code"],
                        message=rule["message"],
                        suggestion=rule["suggestion"],
                    ))
        _order = {"error": 0, "warning": 1, "info": 2}
        warnings.sort(key=lambda w: _order.get(w.level, 9))
        return warnings
