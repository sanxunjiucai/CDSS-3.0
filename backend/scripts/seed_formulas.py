"""
初始化医学公式数据
用法：cd backend && python scripts/seed_formulas.py
"""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from db.database import AsyncSessionLocal, init_db
from db.models.formula import Formula

FORMULAS = [
    {
        "name": "BMI（体质指数）",
        "category": "营养状态",
        "department": "全科",
        "description": "体质指数（Body Mass Index）是评估成人体重状况的常用指标，反映体重与身高的关系。",
        "formula_expr": "BMI = 体重(kg) ÷ 身高(m)²",
        "parameters": [
            {"name": "weight", "label": "体重", "unit": "kg", "type": "number", "min": 1, "max": 500, "placeholder": "如：70"},
            {"name": "height", "label": "身高", "unit": "cm", "type": "number", "min": 50, "max": 250, "placeholder": "如：170"},
        ],
        "interpretation_rules": [
            {"min": 0,    "max": 18.5, "level": "偏瘦",   "interpretation": "体重偏低，存在营养不良风险，建议增加营养摄入", "color": "warning"},
            {"min": 18.5, "max": 24.0, "level": "正常",   "interpretation": "体重正常，维持健康生活方式", "color": "success"},
            {"min": 24.0, "max": 28.0, "level": "超重",   "interpretation": "超重，建议控制饮食、增加运动", "color": "warning"},
            {"min": 28.0, "max": 999,  "level": "肥胖",   "interpretation": "肥胖，心血管风险增加，建议专科就诊", "color": "danger"},
        ],
        "reference": "WHO 体重状态分类标准（亚洲人群调整值）",
    },
    {
        "name": "eGFR（CKD-EPI公式）",
        "category": "肾功能",
        "department": "肾内科",
        "description": "估算肾小球滤过率（CKD-EPI 2021），用于评估慢性肾脏病分期。",
        "formula_expr": "eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^(-1.200) × 0.9938^年龄",
        "parameters": [
            {"name": "scr",  "label": "血肌酐",  "unit": "mg/dL", "type": "number", "min": 0.1, "max": 20,  "placeholder": "如：1.0"},
            {"name": "age",  "label": "年龄",    "unit": "岁",    "type": "number", "min": 18,  "max": 120, "placeholder": "如：55"},
            {"name": "sex",  "label": "性别",    "unit": "",      "type": "select", "options": [{"value": "male", "label": "男"}, {"value": "female", "label": "女"}]},
        ],
        "interpretation_rules": [
            {"min": 90,  "max": 999, "level": "G1（正常或偏高）", "interpretation": "eGFR≥90，若有肾损伤标志物则为CKD G1期", "color": "success"},
            {"min": 60,  "max": 90,  "level": "G2（轻度降低）",   "interpretation": "CKD G2期，每年监测eGFR", "color": "success"},
            {"min": 45,  "max": 60,  "level": "G3a（轻中度降低）","interpretation": "CKD G3a期，6个月复查", "color": "warning"},
            {"min": 30,  "max": 45,  "level": "G3b（中重度降低）","interpretation": "CKD G3b期，3个月复查，评估并发症", "color": "warning"},
            {"min": 15,  "max": 30,  "level": "G4（重度降低）",   "interpretation": "CKD G4期，需肾科管理，准备肾替代治疗", "color": "danger"},
            {"min": 0,   "max": 15,  "level": "G5（肾衰竭）",    "interpretation": "CKD G5期（肾衰竭），需肾替代治疗", "color": "danger"},
        ],
        "reference": "KDIGO 2022 CKD Clinical Practice Guideline",
    },
    {
        "name": "Cockcroft-Gault 肌酐清除率",
        "category": "肾功能",
        "department": "肾内科",
        "description": "经典肌酐清除率公式，用于药物剂量调整，尤其是老年患者和肾功能减退患者。",
        "formula_expr": "CCr = [(140-年龄) × 体重(kg)] / [72 × 血肌酐(mg/dL)] × (女性×0.85)",
        "parameters": [
            {"name": "age",    "label": "年龄",   "unit": "岁",    "type": "number", "min": 18,  "max": 120, "placeholder": "如：65"},
            {"name": "weight", "label": "体重",   "unit": "kg",   "type": "number", "min": 20,  "max": 300, "placeholder": "如：65"},
            {"name": "scr",    "label": "血肌酐", "unit": "mg/dL","type": "number", "min": 0.1, "max": 20,  "placeholder": "如：1.2"},
            {"name": "sex",    "label": "性别",   "unit": "",     "type": "select", "options": [{"value": "male", "label": "男"}, {"value": "female", "label": "女"}]},
        ],
        "interpretation_rules": [
            {"min": 90,  "max": 999, "level": "正常",     "interpretation": "肾功能正常，无需调整肾排泄药物剂量", "color": "success"},
            {"min": 60,  "max": 90,  "level": "轻度下降", "interpretation": "轻度肾功能不全，注意监测", "color": "success"},
            {"min": 30,  "max": 60,  "level": "中度下降", "interpretation": "中度肾功能不全，需调整部分药物剂量", "color": "warning"},
            {"min": 15,  "max": 30,  "level": "重度下降", "interpretation": "重度肾功能不全，多数肾排泄药物需显著减量", "color": "danger"},
            {"min": 0,   "max": 15,  "level": "肾衰竭",   "interpretation": "肾衰竭，多数肾排泄药物禁忌或需血透后给药", "color": "danger"},
        ],
        "reference": "Cockcroft DW, Gault MH. Nephron 1976",
    },
    {
        "name": "体表面积（Mosteller公式）",
        "category": "剂量计算",
        "department": "肿瘤科",
        "description": "体表面积（BSA）是化疗药物剂量计算的重要参数，Mosteller公式简便准确。",
        "formula_expr": "BSA (m²) = √[(身高cm × 体重kg) / 3600]",
        "parameters": [
            {"name": "weight", "label": "体重", "unit": "kg", "type": "number", "min": 1, "max": 300, "placeholder": "如：65"},
            {"name": "height", "label": "身高", "unit": "cm", "type": "number", "min": 50, "max": 250, "placeholder": "如：170"},
        ],
        "interpretation_rules": [
            {"min": 0,   "max": 1.5, "level": "偏小", "interpretation": "BSA偏小，化疗药物按实际BSA计算，注意毒性", "color": "warning"},
            {"min": 1.5, "max": 2.0, "level": "正常", "interpretation": "BSA在正常范围内", "color": "success"},
            {"min": 2.0, "max": 999, "level": "偏大", "interpretation": "BSA偏大，部分药物需考虑最大剂量上限", "color": "warning"},
        ],
        "reference": "Mosteller RD. N Engl J Med 1987",
    },
    {
        "name": "MELD评分",
        "category": "肝功能",
        "department": "消化科",
        "description": "终末期肝病模型（MELD）评分，用于评估肝硬化严重程度和预测3个月死亡率，指导肝移植优先级。",
        "formula_expr": "MELD = 3.78×ln(胆红素mg/dL) + 11.2×ln(INR) + 9.57×ln(肌酐mg/dL) + 6.43",
        "parameters": [
            {"name": "bilirubin",  "label": "总胆红素", "unit": "mg/dL", "type": "number", "min": 0.1, "max": 50, "placeholder": "如：2.0"},
            {"name": "inr",        "label": "INR",      "unit": "",      "type": "number", "min": 0.5, "max": 10, "placeholder": "如：1.5"},
            {"name": "creatinine", "label": "血肌酐",   "unit": "mg/dL", "type": "number", "min": 0.1, "max": 4,  "placeholder": "如：1.0"},
        ],
        "interpretation_rules": [
            {"min": 0,  "max": 9,  "level": "低危",  "interpretation": "3个月死亡率约1.9%", "color": "success"},
            {"min": 10, "max": 19, "level": "中低危", "interpretation": "3个月死亡率约6.0%", "color": "success"},
            {"min": 20, "max": 29, "level": "中高危", "interpretation": "3个月死亡率约19.6%", "color": "warning"},
            {"min": 30, "max": 39, "level": "高危",  "interpretation": "3个月死亡率约52.6%", "color": "danger"},
            {"min": 40, "max": 999,"level": "极高危", "interpretation": "3个月死亡率约71.3%，优先列入肝移植", "color": "danger"},
        ],
        "reference": "Kamath PS et al. Hepatology 2001",
    },
    {
        "name": "平均动脉压（MAP）",
        "category": "心血管",
        "department": "心血管科",
        "description": "平均动脉压是评估组织灌注的重要指标，常用于ICU监测和休克管理。",
        "formula_expr": "MAP = DBP + (SBP - DBP) / 3",
        "parameters": [
            {"name": "sbp", "label": "收缩压", "unit": "mmHg", "type": "number", "min": 50, "max": 300, "placeholder": "如：120"},
            {"name": "dbp", "label": "舒张压", "unit": "mmHg", "type": "number", "min": 20, "max": 200, "placeholder": "如：80"},
        ],
        "interpretation_rules": [
            {"min": 0,   "max": 60,  "level": "过低", "interpretation": "MAP<60mmHg，组织灌注不足，警惕休克", "color": "danger"},
            {"min": 60,  "max": 100, "level": "正常", "interpretation": "MAP在正常范围（65-100mmHg），组织灌注良好", "color": "success"},
            {"min": 100, "max": 999, "level": "偏高", "interpretation": "MAP偏高，可能提示高血压或血管收缩，需评估原因", "color": "warning"},
        ],
        "reference": "重症医学基础理论",
    },
    {
        "name": "阴离子间隙（Anion Gap）",
        "category": "酸碱平衡",
        "department": "急诊科",
        "description": "阴离子间隙用于分析代谢性酸中毒的原因，区分高AG型和正常AG型酸中毒。",
        "formula_expr": "AG = Na⁺ - Cl⁻ - HCO₃⁻",
        "parameters": [
            {"name": "na",   "label": "血钠(Na⁺)",  "unit": "mEq/L", "type": "number", "min": 100, "max": 180, "placeholder": "如：140"},
            {"name": "cl",   "label": "血氯(Cl⁻)",  "unit": "mEq/L", "type": "number", "min": 70,  "max": 150, "placeholder": "如：105"},
            {"name": "hco3", "label": "碳酸氢根",   "unit": "mEq/L", "type": "number", "min": 5,   "max": 50,  "placeholder": "如：24"},
        ],
        "interpretation_rules": [
            {"min": 0,   "max": 12,  "level": "正常AG",  "interpretation": "正常AG（8-12 mEq/L），提示正常AG型酸中毒（腹泻、RTA等）或无酸中毒", "color": "success"},
            {"min": 12,  "max": 20,  "level": "轻度升高", "interpretation": "AG轻度升高，可见于轻度酮症、乳酸性酸中毒早期", "color": "warning"},
            {"min": 20,  "max": 999, "level": "显著升高", "interpretation": "高AG型酸中毒（MUDPILES：甲醇/尿毒症/DKA/苯丙醇/异丙醇/乳酸/水杨酸）", "color": "danger"},
        ],
        "reference": "酸碱代谢紊乱诊断与治疗",
    },
    {
        "name": "校正QTc间期（Bazett公式）",
        "category": "心血管",
        "department": "心血管科",
        "description": "校正QT间期用于评估心律失常和药物对心脏复极的影响。QTc延长与恶性心律失常风险相关。",
        "formula_expr": "QTc = QT(ms) / √(RR间期(s))",
        "parameters": [
            {"name": "qt", "label": "QT间期", "unit": "ms", "type": "number", "min": 200, "max": 700, "placeholder": "如：400"},
            {"name": "rr", "label": "RR间期", "unit": "ms", "type": "number", "min": 300, "max": 2000, "placeholder": "如：800（心率75次时约800ms）"},
        ],
        "interpretation_rules": [
            {"min": 0,   "max": 440, "level": "正常（男）",  "interpretation": "男性QTc<440ms为正常", "color": "success"},
            {"min": 440, "max": 460, "level": "边界（女）",  "interpretation": "男性440-470ms属边界延长，女性<460ms为正常", "color": "warning"},
            {"min": 460, "max": 500, "level": "延长",      "interpretation": "QTc延长（460-500ms），注意药物因素，避免联用QT延长药物", "color": "warning"},
            {"min": 500, "max": 999, "level": "显著延长",   "interpretation": "QTc>500ms，尖端扭转型室速风险显著升高，需立即处理", "color": "danger"},
        ],
        "reference": "AHA/ACC 心电图指南",
    },
    {
        "name": "血浆渗透压估算",
        "category": "水电解质",
        "department": "急诊科",
        "description": "估算血浆渗透压，用于评估高渗状态、低钠血症分型和渗透压间隙计算。",
        "formula_expr": "Osm = 2×Na⁺ + 葡萄糖(mg/dL)/18 + BUN(mg/dL)/2.8",
        "parameters": [
            {"name": "na",      "label": "血钠",   "unit": "mmol/L", "type": "number", "min": 100, "max": 180, "placeholder": "如：140"},
            {"name": "glucose", "label": "血糖",   "unit": "mg/dL",  "type": "number", "min": 50,  "max": 2000, "placeholder": "如：100"},
            {"name": "bun",     "label": "血尿素氮","unit": "mg/dL", "type": "number", "min": 5,   "max": 200, "placeholder": "如：15"},
        ],
        "interpretation_rules": [
            {"min": 0,   "max": 275, "level": "偏低", "interpretation": "低渗状态，评估低钠血症原因", "color": "warning"},
            {"min": 275, "max": 295, "level": "正常", "interpretation": "血浆渗透压正常（275-295 mOsm/kg）", "color": "success"},
            {"min": 295, "max": 320, "level": "偏高", "interpretation": "高渗状态，评估脱水、高血糖或高钠血症", "color": "warning"},
            {"min": 320, "max": 999, "level": "显著升高","interpretation": "严重高渗，可致意识障碍、昏迷", "color": "danger"},
        ],
        "reference": "临床水电解质代谢紊乱诊疗",
    },
    {
        "name": "理想体重（IBW）",
        "category": "剂量计算",
        "department": "全科",
        "description": "理想体重用于药物剂量计算（如氨基糖苷类、万古霉素），避免肥胖患者用药过量。",
        "formula_expr": "IBW(男) = 50 + 0.91×(身高cm - 152.4)\nIBW(女) = 45.5 + 0.91×(身高cm - 152.4)",
        "parameters": [
            {"name": "height", "label": "身高", "unit": "cm", "type": "number", "min": 100, "max": 250, "placeholder": "如：170"},
            {"name": "sex",    "label": "性别", "unit": "",   "type": "select", "options": [{"value": "male", "label": "男"}, {"value": "female", "label": "女"}]},
        ],
        "interpretation_rules": [],
        "reference": "Devine BJ. Drug Intell Clin Pharm 1974",
    },
]


async def seed():
    await init_db()
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select, func
        existing = (await session.execute(select(func.count()).select_from(Formula))).scalar()
        if existing and existing > 0:
            print(f"[跳过] formulas 表已有 {existing} 条数据")
            return

        for item in FORMULAS:
            f = Formula(
                name=item["name"],
                category=item.get("category"),
                department=item.get("department"),
                description=item.get("description"),
                formula_expr=item.get("formula_expr"),
                reference=item.get("reference"),
                parameters=item.get("parameters", []),
                interpretation_rules=item.get("interpretation_rules", []),
                is_published=True,
            )
            session.add(f)

        await session.commit()
        print(f"[完成] 导入 {len(FORMULAS)} 个医学公式")


if __name__ == "__main__":
    asyncio.run(seed())
