"""
开发环境自动种子数据
在 lifespan 中调用，仅在对应表为空时才写入
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from db.database import AsyncSessionLocal
from db.models.formula import Formula
from db.models.assessment import Assessment


# ══════════════════════════════════════════════════════════════
# 医学公式种子数据
# ══════════════════════════════════════════════════════════════

FORMULA_SEEDS = [
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
            {"min": 0,    "max": 18.5, "level": "偏瘦", "interpretation": "体重偏低，存在营养不良风险，建议增加营养摄入", "color": "warning"},
            {"min": 18.5, "max": 24.0, "level": "正常", "interpretation": "体重正常，维持健康生活方式", "color": "success"},
            {"min": 24.0, "max": 28.0, "level": "超重", "interpretation": "超重，建议控制饮食、增加运动", "color": "warning"},
            {"min": 28.0, "max": 999,  "level": "肥胖", "interpretation": "肥胖，心血管风险增加，建议专科就诊", "color": "danger"},
        ],
    },
    {
        "name": "eGFR（CKD-EPI公式）",
        "category": "肾功能",
        "department": "肾内科",
        "description": "估算肾小球滤过率（CKD-EPI 2021），用于评估慢性肾脏病分期。",
        "formula_expr": "eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^(-1.200) × 0.9938^年龄",
        "parameters": [
            {"name": "scr", "label": "血肌酐", "unit": "mg/dL", "type": "number", "min": 0.1, "max": 20, "placeholder": "如：1.0"},
            {"name": "age", "label": "年龄",   "unit": "岁",     "type": "number", "min": 18,  "max": 120, "placeholder": "如：55"},
            {"name": "sex", "label": "性别",   "unit": "",       "type": "select",
             "options": [{"value": "male", "label": "男"}, {"value": "female", "label": "女"}]},
        ],
        "interpretation_rules": [
            {"min": 90, "max": 999, "level": "G1（正常或偏高）",  "interpretation": "eGFR≥90，若有肾损伤标志物则为CKD G1期", "color": "success"},
            {"min": 60, "max": 90,  "level": "G2（轻度降低）",   "interpretation": "CKD G2期，每年监测eGFR", "color": "success"},
            {"min": 45, "max": 60,  "level": "G3a（轻中度降低）","interpretation": "CKD G3a期，6个月复查", "color": "warning"},
            {"min": 30, "max": 45,  "level": "G3b（中重度降低）","interpretation": "CKD G3b期，3个月复查，评估并发症", "color": "warning"},
            {"min": 15, "max": 30,  "level": "G4（重度降低）",   "interpretation": "CKD G4期，需肾科管理，准备肾替代治疗", "color": "danger"},
            {"min": 0,  "max": 15,  "level": "G5（肾衰竭）",    "interpretation": "CKD G5期，需肾替代治疗", "color": "danger"},
        ],
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
            {"name": "sex",    "label": "性别",   "unit": "",     "type": "select",
             "options": [{"value": "male", "label": "男"}, {"value": "female", "label": "女"}]},
        ],
        "interpretation_rules": [
            {"min": 90, "max": 999, "level": "正常",     "interpretation": "肾功能正常，无需调整肾排泄药物剂量", "color": "success"},
            {"min": 60, "max": 90,  "level": "轻度下降", "interpretation": "轻度肾功能不全，注意监测", "color": "success"},
            {"min": 30, "max": 60,  "level": "中度下降", "interpretation": "中度肾功能不全，需调整部分药物剂量", "color": "warning"},
            {"min": 15, "max": 30,  "level": "重度下降", "interpretation": "重度肾功能不全，多数肾排泄药物需显著减量", "color": "danger"},
            {"min": 0,  "max": 15,  "level": "肾衰竭",   "interpretation": "肾衰竭，多数肾排泄药物禁忌或需血透后给药", "color": "danger"},
        ],
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
            {"min": 60,  "max": 100, "level": "正常", "interpretation": "MAP在正常范围（65-100mmHg）", "color": "success"},
            {"min": 100, "max": 999, "level": "偏高", "interpretation": "MAP偏高，可能提示高血压或血管收缩", "color": "warning"},
        ],
    },
    {
        "name": "阴离子间隙（Anion Gap）",
        "category": "酸碱平衡",
        "department": "急诊科",
        "description": "阴离子间隙用于分析代谢性酸中毒的原因，区分高AG型和正常AG型酸中毒。",
        "formula_expr": "AG = Na⁺ - Cl⁻ - HCO₃⁻",
        "parameters": [
            {"name": "na",   "label": "血钠(Na⁺)", "unit": "mEq/L", "type": "number", "min": 100, "max": 180, "placeholder": "如：140"},
            {"name": "cl",   "label": "血氯(Cl⁻)", "unit": "mEq/L", "type": "number", "min": 70,  "max": 150, "placeholder": "如：105"},
            {"name": "hco3", "label": "碳酸氢根",  "unit": "mEq/L", "type": "number", "min": 5,   "max": 50,  "placeholder": "如：24"},
        ],
        "interpretation_rules": [
            {"min": 0,  "max": 12,  "level": "正常AG",  "interpretation": "正常AG（8-12 mEq/L），提示正常AG型酸中毒或无酸中毒", "color": "success"},
            {"min": 12, "max": 20,  "level": "轻度升高", "interpretation": "AG轻度升高，可见于轻度酮症、乳酸性酸中毒早期", "color": "warning"},
            {"min": 20, "max": 999, "level": "显著升高", "interpretation": "高AG型酸中毒，需评估MUDPILES相关病因", "color": "danger"},
        ],
    },
    {
        "name": "校正QTc间期（Bazett公式）",
        "category": "心血管",
        "department": "心血管科",
        "description": "校正QT间期用于评估心律失常和药物对心脏复极的影响。",
        "formula_expr": "QTc = QT(ms) / √(RR间期(s))",
        "parameters": [
            {"name": "qt", "label": "QT间期", "unit": "ms", "type": "number", "min": 200, "max": 700, "placeholder": "如：400"},
            {"name": "rr", "label": "RR间期", "unit": "ms", "type": "number", "min": 300, "max": 2000, "placeholder": "如：800"},
        ],
        "interpretation_rules": [
            {"min": 0,   "max": 440, "level": "正常",   "interpretation": "QTc在正常范围", "color": "success"},
            {"min": 440, "max": 500, "level": "延长",   "interpretation": "QTc延长（440-500ms），注意药物因素", "color": "warning"},
            {"min": 500, "max": 999, "level": "显著延长","interpretation": "QTc>500ms，尖端扭转型室速风险显著升高", "color": "danger"},
        ],
    },
]


# ══════════════════════════════════════════════════════════════
# 量表种子数据
# ══════════════════════════════════════════════════════════════

ASSESSMENT_SEEDS = [
    {
        "name": "PHQ-9 抑郁症筛查量表",
        "department": "精神科",
        "description": "患者健康问卷-9（PHQ-9）是评估抑郁症状严重程度的常用工具，基于DSM-IV诊断标准。",
        "questions": [
            {"id": "q1", "text": "做事时提不起劲或没有兴趣", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q2", "text": "感到心情低落、沮丧或绝望", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q3", "text": "入睡困难、睡不安稳或睡眠过多", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q4", "text": "感觉疲倦或没有活力", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q5", "text": "食欲不振或吃太多", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q6", "text": "觉得自己很糟，或觉得自己是个失败者，或让自己或家人失望", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q7", "text": "很难集中注意力做事，例如看报纸或看电视", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q8", "text": "动作或说话缓慢；或相反，烦躁或坐立不安", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q9", "text": "有不如死掉或用某种方式伤害自己的念头", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
        ],
        "scoring_rules": [
            {"min": 0,  "max": 4,  "label": "无抑郁",  "level": "normal"},
            {"min": 5,  "max": 9,  "label": "轻度抑郁", "level": "warning"},
            {"min": 10, "max": 14, "label": "中度抑郁", "level": "warning"},
            {"min": 15, "max": 19, "label": "中重度抑郁","level": "danger"},
            {"min": 20, "max": 27, "label": "重度抑郁", "level": "danger"},
        ],
    },
    {
        "name": "GAD-7 广泛性焦虑量表",
        "department": "精神科",
        "description": "广泛性焦虑量表-7（GAD-7）是评估焦虑症状严重程度的简短筛查工具。",
        "questions": [
            {"id": "q1", "text": "感觉紧张、焦虑或烦躁", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q2", "text": "不能停止或无法控制担心", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q3", "text": "对各种各样的事情担心过多", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q4", "text": "很难放松下来", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q5", "text": "由于不安而无法静坐", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q6", "text": "变得容易烦恼或急躁", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
            {"id": "q7", "text": "感到似乎将有可怕的事情发生而害怕", "type": "single",
             "options": [{"value": 0, "label": "从不"}, {"value": 1, "label": "有几天"},
                         {"value": 2, "label": "超过一半时间"}, {"value": 3, "label": "几乎每天"}]},
        ],
        "scoring_rules": [
            {"min": 0,  "max": 4,  "label": "无焦虑",  "level": "normal"},
            {"min": 5,  "max": 9,  "label": "轻度焦虑", "level": "warning"},
            {"min": 10, "max": 14, "label": "中度焦虑", "level": "warning"},
            {"min": 15, "max": 21, "label": "重度焦虑", "level": "danger"},
        ],
    },
    {
        "name": "GCS 格拉斯哥昏迷量表",
        "department": "急诊科",
        "description": "格拉斯哥昏迷量表（GCS）用于评估患者意识状态，广泛应用于急诊和ICU。",
        "questions": [
            {"id": "eye", "text": "睁眼反应（E）", "type": "single",
             "options": [{"value": 1, "label": "无反应"}, {"value": 2, "label": "疼痛刺激睁眼"},
                         {"value": 3, "label": "声音刺激睁眼"}, {"value": 4, "label": "自动睁眼"}]},
            {"id": "verbal", "text": "言语反应（V）", "type": "single",
             "options": [{"value": 1, "label": "无反应"}, {"value": 2, "label": "发出声音"},
                         {"value": 3, "label": "说出单词"}, {"value": 4, "label": "言语错乱"},
                         {"value": 5, "label": "正常交流"}]},
            {"id": "motor", "text": "运动反应（M）", "type": "single",
             "options": [{"value": 1, "label": "无反应"}, {"value": 2, "label": "去大脑强直"},
                         {"value": 3, "label": "去皮质强直"}, {"value": 4, "label": "屈曲逃避"},
                         {"value": 5, "label": "定向运动"}, {"value": 6, "label": "遵嘱运动"}]},
        ],
        "scoring_rules": [
            {"min": 3,  "max": 8,  "label": "重度昏迷", "level": "danger"},
            {"min": 9,  "max": 12, "label": "中度昏迷", "level": "warning"},
            {"min": 13, "max": 15, "label": "轻度或无昏迷","level": "normal"},
        ],
    },
    {
        "name": "NRS 2002 营养风险筛查",
        "department": "内科",
        "description": "营养风险筛查（NRS 2002）是住院患者营养风险评估的推荐工具。",
        "questions": [
            {"id": "bmi", "text": "BMI < 20.5 kg/m²", "type": "single",
             "options": [{"value": 0, "label": "否"}, {"value": 1, "label": "是"}]},
            {"id": "weight_loss", "text": "近3个月体重下降", "type": "single",
             "options": [{"value": 0, "label": "否"}, {"value": 1, "label": "是"}]},
            {"id": "food_intake", "text": "上周饮食摄入减少", "type": "single",
             "options": [{"value": 0, "label": "否"}, {"value": 1, "label": "是"}]},
            {"id": "severity", "text": "疾病严重程度", "type": "single",
             "options": [{"value": 0, "label": "正常营养需求"}, {"value": 1, "label": "髋部骨折/慢性病急性发作"},
                         {"value": 2, "label": "腹部大手术/脑卒中/血液恶性肿瘤"},
                         {"value": 3, "label": "头部外伤/骨髓移植/ICU患者（APACHE>10）"}]},
        ],
        "scoring_rules": [
            {"min": 0, "max": 2, "label": "无营养风险", "level": "normal"},
            {"min": 3, "max": 7, "label": "有营养风险，需营养支持", "level": "danger"},
        ],
    },
]


async def _seed_formulas(session: AsyncSession):
    count = (await session.execute(select(func.count()).select_from(Formula))).scalar() or 0
    if count > 0:
        return
    for item in FORMULA_SEEDS:
        session.add(Formula(
            name=item["name"],
            category=item.get("category"),
            department=item.get("department"),
            description=item.get("description"),
            formula_expr=item.get("formula_expr"),
            parameters=item.get("parameters", []),
            interpretation_rules=item.get("interpretation_rules", []),
            is_published=True,
        ))
    await session.commit()
    print(f"[seed] 导入 {len(FORMULA_SEEDS)} 个医学公式")


async def _seed_assessments(session: AsyncSession):
    count = (await session.execute(select(func.count()).select_from(Assessment))).scalar() or 0
    if count > 0:
        return
    for item in ASSESSMENT_SEEDS:
        session.add(Assessment(
            name=item["name"],
            department=item.get("department"),
            description=item.get("description"),
            questions=item.get("questions", []),
            scoring_rules=item.get("scoring_rules", []),
            is_published=True,
        ))
    await session.commit()
    print(f"[seed] 导入 {len(ASSESSMENT_SEEDS)} 个评估量表")


async def auto_seed():
    """在应用启动时自动写入种子数据（仅当表为空时）"""
    try:
        async with AsyncSessionLocal() as session:
            await _seed_formulas(session)
            await _seed_assessments(session)
    except Exception as e:
        print(f"[seed] 种子数据写入失败（可跳过）: {e}")
