"""
医学公式库 —— 完整内置数据（共 88 条公式，涵盖 19 个专科分类）
来源：教科书及临床指南公开公式（公共领域）

分类列表：
  1.  肾功能（3）：CKD-EPI eGFR、Cockcroft-Gault、MDRD eGFR
  2.  心血管（8）：BMI、体表面积、MAP、QTc、LDL-C、非HDL-C、CI/SV/SVR/PVR、脉压、踝臂指数
  3.  呼吸（6）：氧合指数、肺泡动脉氧差、RSBI、肺顺应性、驱动压、氧输送
  4.  电解质（6）：补液、补钠、补钾、白蛋白校正钙、血清渗透压、低钠血症补钠量
  5.  营养/代谢（5）：Harris-Benedict BMR、Mifflin-St.Jeor BMR、理想体重、调整体重、蛋白需求
  6.  内分泌（5）：HbA1c↔eAG、HOMA-IR、HOMA-B、FTI、BSA-DuBois
  7.  肾功能扩充（3）：FENa、Kt/V透析充分性（含MDRD）
  8.  神经（4）：CPP、ICH评分、Hunt-Hess分级、GCS计算器
  9.  酸碱平衡（5）：AG、Winter公式、代碱代偿、呼酸代偿、Delta-Delta
  10. 血液（3）：RPI、输红细胞量、血小板输注量
  11. 肝病（4）：Child-Pugh、MELD-Na、FIB-4、AAR
  12. 产科（3）：Naegele预产期、Bishop评分、孕期体重增加
  13. 儿科（4）：APLS体重、Holliday-Segar液体、ETT内径、儿科用药剂量
  14. 骨科/创伤（3）：ISS、RTS、GCS（重复于神经类）
  15. 感染/急诊（5）：乳酸清除率、Centor/McIsaac、CURB-65、qSOFA、SOFA、BISAP
  16. 血栓与抗凝（3）：Wells DVT、CHA₂DS₂-VASc、HAS-BLED
  17. 心血管评分（3）：GRACE、ABCD²、脉压（含ABI）
  18. 单位换算（4）：体温、肌酐、血糖、胆红素

输出格式（对应 backend/db/models/formula.py）：
  name, category, description, parameters (JSON), formula_expr, unit, interpretation, clinical_use
"""

FORMULAS = [
    # ═══════════════════════════════════════════════════════════════════════
    # 肾功能
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "eGFR（CKD-EPI 2021公式）",
        "category": "肾功能",
        "description": "基于血肌酐估算肾小球滤过率，用于慢性肾脏病（CKD）分期。CKD-EPI 2021版去除了种族因素。",
        "parameters": [
            {"id": "scr", "name": "血肌酐（SCr）", "unit": "mg/dL", "type": "number", "min": 0.1, "max": 30, "note": "若单位为μmol/L，需除以88.4换算"},
            {"id": "age", "name": "年龄", "unit": "岁", "type": "number", "min": 18, "max": 120},
            {"id": "sex", "name": "性别", "unit": "", "type": "select", "options": [{"value": "M", "label": "男性"}, {"value": "F", "label": "女性"}]},
        ],
        "formula_expr": "CKD-EPI 2021: 若SCr≤κ：141×(SCr/κ)^α×0.9938^年龄（女性×1.018）；若SCr>κ：141×(SCr/κ)^(-1.209)×0.9938^年龄（女性×1.018）。κ(男)=0.9，κ(女)=0.7；α(男)=-0.302，α(女)=-0.241",
        "unit": "mL/min/1.73m²",
        "interpretation": "G1:≥90（正常/高）; G2:60-89（轻度↓）; G3a:45-59（轻-中度↓）; G3b:30-44（中-重度↓）; G4:15-29（重度↓）; G5:<15（肾衰竭）",
        "clinical_use": "CKD分期、药物剂量调整（肾毒性药物）、肾脏替代治疗时机",
    },
    {
        "name": "肌酐清除率（Cockcroft-Gault公式）",
        "category": "肾功能",
        "description": "估算肌酐清除率，常用于药物剂量调整（尤其是肾清除为主的药物）。",
        "parameters": [
            {"id": "age", "name": "年龄", "unit": "岁", "type": "number", "min": 18, "max": 120},
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 20, "max": 200, "note": "肥胖患者使用理想体重或调整体重"},
            {"id": "scr", "name": "血肌酐", "unit": "μmol/L", "type": "number", "min": 10, "max": 2000},
            {"id": "sex", "name": "性别", "unit": "", "type": "select", "options": [{"value": "M", "label": "男性"}, {"value": "F", "label": "女性"}]},
        ],
        "formula_expr": "CrCl (mL/min) = [(140-年龄) × 体重(kg)] / [72 × SCr(mg/dL)]；女性结果 × 0.85。注：SCr(mg/dL) = SCr(μmol/L) ÷ 88.4",
        "unit": "mL/min",
        "interpretation": "正常：男性>100 mL/min，女性>90 mL/min；<10 mL/min需透析",
        "clinical_use": "肾毒性药物剂量调整（抗生素、DOAC、二甲双胍等），比eGFR更适合极端体重患者",
    },
    # ═══════════════════════════════════════════════════════════════════════
    # 心血管
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "体质指数（BMI）",
        "category": "人体测量",
        "description": "通过身高和体重评估体重状态，是筛查肥胖最常用的工具。",
        "parameters": [
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 10, "max": 300},
            {"id": "height", "name": "身高", "unit": "cm", "type": "number", "min": 50, "max": 250},
        ],
        "formula_expr": "BMI = 体重(kg) / [身高(m)]²",
        "unit": "kg/m²",
        "interpretation": "中国标准：<18.5 偏瘦；18.5-23.9 正常；24.0-27.9 超重；≥28.0 肥胖",
        "clinical_use": "营养状态评估、手术风险评估、代谢综合征筛查",
    },
    {
        "name": "体表面积（BSA）—— Mosteller公式",
        "category": "人体测量",
        "description": "计算体表面积，用于化疗药物剂量计算、肾小球滤过率标准化。",
        "parameters": [
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 10, "max": 300},
            {"id": "height", "name": "身高", "unit": "cm", "type": "number", "min": 50, "max": 250},
        ],
        "formula_expr": "BSA (m²) = √[身高(cm) × 体重(kg) / 3600]",
        "unit": "m²",
        "interpretation": "成人正常值约1.73 m²（女性约1.6，男性约1.9）",
        "clinical_use": "化疗药物剂量计算（紫杉醇、铂类等）、心输出量标准化",
    },
    {
        "name": "平均动脉压（MAP）",
        "category": "心血管",
        "description": "反映组织器官灌注压力，是脓毒症治疗的重要目标。",
        "parameters": [
            {"id": "sbp", "name": "收缩压（SBP）", "unit": "mmHg", "type": "number", "min": 40, "max": 300},
            {"id": "dbp", "name": "舒张压（DBP）", "unit": "mmHg", "type": "number", "min": 20, "max": 200},
        ],
        "formula_expr": "MAP = DBP + (SBP - DBP) / 3  或  MAP = (SBP + 2×DBP) / 3",
        "unit": "mmHg",
        "interpretation": "正常：70-100 mmHg；脓毒症复苏目标：≥65 mmHg",
        "clinical_use": "脓毒症管理、血压监测、麻醉管理",
    },
    {
        "name": "校正QT间期（QTc）—— Bazett公式",
        "category": "心血管",
        "description": "根据心率校正QT间期，评估心律失常风险（QT延长综合征、药物心脏毒性）。",
        "parameters": [
            {"id": "qt", "name": "QT间期（原始）", "unit": "ms", "type": "number", "min": 200, "max": 700},
            {"id": "rr", "name": "RR间期", "unit": "ms", "type": "number", "min": 300, "max": 2000, "note": "RR(ms) = 60000/心率(次/分)"},
        ],
        "formula_expr": "QTc = QT(ms) / √[RR(s)] = QT(ms) / √[RR(ms)/1000]",
        "unit": "ms",
        "interpretation": "正常：男性<450ms，女性<460ms；>500ms为高风险；>600ms为极高风险",
        "clinical_use": "药物QT毒性监测（大环内酯类、氟哌啶醇、奎尼丁等）、先天性QT延长综合征",
    },
    {
        "name": "心输出量（Fick公式）",
        "category": "心血管",
        "description": "通过氧消耗量计算心输出量，是心导管检查的金标准方法。",
        "parameters": [
            {"id": "vo2", "name": "氧消耗量（VO₂）", "unit": "mL/min", "type": "number", "min": 100, "max": 500, "note": "可通过体表面积估算：125 mL/min/m² × BSA"},
            {"id": "cao2", "name": "动脉血氧含量（CaO₂）", "unit": "mL/dL", "type": "number", "min": 5, "max": 25},
            {"id": "cvo2", "name": "混合静脉血氧含量（CvO₂）", "unit": "mL/dL", "type": "number", "min": 1, "max": 20},
        ],
        "formula_expr": "CO (L/min) = VO₂(mL/min) / [(CaO₂ - CvO₂)(mL/dL) × 10]",
        "unit": "L/min",
        "interpretation": "正常：4-8 L/min；心功能不全时<4 L/min",
        "clinical_use": "心功能评估、心源性休克管理、先心病分流量计算",
    },
    # ═══════════════════════════════════════════════════════════════════════
    # 呼吸
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "氧合指数（P/F比值）",
        "category": "呼吸",
        "description": "评估肺换气功能，是ARDS诊断和分级的核心指标（Berlin定义）。",
        "parameters": [
            {"id": "pao2", "name": "动脉血氧分压（PaO₂）", "unit": "mmHg", "type": "number", "min": 20, "max": 700},
            {"id": "fio2", "name": "吸入氧浓度（FiO₂）", "unit": "小数（如0.21-1.0）", "type": "number", "min": 0.21, "max": 1.0},
        ],
        "formula_expr": "P/F = PaO₂(mmHg) / FiO₂",
        "unit": "mmHg",
        "interpretation": "正常：>400；轻度ARDS：200-300（PEEP≥5 cmH₂O）；中度ARDS：100-200；重度ARDS：≤100",
        "clinical_use": "ARDS诊断分级、机械通气参数调整、镇静深度决策",
    },
    {
        "name": "肺泡动脉血氧分压差（A-aO₂梯度）",
        "category": "呼吸",
        "description": "反映肺弥散和通气血流比值匹配情况，鉴别低氧原因。",
        "parameters": [
            {"id": "fio2", "name": "吸入氧浓度（FiO₂）", "unit": "0.21-1.0", "type": "number", "min": 0.21, "max": 1.0},
            {"id": "paco2", "name": "动脉血CO₂分压（PaCO₂）", "unit": "mmHg", "type": "number", "min": 10, "max": 100},
            {"id": "pao2", "name": "动脉血O₂分压（PaO₂）", "unit": "mmHg", "type": "number", "min": 20, "max": 700},
        ],
        "formula_expr": "PAO₂ = FiO₂ × (大气压 - 水蒸气压) - PaCO₂/呼吸商 = FiO₂ × 713 - PaCO₂/0.8\nA-a梯度 = PAO₂ - PaO₂",
        "unit": "mmHg",
        "interpretation": "正常（吸空气）：年龄/4 + 4 mmHg；升高提示V/Q失调或弥散障碍；正常提示通气不足（如中枢抑制）",
        "clinical_use": "低氧原因鉴别（肺内vs肺外）",
    },
    # ═══════════════════════════════════════════════════════════════════════
    # 电解质 / 补液
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "低钠血症补钠量",
        "category": "电解质",
        "description": "计算纠正低钠血症所需补充的钠量，避免过快纠正导致脑桥中央髓鞘溶解。",
        "parameters": [
            {"id": "target_na", "name": "目标血钠", "unit": "mmol/L", "type": "number", "min": 120, "max": 145, "default": 130},
            {"id": "actual_na", "name": "实际血钠", "unit": "mmol/L", "type": "number", "min": 100, "max": 140},
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 20, "max": 200},
            {"id": "sex", "name": "性别", "unit": "", "type": "select", "options": [{"value": "M", "label": "男性（TBW系数0.6）"}, {"value": "F", "label": "女性（TBW系数0.5）"}]},
        ],
        "formula_expr": "需补Na⁺(mmol) = (目标Na⁺ - 实际Na⁺) × TBW\nTBW = 体重(kg) × 0.6（男）或0.5（女）",
        "unit": "mmol",
        "interpretation": "补钠速度：慢性低钠（>48h）速度<8-10 mmol/L/d；急性低钠速度可适当加快（1-2 mmol/L/h，至症状改善）",
        "clinical_use": "低钠血症（血钠<135 mmol/L）的补钠方案计算",
    },
    {
        "name": "高钠血症补水量",
        "category": "电解质",
        "description": "计算纠正高钠血症所需补充的自由水量。",
        "parameters": [
            {"id": "target_na", "name": "目标血钠", "unit": "mmol/L", "type": "number", "min": 135, "max": 145, "default": 145},
            {"id": "actual_na", "name": "实际血钠", "unit": "mmol/L", "type": "number", "min": 145, "max": 200},
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 20, "max": 200},
            {"id": "sex", "name": "性别", "unit": "", "type": "select", "options": [{"value": "M", "label": "男性（TBW系数0.6）"}, {"value": "F", "label": "女性（TBW系数0.5）"}]},
        ],
        "formula_expr": "自由水缺失(L) = TBW × [(实际Na⁺/目标Na⁺) - 1]\nTBW = 体重(kg) × 0.6（男）或0.5（女）",
        "unit": "L",
        "interpretation": "补水速度：慢性高钠（>24h）≤0.5 mmol/L/h；急性高钠可适当加快。总量分48-72小时补充",
        "clinical_use": "高钠血症补液方案计算",
    },
    {
        "name": "低钾血症补钾量（估算）",
        "category": "电解质",
        "description": "估算纠正低钾所需的补钾量，注意补钾速度限制。",
        "parameters": [
            {"id": "actual_k", "name": "实际血钾", "unit": "mmol/L", "type": "number", "min": 1.0, "max": 3.5},
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 20, "max": 200},
        ],
        "formula_expr": "估算缺钾量(mmol) = (4.0 - 实际K⁺) × 200（经验公式，仅作参考）\n注意：每mmol K⁺约对应血钾变化0.1 mmol/L，但受体内分布影响大",
        "unit": "mmol",
        "interpretation": "静脉补钾：≤20 mmol/h（外周静脉）；≤40 mmol/h（中心静脉，需心电监护）。补钾量需根据复查血钾动态调整",
        "clinical_use": "低钾血症（血钾<3.5 mmol/L）补钾方案初步计算",
    },
    # ═══════════════════════════════════════════════════════════════════════
    # 营养
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "基础代谢率（Harris-Benedict方程）",
        "category": "营养",
        "description": "估算基础能量消耗（BEE），用于营养支持计划制定。",
        "parameters": [
            {"id": "sex", "name": "性别", "unit": "", "type": "select", "options": [{"value": "M", "label": "男性"}, {"value": "F", "label": "女性"}]},
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 20, "max": 300},
            {"id": "height", "name": "身高", "unit": "cm", "type": "number", "min": 50, "max": 250},
            {"id": "age", "name": "年龄", "unit": "岁", "type": "number", "min": 18, "max": 120},
        ],
        "formula_expr": "男性：BEE(kcal/d) = 66.47 + 13.75×W + 5.0×H - 6.76×A\n女性：BEE(kcal/d) = 655.1 + 9.56×W + 1.85×H - 4.68×A\n（W=体重kg，H=身高cm，A=年龄岁）",
        "unit": "kcal/d",
        "interpretation": "总能量需求 = BEE × 应激系数（静息1.0；择期手术1.1-1.2；感染1.2-1.4；脓毒症1.4-1.6；烧伤1.5-2.0）",
        "clinical_use": "肠内/肠外营养方案制定，危重患者能量支持",
    },
    {
        "name": "理想体重（IBW）",
        "category": "营养",
        "description": "计算基于身高的理想体重，用于药物剂量计算和营养评估。",
        "parameters": [
            {"id": "height", "name": "身高", "unit": "cm", "type": "number", "min": 50, "max": 250},
            {"id": "sex", "name": "性别", "unit": "", "type": "select", "options": [{"value": "M", "label": "男性"}, {"value": "F", "label": "女性"}]},
        ],
        "formula_expr": "Devine公式：\n男性：IBW(kg) = 50 + 0.91 × [身高(cm) - 152.4]\n女性：IBW(kg) = 45.5 + 0.91 × [身高(cm) - 152.4]",
        "unit": "kg",
        "interpretation": "若实际体重在IBW的±15%内，使用实际体重；若超重>30%，使用调整体重=[IBW + 0.4×(实际体重-IBW)]",
        "clinical_use": "氨基糖苷类、万古霉素等药物剂量计算；机械通气潮气量计算（6-8 mL/kg IBW）",
    },
    # ═══════════════════════════════════════════════════════════════════════
    # 肾脏
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "尿蛋白/肌酐比（UPCR）",
        "category": "肾功能",
        "description": "评估蛋白尿程度，随机尿即可，无需24小时尿。",
        "parameters": [
            {"id": "urine_protein", "name": "尿蛋白", "unit": "mg/dL", "type": "number", "min": 0, "max": 2000},
            {"id": "urine_cr", "name": "尿肌酐", "unit": "mg/dL", "type": "number", "min": 1, "max": 1000},
        ],
        "formula_expr": "UPCR = 尿蛋白(mg/dL) / 尿肌酐(mg/dL)\n等于近似24小时蛋白尿(g/d)",
        "unit": "mg/mg（≈g/d蛋白尿）",
        "interpretation": "正常：<0.15；微量蛋白尿：0.15-0.5；显性蛋白尿：>0.5；肾病综合征：>3.5",
        "clinical_use": "蛋白尿筛查与监测、CKD进展评估、糖尿病肾病随访",
    },
    # ═══════════════════════════════════════════════════════════════════════
    # 急诊 / 其他
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "Apgar 评分（新生儿）",
        "category": "儿科",
        "description": "出生后1分钟和5分钟评估新生儿状况，指导复苏处理。",
        "parameters": [
            {"id": "heart_rate", "name": "心率", "unit": "次/分", "type": "select", "options": [{"value": 0, "label": "无"}, {"value": 1, "label": "<100"}, {"value": 2, "label": "≥100"}]},
            {"id": "breathing", "name": "呼吸", "unit": "", "type": "select", "options": [{"value": 0, "label": "无"}, {"value": 1, "label": "微弱/不规则"}, {"value": 2, "label": "良好/哭声响亮"}]},
            {"id": "muscle_tone", "name": "肌张力", "unit": "", "type": "select", "options": [{"value": 0, "label": "软弱无力"}, {"value": 1, "label": "部分屈曲"}, {"value": 2, "label": "四肢屈曲活动好"}]},
            {"id": "reflex", "name": "反射（刺激鼻腔）", "unit": "", "type": "select", "options": [{"value": 0, "label": "无反应"}, {"value": 1, "label": "面部皱缩"}, {"value": 2, "label": "喷嚏/咳嗽"}]},
            {"id": "color", "name": "肤色", "unit": "", "type": "select", "options": [{"value": 0, "label": "全身青紫/苍白"}, {"value": 1, "label": "躯体红润/四肢青紫"}, {"value": 2, "label": "全身红润"}]},
        ],
        "formula_expr": "Apgar评分 = 心率评分 + 呼吸评分 + 肌张力评分 + 反射评分 + 肤色评分（各0-2分）",
        "unit": "分（满分10分）",
        "interpretation": "7-10：正常；4-6：轻度窒息，需刺激/给氧；0-3：重度窒息，需立即复苏",
        "clinical_use": "新生儿复苏决策，产科质量评价",
    },
    {
        "name": "渗透压（血浆渗透压）",
        "category": "急诊",
        "description": "计算血浆渗透压，评估渗透压升高原因（糖尿病酮症、高渗状态等）。",
        "parameters": [
            {"id": "na", "name": "血钠（Na⁺）", "unit": "mmol/L", "type": "number", "min": 100, "max": 200},
            {"id": "glucose", "name": "血糖", "unit": "mmol/L", "type": "number", "min": 1, "max": 100},
            {"id": "bun", "name": "尿素氮（BUN）", "unit": "mmol/L", "type": "number", "min": 0, "max": 100},
        ],
        "formula_expr": "计算渗透压(mOsm/kg) = 2×Na⁺ + 血糖(mmol/L) + BUN(mmol/L)\n渗透压间隙 = 实测渗透压 - 计算渗透压（正常<10 mOsm/kg）",
        "unit": "mOsm/kg",
        "interpretation": "正常：275-295 mOsm/kg；高渗状态（DKA、HHS）：>320；渗透压间隙>10提示额外渗透物质（乙醇、乙二醇等）",
        "clinical_use": "高渗状态（HHS、DKA）诊断分级，中毒（乙醇、乙二醇）评估",
    },
    {
        "name": "阴离子间隙（AG）",
        "category": "酸碱平衡",
        "description": "计算血清阴离子间隙，用于代谢性酸中毒的病因鉴别。",
        "parameters": [
            {"id": "na", "name": "血钠（Na⁺）", "unit": "mmol/L", "type": "number", "min": 100, "max": 200},
            {"id": "cl", "name": "血氯（Cl⁻）", "unit": "mmol/L", "type": "number", "min": 70, "max": 150},
            {"id": "hco3", "name": "碳酸氢根（HCO₃⁻）", "unit": "mmol/L", "type": "number", "min": 5, "max": 50},
            {"id": "albumin", "name": "白蛋白（ALB）（可选，用于校正）", "unit": "g/dL", "type": "number", "min": 1, "max": 6, "required": False},
        ],
        "formula_expr": "AG = Na⁺ - (Cl⁻ + HCO₃⁻)，正常值：8-12 mmol/L（无钾公式）\n白蛋白校正AG = AG + 2.5 × (4.0 - ALB g/dL)",
        "unit": "mmol/L",
        "interpretation": "AG升高（>12）型代谢性酸中毒：酮症（DKA、饥饿）、乳酸酸中毒、肾衰竭、中毒（水杨酸、乙二醇）\nAG正常型：腹泻、肾小管酸中毒、输注大量生理盐水",
        "clinical_use": "代谢性酸中毒分型，复杂酸碱失衡分析",
    },
    {
        "name": "Wells 评分——简化版（PE概率计算）",
        "category": "急诊",
        "description": "同量表库中的Wells PE评分，此处提供快速计算接口。",
        "parameters": [
            {"id": "dvt_sign", "name": "DVT体征（腿肿+压痛）", "unit": "", "type": "select", "options": [{"value": 0, "label": "无"}, {"value": 3, "label": "有"}]},
            {"id": "alt_dx", "name": "无其他更可能诊断", "unit": "", "type": "select", "options": [{"value": 0, "label": "有其他诊断"}, {"value": 3, "label": "PE最可能"}]},
            {"id": "hr", "name": "心率>100次/分", "unit": "", "type": "select", "options": [{"value": 0, "label": "否"}, {"value": 1.5, "label": "是"}]},
            {"id": "immob", "name": "近期制动/手术", "unit": "", "type": "select", "options": [{"value": 0, "label": "否"}, {"value": 1.5, "label": "是"}]},
            {"id": "prev", "name": "既往DVT/PE", "unit": "", "type": "select", "options": [{"value": 0, "label": "否"}, {"value": 1.5, "label": "是"}]},
            {"id": "hemopt", "name": "咯血", "unit": "", "type": "select", "options": [{"value": 0, "label": "否"}, {"value": 1, "label": "是"}]},
            {"id": "cancer", "name": "活动期肿瘤", "unit": "", "type": "select", "options": [{"value": 0, "label": "否"}, {"value": 1, "label": "是"}]},
        ],
        "formula_expr": "Wells PE Score = 各项分值之和",
        "unit": "分",
        "interpretation": "0-1：低概率；2-6：中概率；≥7：高概率",
        "clinical_use": "肺栓塞临床前概率评估，指导CTPA决策",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 心血管（扩充）
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "LDL-C Friedewald公式",
        "category": "心血管",
        "description": "通过血脂常规检验计算低密度脂蛋白胆固醇（LDL-C），甘油三酯<4.5 mmol/L时适用。",
        "parameters": [
            {"id": "tc", "name": "总胆固醇（TC）", "unit": "mmol/L", "type": "number", "min": 1, "max": 20},
            {"id": "hdl", "name": "高密度脂蛋白（HDL-C）", "unit": "mmol/L", "type": "number", "min": 0.3, "max": 5},
            {"id": "tg", "name": "甘油三酯（TG）", "unit": "mmol/L", "type": "number", "min": 0.1, "max": 10},
        ],
        "formula_expr": "LDL-C(mmol/L) = TC - HDL-C - TG/2.2\n注：TG≥4.5 mmol/L时公式不准确，建议直接测定法",
        "unit": "mmol/L",
        "interpretation": "理想：<2.6 mmol/L；中等风险目标：<3.4；ACS/极高危目标：<1.8（强化他汀）",
        "clinical_use": "心血管风险评估，他汀治疗靶标监测",
    },
    {
        "name": "非HDL-C（非高密度脂蛋白胆固醇）",
        "category": "心血管",
        "description": "非HDL-C包含所有致动脉粥样硬化的脂蛋白，比LDL-C更全面反映心血管风险，尤其适用于TG升高时。",
        "parameters": [
            {"id": "tc", "name": "总胆固醇（TC）", "unit": "mmol/L", "type": "number", "min": 1, "max": 20},
            {"id": "hdl", "name": "高密度脂蛋白（HDL-C）", "unit": "mmol/L", "type": "number", "min": 0.3, "max": 5},
        ],
        "formula_expr": "非HDL-C(mmol/L) = TC - HDL-C",
        "unit": "mmol/L",
        "interpretation": "目标：低危<4.1；中危<3.4；高危<2.6；极高危<2.2 mmol/L（比LDL-C目标高0.8）",
        "clinical_use": "心血管风险评估，TG升高时替代LDL-C",
    },
    {
        "name": "心脏指数（CI）",
        "category": "心血管",
        "description": "心输出量按体表面积标准化，消除体型差异，更准确反映心脏泵功能。",
        "parameters": [
            {"id": "co", "name": "心输出量（CO）", "unit": "L/min", "type": "number", "min": 1, "max": 20},
            {"id": "bsa", "name": "体表面积（BSA）", "unit": "m²", "type": "number", "min": 0.5, "max": 3.5},
        ],
        "formula_expr": "CI(L/min/m²) = CO(L/min) / BSA(m²)",
        "unit": "L/min/m²",
        "interpretation": "正常：2.5-4.0 L/min/m²；心衰：<2.2；心源性休克：<1.8",
        "clinical_use": "ICU血流动力学监测，心衰程度分级，血管活性药物调整",
    },
    {
        "name": "每搏量（SV）",
        "category": "心血管",
        "description": "每次心跳泵出的血量，是评估心脏前负荷和收缩力的重要指标。",
        "parameters": [
            {"id": "co", "name": "心输出量（CO）", "unit": "L/min", "type": "number", "min": 1, "max": 20},
            {"id": "hr", "name": "心率（HR）", "unit": "次/分", "type": "number", "min": 20, "max": 250},
        ],
        "formula_expr": "SV(mL) = CO(L/min) × 1000 / HR(次/分)",
        "unit": "mL",
        "interpretation": "正常：60-100 mL；每搏指数（SVI=SV/BSA）正常：30-65 mL/m²",
        "clinical_use": "心脏功能评估，液体反应性判断（SVV/PPV变异）",
    },
    {
        "name": "体循环血管阻力（SVR）",
        "category": "心血管",
        "description": "反映左心室后负荷，用于鉴别心源性休克与分布性休克，指导血管活性药物使用。",
        "parameters": [
            {"id": "map", "name": "平均动脉压（MAP）", "unit": "mmHg", "type": "number", "min": 20, "max": 200},
            {"id": "cvp", "name": "中心静脉压（CVP）", "unit": "mmHg", "type": "number", "min": 0, "max": 30},
            {"id": "co", "name": "心输出量（CO）", "unit": "L/min", "type": "number", "min": 1, "max": 20},
        ],
        "formula_expr": "SVR(dyn·s·cm⁻⁵) = [(MAP - CVP) × 80] / CO",
        "unit": "dyn·s·cm⁻⁵",
        "interpretation": "正常：800-1200 dyn·s·cm⁻⁵；升高（>1200）：心源性/低血容量性休克；降低（<800）：感染性/分布性休克",
        "clinical_use": "休克类型鉴别，缩血管/扩血管药物选择",
    },
    {
        "name": "肺血管阻力（PVR）",
        "category": "心血管",
        "description": "反映右心室后负荷，用于肺动脉高压评估和右心功能判断。",
        "parameters": [
            {"id": "mpap", "name": "平均肺动脉压（mPAP）", "unit": "mmHg", "type": "number", "min": 5, "max": 100},
            {"id": "pcwp", "name": "肺毛细血管楔压（PCWP）", "unit": "mmHg", "type": "number", "min": 1, "max": 40},
            {"id": "co", "name": "心输出量（CO）", "unit": "L/min", "type": "number", "min": 1, "max": 20},
        ],
        "formula_expr": "PVR(Wood单位) = (mPAP - PCWP) / CO\nPVR(dyn·s·cm⁻⁵) = (mPAP - PCWP) × 80 / CO",
        "unit": "Wood单位 或 dyn·s·cm⁻⁵",
        "interpretation": "正常：<3 Wood单位（<240 dyn·s·cm⁻⁵）；肺动脉高压：>3 Wood单位；严重：>5 Wood单位",
        "clinical_use": "肺动脉高压分类，心脏移植/手术适应症评估",
    },
    {
        "name": "校正QT间期（QTc）—— Fridericia公式",
        "category": "心血管",
        "description": "Fridericia公式在高心率时比Bazett公式更准确，是ICU常用的QT校正方法。",
        "parameters": [
            {"id": "qt", "name": "QT间期（原始）", "unit": "ms", "type": "number", "min": 200, "max": 700},
            {"id": "rr", "name": "RR间期", "unit": "ms", "type": "number", "min": 300, "max": 2000, "note": "RR(ms)=60000/心率"},
        ],
        "formula_expr": "QTc(Fridericia) = QT(ms) / ∛[RR(ms)/1000]（即RR的三次方根）",
        "unit": "ms",
        "interpretation": "正常上限：男<450ms，女<460ms；>500ms为高风险（TdP）",
        "clinical_use": "ICU患者QT监测（心率变化大时优选），药物致QT延长评估",
    },
    {
        "name": "GRACE评分（ACS住院死亡风险）",
        "category": "心血管",
        "description": "全球急性冠脉事件注册（GRACE）评分，预测ACS患者住院期间及6个月死亡率，指导早期介入策略。",
        "parameters": [
            {"id": "age", "name": "年龄（岁）", "unit": "岁", "type": "number", "min": 18, "max": 120},
            {"id": "hr", "name": "入院心率（次/分）", "unit": "次/分", "type": "number", "min": 20, "max": 250},
            {"id": "sbp", "name": "入院收缩压（mmHg）", "unit": "mmHg", "type": "number", "min": 40, "max": 300},
            {"id": "cr", "name": "血清肌酐（μmol/L）", "unit": "μmol/L", "type": "number", "min": 20, "max": 2000},
            {"id": "killip", "name": "Killip分级", "unit": "", "type": "select", "options": [{"value": 0, "label": "I级（无心衰）"}, {"value": 20, "label": "II级（轻度心衰）"}, {"value": 39, "label": "III级（肺水肿）"}, {"value": 59, "label": "IV级（心源性休克）"}]},
            {"id": "arrest", "name": "入院时心脏骤停", "unit": "", "type": "select", "options": [{"value": 0, "label": "否"}, {"value": 43, "label": "是"}]},
            {"id": "stdev", "name": "ST段偏移", "unit": "", "type": "select", "options": [{"value": 0, "label": "无"}, {"value": 30, "label": "有"}]},
            {"id": "enzymes", "name": "心肌酶/肌钙蛋白升高", "unit": "", "type": "select", "options": [{"value": 0, "label": "否"}, {"value": 15, "label": "是"}]},
        ],
        "formula_expr": "GRACE评分 = 年龄评分(0-91) + 心率评分(0-46) + 收缩压评分(0-63) + 肌酐评分(0-53) + Killip评分 + 心脏骤停(43) + ST偏移(30) + 酶升高(15)。各参数按GRACE积分表查分，总分0-372分。",
        "unit": "分",
        "interpretation": "低危：≤108（住院死亡率<1%）；中危：109-140（1-3%）；高危：>140（>3%）。出院后6个月死亡评分：低危≤88；中危89-118；高危>118",
        "clinical_use": "NSTEMI/UA早期侵入策略决策（高危→24h内介入；中危→72h内；低危→可保守）",
    },
    {
        "name": "ABCD²评分（TIA后早期卒中风险）",
        "category": "心血管",
        "description": "预测TIA发作后2天内缺血性卒中风险，指导住院决策和早期干预。",
        "parameters": [
            {"id": "age", "name": "年龄≥60岁", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
            {"id": "bp", "name": "首次就诊时血压（SBP≥140 或 DBP≥90 mmHg）", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
            {"id": "clinical", "name": "临床表现", "unit": "", "type": "select", "options": [{"value": 0, "label": "无局灶性症状（0分）"}, {"value": 1, "label": "言语障碍但无偏侧无力（1分）"}, {"value": 2, "label": "单侧无力（2分）"}]},
            {"id": "duration", "name": "症状持续时间", "unit": "", "type": "select", "options": [{"value": 0, "label": "<10分钟（0分）"}, {"value": 1, "label": "10-59分钟（1分）"}, {"value": 2, "label": "≥60分钟（2分）"}]},
            {"id": "diabetes", "name": "糖尿病", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
        ],
        "formula_expr": "ABCD²评分 = 年龄 + 血压 + 临床表现 + 症状持续时间 + 糖尿病（满分7分）",
        "unit": "分",
        "interpretation": "0-3（低危）：2日内卒中风险约1%；4-5（中危）：约4%；6-7（高危）：约8%",
        "clinical_use": "TIA后住院指征（≥4分或症状持续>10min建议住院观察，尽早抗血小板+影像学评估）",
    },
    {
        "name": "脉压（PP）",
        "category": "心血管",
        "description": "收缩压与舒张压之差，反映动脉硬化程度，与心血管事件独立相关。",
        "parameters": [
            {"id": "sbp", "name": "收缩压（SBP）", "unit": "mmHg", "type": "number", "min": 40, "max": 300},
            {"id": "dbp", "name": "舒张压（DBP）", "unit": "mmHg", "type": "number", "min": 20, "max": 200},
        ],
        "formula_expr": "脉压(PP) = SBP - DBP",
        "unit": "mmHg",
        "interpretation": "正常：30-50 mmHg；>60 mmHg为增大（主动脉瓣关闭不全、老年性动脉硬化）；<25 mmHg为缩小（主动脉瓣狭窄、低心排）",
        "clinical_use": "主动脉瓣病变辅助判断，心源性休克（脉压缩小）识别",
    },
    {
        "name": "校正血钙（低白蛋白时）",
        "category": "内分泌",
        "description": "低白蛋白血症时血总钙偏低，需根据白蛋白校正，才能准确判断钙代谢状态。",
        "parameters": [
            {"id": "ca", "name": "血总钙（Ca²⁺）", "unit": "mmol/L", "type": "number", "min": 0.5, "max": 5},
            {"id": "alb", "name": "血清白蛋白（ALB）", "unit": "g/dL", "type": "number", "min": 0.5, "max": 6},
        ],
        "formula_expr": "校正钙(mmol/L) = 测定钙(mmol/L) + 0.02 × [40 - ALB(g/L)]\n（若ALB单位为g/dL）：校正钙 = 测定钙 + 0.8 × [4.0 - ALB(g/dL)]",
        "unit": "mmol/L",
        "interpretation": "正常：2.1-2.6 mmol/L；低钙血症：<2.1；高钙血症：>2.6（>3.5为高钙危象）",
        "clinical_use": "低白蛋白血症患者（肝病、肾病、营养不良）的血钙评估",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 肾功能（扩充）
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "eGFR（MDRD简化公式）",
        "category": "肾功能",
        "description": "MDRD（肾脏病膳食改良研究）4变量公式估算eGFR，较CKD-EPI稍低估正常肾功能患者。",
        "parameters": [
            {"id": "scr", "name": "血肌酐（SCr）", "unit": "mg/dL", "type": "number", "min": 0.1, "max": 30, "note": "μmol/L ÷ 88.4 = mg/dL"},
            {"id": "age", "name": "年龄", "unit": "岁", "type": "number", "min": 18, "max": 120},
            {"id": "sex", "name": "性别", "unit": "", "type": "select", "options": [{"value": "M", "label": "男性"}, {"value": "F", "label": "女性（×0.742）"}]},
        ],
        "formula_expr": "eGFR(mL/min/1.73m²) = 175 × SCr(mg/dL)^(-1.154) × 年龄^(-0.203) × 0.742（女性）",
        "unit": "mL/min/1.73m²",
        "interpretation": "同CKD-EPI：G1≥90；G2 60-89；G3a 45-59；G3b 30-44；G4 15-29；G5<15",
        "clinical_use": "CKD分期，肾功能评估（尤其适合CKD 3-5期患者）",
    },
    {
        "name": "尿钠排泄分数（FENa）",
        "category": "肾功能",
        "description": "反映肾小管对钠的重吸收能力，用于急性少尿时肾前性与肾性原因鉴别。",
        "parameters": [
            {"id": "u_na", "name": "尿钠（UNa）", "unit": "mmol/L", "type": "number", "min": 1, "max": 300},
            {"id": "p_na", "name": "血钠（PNa）", "unit": "mmol/L", "type": "number", "min": 100, "max": 200},
            {"id": "u_cr", "name": "尿肌酐（UCr）", "unit": "μmol/L", "type": "number", "min": 50, "max": 50000},
            {"id": "p_cr", "name": "血肌酐（PCr）", "unit": "μmol/L", "type": "number", "min": 20, "max": 2000},
        ],
        "formula_expr": "FENa(%) = (UNa × PCr) / (PNa × UCr) × 100",
        "unit": "%",
        "interpretation": "<1%：肾前性（肾小管保钠功能正常）；>2%：肾性（肾小管损伤）；1-2%：不确定。注：使用利尿剂时FENa假性升高，改用尿素排泄分数（FEUrea<35%）",
        "clinical_use": "急性少尿/AKI病因鉴别，指导补液与利尿治疗",
    },
    {
        "name": "透析充分性 Kt/V（单室模型 Daugirdas公式）",
        "category": "肾功能",
        "description": "评估血液透析充分性，Kt/V是尿素清除量与尿素分布容积之比，是透析质量的核心指标。",
        "parameters": [
            {"id": "bun_pre", "name": "透析前BUN", "unit": "mmol/L", "type": "number", "min": 5, "max": 100},
            {"id": "bun_post", "name": "透析后BUN", "unit": "mmol/L", "type": "number", "min": 1, "max": 50},
            {"id": "t", "name": "透析时间（t）", "unit": "小时", "type": "number", "min": 1, "max": 12},
            {"id": "uf", "name": "超滤量（UF）", "unit": "升", "type": "number", "min": 0, "max": 10},
            {"id": "v", "name": "透析后体重×0.55（估算V）", "unit": "升", "type": "number", "min": 20, "max": 60, "note": "V ≈ 透析后体重(kg) × 0.55"},
        ],
        "formula_expr": "R = BUN后/BUN前\nKt/V = -ln(R - 0.008×t) + (4 - 3.5×R) × UF/V",
        "unit": "无量纲",
        "interpretation": "目标：单次透析Kt/V≥1.2（KDOQI推荐）；≥1.4更佳；<1.0透析不充分",
        "clinical_use": "血液透析充分性评估，透析方案调整（时间/血流量/透析器）",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 呼吸（扩充）
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "快浅呼吸指数（RSBI）",
        "category": "呼吸",
        "description": "呼吸频率与潮气量之比，是自主呼吸试验中预测撤机成功率最佳的单一指标。",
        "parameters": [
            {"id": "rr", "name": "呼吸频率（RR）", "unit": "次/分", "type": "number", "min": 5, "max": 60},
            {"id": "vt", "name": "潮气量（Vt）", "unit": "升", "type": "number", "min": 0.1, "max": 2, "note": "自主呼吸时的潮气量"},
        ],
        "formula_expr": "RSBI = RR(次/分) / Vt(L)",
        "unit": "次/分/L",
        "interpretation": "<80：撤机成功率高（约78%）；80-105：不确定；>105：撤机失败风险高（建议继续机械通气）",
        "clinical_use": "ICU机械通气撤机评估（SBT前后监测），与其他撤机指标联合判断",
    },
    {
        "name": "动态肺顺应性（Cdyn）",
        "category": "呼吸",
        "description": "机械通气时反映肺和胸廓的综合弹性，包含气道阻力影响，与气道阻塞相关。",
        "parameters": [
            {"id": "vt", "name": "潮气量（Vt）", "unit": "mL", "type": "number", "min": 100, "max": 2000},
            {"id": "ppeak", "name": "气道峰压（Ppeak）", "unit": "cmH₂O", "type": "number", "min": 5, "max": 80},
            {"id": "peep", "name": "PEEP", "unit": "cmH₂O", "type": "number", "min": 0, "max": 30},
        ],
        "formula_expr": "Cdyn(mL/cmH₂O) = Vt(mL) / (Ppeak - PEEP)",
        "unit": "mL/cmH₂O",
        "interpretation": "正常：40-80 mL/cmH₂O；ARDS时明显降低（<30）；气道痉挛时下降但静态顺应性可正常",
        "clinical_use": "机械通气参数监测，支气管痉挛与肺实质病变鉴别",
    },
    {
        "name": "静态肺顺应性（Cst）",
        "category": "呼吸",
        "description": "呼气末屏气后测定，排除气道阻力影响，反映肺组织真实弹性，是ARDS管理的核心参数。",
        "parameters": [
            {"id": "vt", "name": "潮气量（Vt）", "unit": "mL", "type": "number", "min": 100, "max": 2000},
            {"id": "pplat", "name": "平台压（Pplat）", "unit": "cmH₂O", "type": "number", "min": 5, "max": 60, "note": "吸气末屏气0.5s后测定"},
            {"id": "peep", "name": "PEEP（总PEEP）", "unit": "cmH₂O", "type": "number", "min": 0, "max": 30},
        ],
        "formula_expr": "Cst(mL/cmH₂O) = Vt(mL) / (Pplat - PEEP)",
        "unit": "mL/cmH₂O",
        "interpretation": "正常：50-100 mL/cmH₂O；轻度ARDS：30-50；中重度ARDS：<30；<20为极重度",
        "clinical_use": "ARDS机械通气策略（Pplat≤30 cmH₂O保护性通气），驱动压=Pplat-PEEP（目标≤15 cmH₂O）",
    },
    {
        "name": "肺驱动压（ΔP）",
        "category": "呼吸",
        "description": "平台压与PEEP之差，反映肺应变大小，是ARDS死亡率独立预测因子，比潮气量更准确。",
        "parameters": [
            {"id": "pplat", "name": "平台压（Pplat）", "unit": "cmH₂O", "type": "number", "min": 5, "max": 60},
            {"id": "peep", "name": "PEEP", "unit": "cmH₂O", "type": "number", "min": 0, "max": 30},
        ],
        "formula_expr": "ΔP(cmH₂O) = Pplat - PEEP",
        "unit": "cmH₂O",
        "interpretation": "目标：≤15 cmH₂O（ARDS保护性通气策略）；>15 cmH₂O与死亡率增加相关",
        "clinical_use": "ARDS机械通气参数优化，指导潮气量和PEEP调整",
    },
    {
        "name": "氧输送（DO₂）",
        "category": "呼吸",
        "description": "单位时间内心脏向组织输送的氧总量，是评估循环与氧合匹配性的关键参数。",
        "parameters": [
            {"id": "co", "name": "心输出量（CO）", "unit": "L/min", "type": "number", "min": 1, "max": 20},
            {"id": "hb", "name": "血红蛋白（Hb）", "unit": "g/dL", "type": "number", "min": 3, "max": 20},
            {"id": "sao2", "name": "动脉血氧饱和度（SaO₂）", "unit": "%", "type": "number", "min": 50, "max": 100},
            {"id": "pao2", "name": "动脉血氧分压（PaO₂）", "unit": "mmHg", "type": "number", "min": 20, "max": 700},
        ],
        "formula_expr": "CaO₂(mL/dL) = Hb × 1.34 × SaO₂/100 + PaO₂ × 0.0031\nDO₂(mL/min) = CO(L/min) × CaO₂(mL/dL) × 10",
        "unit": "mL/min",
        "interpretation": "正常：520-720 mL/min；DO₂<330 mL/min时组织缺氧；氧摄取率（VO₂/DO₂）>50%提示氧债",
        "clinical_use": "脓毒症/ARDS管理，输血触发判断（贫血时DO₂是否充分）",
    },
    {
        "name": "死腔分数（Vd/Vt）",
        "category": "呼吸",
        "description": "潮气量中无效通气（不参与气体交换）的比例，Vd/Vt升高是ARDS及肺血管疾病的特征。",
        "parameters": [
            {"id": "paco2", "name": "动脉血CO₂分压（PaCO₂）", "unit": "mmHg", "type": "number", "min": 10, "max": 100},
            {"id": "peco2", "name": "呼出气CO₂分压（PĒCO₂）", "unit": "mmHg", "type": "number", "min": 5, "max": 50, "note": "混合呼出气CO₂，需专用设备测定"},
        ],
        "formula_expr": "Vd/Vt = (PaCO₂ - PĒCO₂) / PaCO₂ （Bohr方程）",
        "unit": "小数（0-1）",
        "interpretation": "正常：0.2-0.35；ARDS：可升至0.5-0.7；肺栓塞：明显升高；>0.6提示预后不良",
        "clinical_use": "ARDS严重度评估，肺栓塞辅助诊断，机械通气调整",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 神经科
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "脑灌注压（CPP）",
        "category": "神经",
        "description": "脑组织获得灌注的有效压力，是颅脑损伤和颅内高压管理的核心目标参数。",
        "parameters": [
            {"id": "map", "name": "平均动脉压（MAP）", "unit": "mmHg", "type": "number", "min": 20, "max": 200},
            {"id": "icp", "name": "颅内压（ICP）", "unit": "mmHg", "type": "number", "min": 0, "max": 100},
        ],
        "formula_expr": "CPP(mmHg) = MAP - ICP",
        "unit": "mmHg",
        "interpretation": "正常：70-100 mmHg；颅脑损伤目标：≥60 mmHg（成人），≥50（儿童）；<50 mmHg时脑缺血风险显著增加",
        "clinical_use": "重型颅脑损伤管理，颅内高压治疗（降颅压vs升MAP权衡）",
    },
    {
        "name": "ICH评分（自发性颅内出血预后）",
        "category": "神经",
        "description": "预测自发性颅内出血30天死亡率，指导治疗强度决策。",
        "parameters": [
            {"id": "gcs", "name": "入院GCS评分", "unit": "", "type": "select", "options": [{"value": 0, "label": "13-15分（0分）"}, {"value": 1, "label": "5-12分（1分）"}, {"value": 2, "label": "3-4分（2分）"}]},
            {"id": "volume", "name": "血肿体积（mL）", "unit": "", "type": "select", "options": [{"value": 0, "label": "<30 mL（0分）"}, {"value": 1, "label": "≥30 mL（1分）"}]},
            {"id": "ivh", "name": "脑室出血", "unit": "", "type": "select", "options": [{"value": 0, "label": "无（0分）"}, {"value": 1, "label": "有（1分）"}]},
            {"id": "location", "name": "出血位置", "unit": "", "type": "select", "options": [{"value": 0, "label": "幕下（0分）"}, {"value": 1, "label": "幕上（1分）"}]},
            {"id": "age", "name": "年龄≥80岁", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
        ],
        "formula_expr": "ICH评分 = GCS分值 + 血肿体积分值 + 脑室出血分值 + 位置分值 + 年龄分值（满分6分）",
        "unit": "分",
        "interpretation": "0分：30天死亡率0%；1分：13%；2分：26%；3分：72%；4分：97%；5-6分：近100%",
        "clinical_use": "颅内出血预后告知，积极治疗vs姑息治疗决策，ICU收治标准",
    },
    {
        "name": "Hunt-Hess分级（蛛网膜下腔出血）",
        "category": "神经",
        "description": "蛛网膜下腔出血（SAH）临床严重程度分级，指导血管内治疗时机和预后评估。",
        "parameters": [
            {"id": "grade", "name": "临床表现（选择最符合的等级）", "unit": "", "type": "select", "options": [
                {"value": 0, "label": "0级：未破裂动脉瘤"},
                {"value": 1, "label": "I级：无症状或轻微头痛/颈强直"},
                {"value": 2, "label": "II级：中重度头痛、颈强直，无神经功能缺损（除颅神经麻痹外）"},
                {"value": 3, "label": "III级：嗜睡、意识模糊或轻微局灶神经缺损"},
                {"value": 4, "label": "IV级：昏迷、中重度偏瘫"},
                {"value": 5, "label": "V级：深昏迷、去大脑强直、濒死状态"},
            ]},
        ],
        "formula_expr": "Hunt-Hess分级 = 临床表现等级（I-V级）",
        "unit": "级",
        "interpretation": "I-II级（低危）：手术/介入风险低，预后良好；III级（中危）：早期积极处理；IV-V级（高危）：死亡率>60%，手术时机争议",
        "clinical_use": "SAH手术/介入时机选择，ICU管理指征，家属预后告知",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 酸碱平衡（扩充）
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "代偿预期公式——代谢性酸中毒（Winter公式）",
        "category": "酸碱平衡",
        "description": "代谢性酸中毒时，判断呼吸代偿是否适当（排除合并呼吸问题）。",
        "parameters": [
            {"id": "hco3", "name": "实测HCO₃⁻", "unit": "mmol/L", "type": "number", "min": 1, "max": 45},
        ],
        "formula_expr": "预期PaCO₂ = 1.5 × HCO₃⁻ + 8（±2）mmHg\n若实测PaCO₂高于预期→合并呼吸性酸中毒；低于预期→合并呼吸性碱中毒",
        "unit": "mmHg",
        "interpretation": "如HCO₃⁻=15 mmol/L，预期PaCO₂=1.5×15+8=30.5±2 mmHg",
        "clinical_use": "复杂酸碱失衡分析，鉴别单纯代谢性酸中毒与混合型酸碱失衡",
    },
    {
        "name": "代偿预期公式——代谢性碱中毒",
        "category": "酸碱平衡",
        "description": "代谢性碱中毒时，判断呼吸代偿（低通气）是否适当。",
        "parameters": [
            {"id": "hco3", "name": "实测HCO₃⁻", "unit": "mmol/L", "type": "number", "min": 24, "max": 60},
        ],
        "formula_expr": "预期PaCO₂ = 0.7 × HCO₃⁻ + 21（±2）mmHg",
        "unit": "mmHg",
        "interpretation": "PaCO₂超出预期上限（55 mmHg）提示呼吸驱动受损；低于预期提示合并呼吸性碱中毒",
        "clinical_use": "代谢性碱中毒（呕吐、利尿剂）的混合型判断",
    },
    {
        "name": "代偿预期公式——呼吸性酸中毒",
        "category": "酸碱平衡",
        "description": "呼吸性酸中毒时，急性与慢性代谢代偿范围不同，帮助判断病程。",
        "parameters": [
            {"id": "paco2", "name": "实测PaCO₂", "unit": "mmHg", "type": "number", "min": 45, "max": 120},
            {"id": "type", "name": "病程", "unit": "", "type": "select", "options": [{"value": "acute", "label": "急性（数小时内）"}, {"value": "chronic", "label": "慢性（>24h）"}]},
        ],
        "formula_expr": "急性：HCO₃⁻每升高1 mmol/L对应PaCO₂升高10 mmHg（急性：ΔHCO₃⁻=ΔPaCO₂×0.1）\n慢性：ΔHCO₃⁻=ΔPaCO₂×0.35",
        "unit": "mmol/L",
        "interpretation": "急性：PaCO₂每升高10 mmHg，HCO₃⁻升高约1 mmol/L；慢性则升高3-5 mmol/L",
        "clinical_use": "COPD患者急性加重时鉴别急性与慢性CO₂潴留，指导通气策略",
    },
    {
        "name": "Delta-Delta比值（ΔAG/ΔHCO₃⁻）",
        "category": "酸碱平衡",
        "description": "评估AG升高型代谢性酸中毒是否合并代谢性碱中毒或正常AG代谢性酸中毒的工具。",
        "parameters": [
            {"id": "ag", "name": "实测AG", "unit": "mmol/L", "type": "number", "min": 8, "max": 50},
            {"id": "hco3", "name": "实测HCO₃⁻", "unit": "mmol/L", "type": "number", "min": 1, "max": 45},
        ],
        "formula_expr": "ΔAG = AG - 12（正常AG）\nΔHCO₃⁻ = 24 - 实测HCO₃⁻\nDelta-Delta = ΔAG / ΔHCO₃⁻",
        "unit": "无量纲",
        "interpretation": "<0.4：合并正常AG代谢性酸中毒；0.4-1.0：单纯AG升高代谢性酸中毒（高氯型）；1.0-2.0：单纯AG升高代谢性酸中毒；>2.0：合并代谢性碱中毒",
        "clinical_use": "复杂酸碱失衡分析，DKA（常合并代碱）、慢性肾衰（常合并正常AG代酸）",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 血液
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "网织红细胞产生指数（RPI）",
        "category": "血液",
        "description": "校正贫血程度和网织红细胞成熟时间，反映骨髓红细胞生成的真实代偿能力。",
        "parameters": [
            {"id": "reticulocyte", "name": "网织红细胞百分比（%）", "unit": "%", "type": "number", "min": 0, "max": 20},
            {"id": "hct", "name": "患者红细胞比容（Hct）", "unit": "%", "type": "number", "min": 5, "max": 60},
        ],
        "formula_expr": "校正网织红细胞 = 网织红细胞% × (Hct/45)\n成熟时间系数：Hct≥35%→1；25-34%→1.5；15-24%→2；<15%→2.5\nRPI = 校正网织红细胞 / 成熟时间系数",
        "unit": "无量纲",
        "interpretation": ">2：骨髓代偿充分（溶血性贫血/失血后）；<2：骨髓代偿不足（骨髓抑制/缺铁/维生素B12缺乏）",
        "clinical_use": "贫血类型鉴别（增生性vs非增生性），指导骨髓穿刺决策",
    },
    {
        "name": "输红细胞量计算",
        "category": "血液",
        "description": "计算将血红蛋白或红细胞比容升至目标值所需的浓缩红细胞输入量。",
        "parameters": [
            {"id": "target_hb", "name": "目标血红蛋白（Hb）", "unit": "g/dL", "type": "number", "min": 7, "max": 15},
            {"id": "actual_hb", "name": "实际血红蛋白（Hb）", "unit": "g/dL", "type": "number", "min": 3, "max": 14},
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 10, "max": 200},
        ],
        "formula_expr": "输血量(mL) = (目标Hb - 实际Hb) × 体重(kg) × 3\n输血单位 ≈ 输血量(mL) / 200（每单位浓缩红细胞约200mL）",
        "unit": "mL 或 单位",
        "interpretation": "一般每输1单位浓缩红细胞（约200mL）可使成人Hb升高约1 g/dL。输血前评估：限制性策略Hb<7-8 g/dL；心脏病患者<8-9 g/dL",
        "clinical_use": "围手术期和ICU输血量估算，血库备血计划",
    },
    {
        "name": "血小板输注量（需求计算）",
        "category": "血液",
        "description": "估算将血小板提升到目标水平所需输注的血小板量。",
        "parameters": [
            {"id": "target_plt", "name": "目标血小板（×10⁹/L）", "unit": "×10⁹/L", "type": "number", "min": 10, "max": 200},
            {"id": "actual_plt", "name": "实际血小板（×10⁹/L）", "unit": "×10⁹/L", "type": "number", "min": 0, "max": 150},
            {"id": "blood_volume", "name": "估算血容量（mL）", "unit": "mL", "type": "number", "min": 1000, "max": 8000, "note": "成人约70mL/kg"},
        ],
        "formula_expr": "所需血小板数 = (目标PLT - 实际PLT) × 血容量(mL) / 1000\n单采血小板约含2.5-3×10¹¹个血小板，可提升成人PLT约30-60×10⁹/L",
        "unit": "单位",
        "interpretation": "手术止血：维持PLT≥50×10⁹/L；神经外科/眼科：≥100×10⁹/L；活动性出血：≥50-100×10⁹/L",
        "clinical_use": "血液病/骨髓抑制患者血小板输注方案，围手术期管理",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 营养/代谢（扩充）
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "基础代谢率（Mifflin-St. Jeor公式）",
        "category": "营养",
        "description": "Mifflin-St. Jeor公式比Harris-Benedict更准确（尤其对超重/肥胖人群），是ADA和AND推荐的首选公式。",
        "parameters": [
            {"id": "sex", "name": "性别", "unit": "", "type": "select", "options": [{"value": "M", "label": "男性"}, {"value": "F", "label": "女性"}]},
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 20, "max": 300},
            {"id": "height", "name": "身高", "unit": "cm", "type": "number", "min": 50, "max": 250},
            {"id": "age", "name": "年龄", "unit": "岁", "type": "number", "min": 18, "max": 120},
        ],
        "formula_expr": "男性：RMR(kcal/d) = 10×W + 6.25×H - 5×A + 5\n女性：RMR(kcal/d) = 10×W + 6.25×H - 5×A - 161\n（W=体重kg，H=身高cm，A=年龄岁）",
        "unit": "kcal/d",
        "interpretation": "总能量需求 = RMR × 活动系数（卧床1.2；轻活动1.375；中等活动1.55；重体力1.725）",
        "clinical_use": "营养支持处方，肥胖/超重患者能量需求更准确估算",
    },
    {
        "name": "调整体重（ABW）",
        "category": "营养",
        "description": "肥胖患者药物剂量计算时，使用调整体重比实际体重或理想体重更准确。",
        "parameters": [
            {"id": "ibw", "name": "理想体重（IBW）", "unit": "kg", "type": "number", "min": 20, "max": 100},
            {"id": "abw_actual", "name": "实际体重", "unit": "kg", "type": "number", "min": 20, "max": 300},
        ],
        "formula_expr": "ABW(kg) = IBW + 0.4 × (实际体重 - IBW)\n仅在实际体重>IBW的120%（即>1.2×IBW）时使用",
        "unit": "kg",
        "interpretation": "用于：氨基糖苷类、万古霉素、低分子肝素等脂溶性较弱药物的剂量计算",
        "clinical_use": "肥胖患者（BMI>30）抗菌药物、抗凝药物剂量调整",
    },
    {
        "name": "蛋白需求量估算",
        "category": "营养",
        "description": "根据临床状态估算每日蛋白质需求，是肠内/肠外营养处方的基本参数。",
        "parameters": [
            {"id": "weight", "name": "体重（理想体重或实际体重）", "unit": "kg", "type": "number", "min": 20, "max": 200},
            {"id": "status", "name": "临床状态", "unit": "", "type": "select", "options": [
                {"value": 1.2, "label": "健康成人（1.2 g/kg/d）"},
                {"value": 1.5, "label": "外科手术/轻度应激（1.5 g/kg/d）"},
                {"value": 2.0, "label": "烧伤/重症/创伤（1.5-2.5 g/kg/d）"},
                {"value": 1.2, "label": "CKD非透析（0.6-0.8 g/kg/d，选填）"},
                {"value": 1.8, "label": "血液透析（1.2-1.5 g/kg/d，选填）"},
            ]},
        ],
        "formula_expr": "每日蛋白需求(g/d) = 体重(kg) × 蛋白系数(g/kg/d)",
        "unit": "g/d",
        "interpretation": "重症患者蛋白摄入不足与肌肉消耗、住院时间延长相关；超过2.5 g/kg/d无明显额外获益",
        "clinical_use": "ICU/术后肠内外营养处方，CKD患者饮食蛋白管理",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 肝病
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "MELD-Na评分（终末期肝病模型+钠）",
        "category": "肝病",
        "description": "在MELD评分基础上加入血清钠，更准确预测肝硬化患者3个月死亡率，目前是UNOS肝脏分配的主要标准。",
        "parameters": [
            {"id": "inr", "name": "INR（国际标准化比值）", "unit": "", "type": "number", "min": 0.8, "max": 20},
            {"id": "cr", "name": "血肌酐（SCr）", "unit": "mg/dL", "type": "number", "min": 0.5, "max": 10, "note": "若肾替代治疗，取值4.0"},
            {"id": "tbil", "name": "总胆红素（TBil）", "unit": "mg/dL", "type": "number", "min": 0.1, "max": 80},
            {"id": "na", "name": "血清钠（Na⁺）", "unit": "mmol/L", "type": "number", "min": 100, "max": 150},
        ],
        "formula_expr": "MELD = 9.57×ln(SCr) + 3.78×ln(TBil) + 11.2×ln(INR) + 6.43（最小值1.0，最大值40）\nMELD-Na = MELD + 1.32×(137 - Na) - [0.033×MELD×(137 - Na)]",
        "unit": "分",
        "interpretation": "<10：3月死亡率<2%；10-19：6%；20-29：20%；30-39：53%；≥40：71%。MELD-Na≥15时考虑肝移植评估",
        "clinical_use": "肝移植等待名单优先排序，肝硬化TIPS术后风险评估，重症肝病ICU管理",
    },
    {
        "name": "FIB-4指数（肝纤维化评分）",
        "category": "肝病",
        "description": "通过血常规和肝功能指标无创评估肝纤维化程度，避免肝活检的无创筛查工具。",
        "parameters": [
            {"id": "age", "name": "年龄", "unit": "岁", "type": "number", "min": 18, "max": 90},
            {"id": "ast", "name": "AST", "unit": "U/L", "type": "number", "min": 5, "max": 2000},
            {"id": "plt", "name": "血小板计数", "unit": "×10⁹/L", "type": "number", "min": 10, "max": 500},
            {"id": "alt", "name": "ALT", "unit": "U/L", "type": "number", "min": 5, "max": 2000},
        ],
        "formula_expr": "FIB-4 = 年龄(岁) × AST(U/L) / [血小板(×10⁹/L) × √ALT(U/L)]",
        "unit": "无量纲",
        "interpretation": "慢性乙/丙肝：<1.30→排除进展期纤维化；1.30-3.25→不确定（需进一步评估）；>3.25→提示进展期纤维化/肝硬化（F3-F4）",
        "clinical_use": "慢性病毒性肝炎肝纤维化无创筛查，NASH/NAFLD进展评估，替代/补充肝活检",
    },
    {
        "name": "AST/ALT比值（AAR）",
        "category": "肝病",
        "description": "AST与ALT之比，用于区分酒精性肝病与其他肝病，以及评估肝硬化进展。",
        "parameters": [
            {"id": "ast", "name": "AST", "unit": "U/L", "type": "number", "min": 5, "max": 2000},
            {"id": "alt", "name": "ALT", "unit": "U/L", "type": "number", "min": 5, "max": 2000},
        ],
        "formula_expr": "AAR = AST / ALT",
        "unit": "无量纲",
        "interpretation": "<1：病毒性肝炎/NAFLD可能；>2：酒精性肝病强烈提示（敏感性70%，特异性80%）；肝硬化时AAR升高（AST>ALT）",
        "clinical_use": "酒精性肝病筛查，肝病病因鉴别，肝纤维化进展评估",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 产科
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "预产期计算（Naegele法则）",
        "category": "产科",
        "description": "基于末次月经（LMP）计算预产期，适用于月经规律（28天周期）的孕妇。",
        "parameters": [
            {"id": "lmp_year", "name": "末次月经年份", "unit": "年", "type": "number", "min": 2020, "max": 2030},
            {"id": "lmp_month", "name": "末次月经月份", "unit": "月", "type": "number", "min": 1, "max": 12},
            {"id": "lmp_day", "name": "末次月经日期", "unit": "日", "type": "number", "min": 1, "max": 31},
        ],
        "formula_expr": "预产期 = LMP + 9个月零7天（或：月份-3，日期+7，年份+1）\n孕周 = (今日 - LMP) / 7",
        "unit": "日期 / 孕周",
        "interpretation": "足月：孕37-41+6周；早产：<37周；过期：≥42周。月经不规律时以早孕超声（7-13+6周）测定孕周为准",
        "clinical_use": "产前检查时间安排，早产/过期妊娠识别，分娩计划制定",
    },
    {
        "name": "Bishop评分（宫颈成熟度）",
        "category": "产科",
        "description": "评估宫颈成熟度，预测引产成功率和分娩进程，是决定引产方式的重要依据。",
        "parameters": [
            {"id": "dilation", "name": "宫口扩张（cm）", "unit": "", "type": "select", "options": [{"value": 0, "label": "闭合（0分）"}, {"value": 1, "label": "1-2 cm（1分）"}, {"value": 2, "label": "3-4 cm（2分）"}, {"value": 3, "label": "≥5 cm（3分）"}]},
            {"id": "effacement", "name": "宫颈消退（%）", "unit": "", "type": "select", "options": [{"value": 0, "label": "0-30%（0分）"}, {"value": 1, "label": "40-50%（1分）"}, {"value": 2, "label": "60-70%（2分）"}, {"value": 3, "label": "≥80%（3分）"}]},
            {"id": "station", "name": "先露位置（cm，相对坐骨棘）", "unit": "", "type": "select", "options": [{"value": 0, "label": "-3（0分）"}, {"value": 1, "label": "-2（1分）"}, {"value": 2, "label": "-1/0（2分）"}, {"value": 3, "label": "+1/+2（3分）"}]},
            {"id": "consistency", "name": "宫颈质地", "unit": "", "type": "select", "options": [{"value": 0, "label": "硬（0分）"}, {"value": 1, "label": "中（1分）"}, {"value": 2, "label": "软（2分）"}]},
            {"id": "position", "name": "宫颈位置", "unit": "", "type": "select", "options": [{"value": 0, "label": "后位（0分）"}, {"value": 1, "label": "中位（1分）"}, {"value": 2, "label": "前位（2分）"}]},
        ],
        "formula_expr": "Bishop评分 = 宫口扩张 + 宫颈消退 + 先露位置 + 宫颈质地 + 宫颈位置（满分13分）",
        "unit": "分",
        "interpretation": "≥8分：宫颈成熟，引产成功率高（类似自然临产）；6-7分：需促宫颈成熟后引产；≤5分：引产失败率高，优先促宫颈成熟",
        "clinical_use": "引产决策，促宫颈成熟方法选择（前列腺素E2/机械扩张/缩宫素）",
    },
    {
        "name": "孕期体重增加目标（Institute of Medicine）",
        "category": "产科",
        "description": "基于孕前BMI的孕期体重增长目标范围，过多或过少均增加母婴风险。",
        "parameters": [
            {"id": "pre_bmi", "name": "孕前BMI（kg/m²）", "unit": "kg/m²", "type": "number", "min": 10, "max": 60},
            {"id": "weeks", "name": "目前孕周", "unit": "周", "type": "number", "min": 0, "max": 42},
        ],
        "formula_expr": "孕前BMI分类目标（单胎）：\n低体重(<18.5)：12.5-18 kg；正常(18.5-24.9)：11.5-16 kg；超重(25-29.9)：7-11.5 kg；肥胖(≥30)：5-9 kg\n孕中晚期增重速率：正常BMI约0.35-0.5 kg/周",
        "unit": "kg（总增重目标）",
        "interpretation": "体重增加不足→胎儿生长受限风险；过多→妊娠期糖尿病、巨大儿、剖宫产率升高",
        "clinical_use": "产前检查体重管理，营养咨询，妊娠期糖尿病风险评估",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 儿科
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "儿童体重估算（年龄公式）",
        "category": "儿科",
        "description": "无法直接称重时，通过年龄估算儿童体重，用于急救剂量计算。",
        "parameters": [
            {"id": "age", "name": "年龄", "unit": "岁", "type": "number", "min": 0.1, "max": 14},
        ],
        "formula_expr": "APLS公式（急救用）：\n1-10岁：体重(kg) = 2 × (年龄+4)\n11-14岁：体重(kg) = 3 × 年龄 + 7\n<1岁（月龄）：体重(kg) = (月龄+9) / 2",
        "unit": "kg",
        "interpretation": "此为估算公式，尽量以实测体重为准。用于急救时药物剂量计算（肾上腺素、阿托品等）",
        "clinical_use": "儿科急救用药剂量计算，院前/急诊无法称重时使用",
    },
    {
        "name": "儿童液体维持量（Holliday-Segar法则）",
        "category": "儿科",
        "description": "计算儿童基础液体维持量（不包括额外液体丢失的补充），是儿科液体管理的基础公式。",
        "parameters": [
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 0.5, "max": 80},
        ],
        "formula_expr": "≤10 kg：100 mL/kg/d\n10-20 kg：1000 + 50 mL/kg（>10 kg部分）/d\n>20 kg：1500 + 20 mL/kg（>20 kg部分）/d\n每小时速率 = 日需量 / 24",
        "unit": "mL/d 或 mL/h",
        "interpretation": "例：25 kg儿童 = 1500 + 20×5 = 1600 mL/d ≈ 67 mL/h。发热每升温1℃增加12%",
        "clinical_use": "儿科住院液体处方，术中/术后液体管理（注：重症患儿可能需限制性补液）",
    },
    {
        "name": "小儿气管导管内径（ETT）",
        "category": "儿科",
        "description": "估算儿童气管插管内径和插入深度，避免过粗（气道损伤）或过细（通气不足）。",
        "parameters": [
            {"id": "age", "name": "年龄", "unit": "岁", "type": "number", "min": 1, "max": 16},
        ],
        "formula_expr": "无套囊导管（<8岁）：内径(mm) = 年龄/4 + 4\n有套囊导管（推荐）：内径(mm) = 年龄/4 + 3.5\n插管深度（口唇至中段气管）：\n  经口：内径(mm) × 3（或年龄/2 + 12 cm）\n  经鼻：内径(mm) × 3 + 2",
        "unit": "mm（内径）/ cm（深度）",
        "interpretation": "经验规则：导管外径约等于小儿小指宽度。插管后听诊双肺，套囊压力<20 cmH₂O",
        "clinical_use": "儿科/新生儿急救气管插管，麻醉气道管理",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 骨科/创伤
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "Glasgow昏迷量表（GCS）计算器",
        "category": "神经",
        "description": "快速量化意识障碍程度，是颅脑外伤分级、气管插管和ICU管理的标准工具。",
        "parameters": [
            {"id": "eye", "name": "睁眼（E）", "unit": "", "type": "select", "options": [{"value": 4, "label": "E4：自发睁眼"}, {"value": 3, "label": "E3：呼唤睁眼"}, {"value": 2, "label": "E2：刺痛睁眼"}, {"value": 1, "label": "E1：不睁眼"}]},
            {"id": "verbal", "name": "言语（V）", "unit": "", "type": "select", "options": [{"value": 5, "label": "V5：正常交谈"}, {"value": 4, "label": "V4：言语混乱"}, {"value": 3, "label": "V3：只说单词"}, {"value": 2, "label": "V2：只发声"}, {"value": 1, "label": "V1：无反应"}, {"value": 0, "label": "VT：气管插管（记录为T）"}]},
            {"id": "motor", "name": "运动（M）", "unit": "", "type": "select", "options": [{"value": 6, "label": "M6：遵嘱运动"}, {"value": 5, "label": "M5：定位疼痛"}, {"value": 4, "label": "M4：回避疼痛"}, {"value": 3, "label": "M3：异常屈曲（去皮质）"}, {"value": 2, "label": "M2：异常伸展（去大脑）"}, {"value": 1, "label": "M1：无运动"}]},
        ],
        "formula_expr": "GCS = E + V + M（满分15分，最低3分）",
        "unit": "分",
        "interpretation": "13-15：轻型颅脑损伤（轻度意识障碍）；9-12：中型；≤8：重型（昏迷，气管插管指征）；3：深昏迷",
        "clinical_use": "颅脑损伤严重度分级，气管插管决策（GCS≤8），APACHE II评分组成，院前评估",
    },
    {
        "name": "损伤严重程度评分（ISS）",
        "category": "骨科/创伤",
        "description": "基于AIS（简明损伤量表）对6个身体区域的创伤进行评分，是多发伤严重程度的国际标准。",
        "parameters": [
            {"id": "head", "name": "头颈部最高AIS（1-6）", "unit": "", "type": "select", "options": [{"value": 0, "label": "0：无损伤"}, {"value": 1, "label": "1：轻微"}, {"value": 2, "label": "2：中度"}, {"value": 3, "label": "3：严重（无生命危险）"}, {"value": 4, "label": "4：严重（生命危险）"}, {"value": 5, "label": "5：危重（存活不确定）"}, {"value": 6, "label": "6：致命"}]},
            {"id": "face", "name": "面部最高AIS", "unit": "", "type": "select", "options": [{"value": 0, "label": "0"}, {"value": 1, "label": "1"}, {"value": 2, "label": "2"}, {"value": 3, "label": "3"}, {"value": 4, "label": "4"}, {"value": 5, "label": "5"}]},
            {"id": "chest", "name": "胸部最高AIS", "unit": "", "type": "select", "options": [{"value": 0, "label": "0"}, {"value": 1, "label": "1"}, {"value": 2, "label": "2"}, {"value": 3, "label": "3"}, {"value": 4, "label": "4"}, {"value": 5, "label": "5"}, {"value": 6, "label": "6"}]},
            {"id": "abdomen", "name": "腹部最高AIS", "unit": "", "type": "select", "options": [{"value": 0, "label": "0"}, {"value": 1, "label": "1"}, {"value": 2, "label": "2"}, {"value": 3, "label": "3"}, {"value": 4, "label": "4"}, {"value": 5, "label": "5"}, {"value": 6, "label": "6"}]},
            {"id": "extremity", "name": "四肢最高AIS", "unit": "", "type": "select", "options": [{"value": 0, "label": "0"}, {"value": 1, "label": "1"}, {"value": 2, "label": "2"}, {"value": 3, "label": "3"}, {"value": 4, "label": "4"}, {"value": 5, "label": "5"}]},
            {"id": "external", "name": "体表最高AIS", "unit": "", "type": "select", "options": [{"value": 0, "label": "0"}, {"value": 1, "label": "1"}, {"value": 2, "label": "2"}, {"value": 3, "label": "3"}]},
        ],
        "formula_expr": "ISS = 最严重3个区域的AIS²之和\n若任一区域AIS=6，ISS自动定义为75（最高）",
        "unit": "分（0-75）",
        "interpretation": "1-8：轻伤；9-15：中度伤；16-24：重伤；25-75：严重伤。ISS≥16为多发伤分诊标准；≥25死亡率>10%",
        "clinical_use": "创伤中心分诊，死亡率预测，创伤研究标准化评估",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 内分泌（扩充）
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "HbA1c与平均血糖换算（eAG）",
        "category": "内分泌",
        "description": "将HbA1c转换为估算平均血糖（eAG），更直观理解血糖控制水平。",
        "parameters": [
            {"id": "hba1c", "name": "HbA1c（%）", "unit": "%", "type": "number", "min": 4, "max": 20},
        ],
        "formula_expr": "eAG(mg/dL) = 28.7 × HbA1c(%) - 46.7\neAG(mmol/L) = 1.59 × HbA1c(%) - 2.59",
        "unit": "mmol/L 或 mg/dL",
        "interpretation": "HbA1c 7%→eAG 8.6 mmol/L；HbA1c 8%→eAG 10.2 mmol/L；HbA1c 9%→eAG 11.8 mmol/L",
        "clinical_use": "向患者解释HbA1c意义，评估与自我血糖监测（SMBG）的一致性",
    },
    {
        "name": "HOMA-IR（胰岛素抵抗稳态模型）",
        "category": "内分泌",
        "description": "通过空腹血糖和空腹胰岛素估算胰岛素抵抗程度，是代谢综合征和NAFLD的无创评估工具。",
        "parameters": [
            {"id": "glucose", "name": "空腹血糖（FPG）", "unit": "mmol/L", "type": "number", "min": 2, "max": 20},
            {"id": "insulin", "name": "空腹胰岛素（INS）", "unit": "μU/mL", "type": "number", "min": 1, "max": 100},
        ],
        "formula_expr": "HOMA-IR = 空腹血糖(mmol/L) × 空腹胰岛素(μU/mL) / 22.5",
        "unit": "无量纲",
        "interpretation": "正常：<1.5-2.0；胰岛素抵抗：>2.5（切点随种族不同）；中国人：>2.69建议作为胰岛素抵抗参考",
        "clinical_use": "2型糖尿病风险评估，PCOS诊断，NAFLD/代谢综合征筛查，二甲双胍治疗适应症评估",
    },
    {
        "name": "体表面积（BSA）—— Du Bois & Du Bois公式",
        "category": "人体测量",
        "description": "Du Bois公式是历史最悠久的BSA计算方法，在肾脏病（eGFR标准化）中广泛使用。",
        "parameters": [
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 10, "max": 300},
            {"id": "height", "name": "身高", "unit": "cm", "type": "number", "min": 50, "max": 250},
        ],
        "formula_expr": "BSA(m²) = 0.007184 × 身高(cm)^0.725 × 体重(kg)^0.425",
        "unit": "m²",
        "interpretation": "成人标准体表面积：1.73 m²（用于肾功能标准化）",
        "clinical_use": "eGFR标准化（mL/min/1.73m²），化疗剂量计算，血流动力学参数标准化",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 感染/急诊（补充）
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "乳酸清除率",
        "category": "急诊",
        "description": "反映复苏治疗效果，乳酸清除率是脓毒症预后的重要动态监测指标。",
        "parameters": [
            {"id": "lac_init", "name": "初始乳酸", "unit": "mmol/L", "type": "number", "min": 0.5, "max": 30},
            {"id": "lac_follow", "name": "复测乳酸（2-6h后）", "unit": "mmol/L", "type": "number", "min": 0.5, "max": 30},
        ],
        "formula_expr": "乳酸清除率(%) = (初始乳酸 - 复测乳酸) / 初始乳酸 × 100%",
        "unit": "%",
        "interpretation": "≥10%（6h内）：复苏达标的替代目标（ScvO₂≥70%替代）；乳酸持续升高或清除不足→预后不良",
        "clinical_use": "脓毒症复苏目标监测，乳酸指导复苏（EGDT替代策略），早期休克鉴别",
    },
    {
        "name": "修正Centor评分（McIsaac评分，链球菌咽炎）",
        "category": "感染",
        "description": "预测A组链球菌（GAS）咽炎概率，指导抗菌药物使用或咽拭子培养/快速抗原检测。",
        "parameters": [
            {"id": "temp", "name": "体温>38℃", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
            {"id": "cough", "name": "无咳嗽", "unit": "", "type": "select", "options": [{"value": 0, "label": "有咳嗽（0分）"}, {"value": 1, "label": "无咳嗽（1分）"}]},
            {"id": "nodes", "name": "颈前淋巴结触痛肿大", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
            {"id": "tonsils", "name": "扁桃体肿大或渗出", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
            {"id": "age", "name": "年龄", "unit": "", "type": "select", "options": [{"value": 1, "label": "3-14岁（+1分）"}, {"value": 0, "label": "15-44岁（0分）"}, {"value": -1, "label": "≥45岁（-1分）"}]},
        ],
        "formula_expr": "修正Centor评分（McIsaac）= 体温 + 无咳嗽 + 淋巴结 + 扁桃体 + 年龄校正",
        "unit": "分",
        "interpretation": "0-1分：GAS概率<10%（无需抗菌药或检测）；2-3分：11-35%（建议快速抗原检测）；4-5分：52%（可经验性给予青霉素）",
        "clinical_use": "急性咽炎抗菌药物合理使用，减少不必要的青霉素/头孢菌素处方",
    },
    {
        "name": "CURB-65简化版（计算器）",
        "category": "感染",
        "description": "社区获得性肺炎（CAP）严重程度快速评估，指导住院决策。（同量表库，此处提供计算器格式）",
        "parameters": [
            {"id": "confusion", "name": "意识障碍（新发）", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
            {"id": "urea", "name": "血尿素氮>7 mmol/L", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
            {"id": "rr", "name": "呼吸频率≥30次/分", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
            {"id": "bp", "name": "SBP<90 或 DBP≤60 mmHg", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
            {"id": "age", "name": "年龄≥65岁", "unit": "", "type": "select", "options": [{"value": 0, "label": "否（0分）"}, {"value": 1, "label": "是（1分）"}]},
        ],
        "formula_expr": "CURB-65 = 意识障碍 + BUN升高 + 呼吸频率 + 血压 + 年龄（满分5分）",
        "unit": "分",
        "interpretation": "0：门诊；1：门诊或短期观察；2：住院；3：考虑ICU；4-5：直接ICU",
        "clinical_use": "CAP住院指征，ICU收治决策",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 单位换算
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "体温单位换算（摄氏度↔华氏度）",
        "category": "单位换算",
        "description": "摄氏度（℃）与华氏度（°F）相互换算，适用于国际文献参考值比较。",
        "parameters": [
            {"id": "celsius", "name": "摄氏度（℃）", "unit": "℃", "type": "number", "min": -10, "max": 50},
        ],
        "formula_expr": "°F = ℃ × 9/5 + 32\n℃ = (°F - 32) × 5/9",
        "unit": "°F",
        "interpretation": "37℃=98.6°F；38℃=100.4°F（发热）；39℃=102.2°F；41℃=105.8°F（高热）",
        "clinical_use": "国际指南参考值换算，进修交流",
    },
    {
        "name": "肌酐单位换算（μmol/L ↔ mg/dL）",
        "category": "单位换算",
        "description": "血肌酐在不同地区和指南中使用不同单位，此工具提供快速换算。",
        "parameters": [
            {"id": "cr_umol", "name": "血肌酐（μmol/L）", "unit": "μmol/L", "type": "number", "min": 10, "max": 2000},
        ],
        "formula_expr": "mg/dL = μmol/L ÷ 88.4\nμmol/L = mg/dL × 88.4",
        "unit": "mg/dL",
        "interpretation": "正常：53-106 μmol/L（0.6-1.2 mg/dL男性）；53-97 μmol/L（0.5-1.1 mg/dL女性）",
        "clinical_use": "Cockcroft-Gault、MDRD等公式使用mg/dL，国内实验室报告μmol/L",
    },
    {
        "name": "血糖单位换算（mmol/L ↔ mg/dL）",
        "category": "单位换算",
        "description": "血糖在中国使用mmol/L，美国使用mg/dL，此工具用于国际参考值换算。",
        "parameters": [
            {"id": "glucose_mmol", "name": "血糖（mmol/L）", "unit": "mmol/L", "type": "number", "min": 1, "max": 100},
        ],
        "formula_expr": "mg/dL = mmol/L × 18\nmmol/L = mg/dL ÷ 18",
        "unit": "mg/dL",
        "interpretation": "正常空腹：3.9-6.1 mmol/L（70-110 mg/dL）；糖尿病诊断：≥7.0 mmol/L（≥126 mg/dL）",
        "clinical_use": "ADA指南（mg/dL）与中国指南（mmol/L）换算，血糖监测仪换算",
    },
    {
        "name": "胆红素单位换算（μmol/L ↔ mg/dL）",
        "category": "单位换算",
        "description": "胆红素单位换算，用于MELD评分（使用mg/dL）和国内实验室（μmol/L）之间的换算。",
        "parameters": [
            {"id": "tbil_umol", "name": "总胆红素（μmol/L）", "unit": "μmol/L", "type": "number", "min": 1, "max": 1000},
        ],
        "formula_expr": "mg/dL = μmol/L ÷ 17.1\nμmol/L = mg/dL × 17.1",
        "unit": "mg/dL",
        "interpretation": "正常：5.1-17.1 μmol/L（0.3-1.0 mg/dL）；黄疸：>34.2 μmol/L（>2 mg/dL）",
        "clinical_use": "MELD/MELD-Na评分计算时的单位换算",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 血栓与抗凝
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "Wells DVT评分",
        "category": "血栓与抗凝",
        "description": "评估下肢深静脉血栓（DVT）临床可能性，指导影像学检查（静脉超声）和抗凝决策。",
        "parameters": [
            {"id": "cancer", "name": "活动性癌症（治疗中或6月内/姑息治疗）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "paralysis", "name": "下肢瘫痪/近期石膏固定", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "bedrest", "name": "近3天卧床>3天或近12周大手术（全麻/区域麻醉）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "tenderness", "name": "深静脉走行压痛", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "swelling", "name": "全下肢肿胀", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "calf_swelling", "name": "小腿周径较对侧增大>3cm", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "pitting", "name": "患肢凹陷性水肿（症状侧更重）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "collateral", "name": "浅表侧支静脉（非曲张静脉）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "alt_dx", "name": "可能有其他诊断（与DVT等可能）", "unit": "", "type": "select", "options": [{"value": -2, "label": "是 (-2)"}, {"value": 0, "label": "否 (0)"}]},
        ],
        "formula_expr": "Wells DVT评分 = 各项之和\n低危：≤0分；中危：1-2分；高危：≥3分",
        "unit": "分",
        "interpretation": "低危（≤0）：DVT可能性低，D-二聚体阴性可排除；中危（1-2）：行静脉超声；高危（≥3）：静脉超声±D-二聚体",
        "clinical_use": "下肢肿胀患者初始评估，是否需要静脉超声检查，指导经验性抗凝决策",
    },
    {
        "name": "CHA₂DS₂-VASc评分（房颤卒中风险）",
        "category": "血栓与抗凝",
        "description": "评估非瓣膜性房颤患者年卒中风险，指导抗凝治疗（OAC）决策。",
        "parameters": [
            {"id": "chf", "name": "充血性心衰/左心功能不全（EF≤40%）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "htn", "name": "高血压", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "age75", "name": "年龄≥75岁", "unit": "", "type": "select", "options": [{"value": 2, "label": "是 (+2)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "dm", "name": "糖尿病", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "stroke", "name": "卒中/TIA/血栓栓塞史", "unit": "", "type": "select", "options": [{"value": 2, "label": "是 (+2)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "vascular", "name": "血管疾病（MI史、主动脉斑块、外周动脉病）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "age65", "name": "年龄65-74岁", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "sex", "name": "女性", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
        ],
        "formula_expr": "CHA₂DS₂-VASc = 各项之和（最高9分）",
        "unit": "分",
        "interpretation": "男性≥2分/女性≥3分：推荐OAC（优选NOAC）；男性1分：可考虑OAC；男性0分/女性1分（仅性别）：不推荐抗凝",
        "clinical_use": "非瓣膜性房颤（包括阵发性）抗凝指征评估，ESC/AHA/ACC指南均采用",
    },
    {
        "name": "HAS-BLED出血风险评分",
        "category": "血栓与抗凝",
        "description": "评估房颤抗凝患者年大出血风险，识别可纠正的出血危险因素，非抗凝禁忌评估工具。",
        "parameters": [
            {"id": "htn", "name": "未控制高血压（SBP>160 mmHg）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "renal", "name": "肾功能异常（透析/移植/SCr>200μmol/L）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "liver", "name": "肝功能异常（肝硬化/胆红素>2×ULN+转氨酶>3×ULN）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "stroke", "name": "卒中史", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "bleeding", "name": "出血史或出血倾向（贫血）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "inr", "name": "INR不稳定（TTR<60%）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "age", "name": "年龄>65岁", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "drugs", "name": "联用抗血小板/NSAIDs", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "alcohol", "name": "过量饮酒（≥8杯/周）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
        ],
        "formula_expr": "HAS-BLED = 各项之和（最高9分）",
        "unit": "分",
        "interpretation": "低危（0-2）：年出血率<2%；中危（3）：年出血率~3.74%；高危（≥4）：需积极纠正可逆因素，非抗凝绝对禁忌",
        "clinical_use": "房颤OAC患者出血风险评估，识别可纠正因素（高血压控制、停NSAIDs、减少饮酒）",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 评分工具（急重症）
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "qSOFA评分（快速脓毒症筛查）",
        "category": "感染/急诊",
        "description": "在ICU外床旁快速识别高危感染患者（器官功能障碍风险），是Sepsis-3标准的配套工具。",
        "parameters": [
            {"id": "rr", "name": "呼吸频率≥22次/分", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "altered", "name": "意识改变（GCS<15）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "sbp", "name": "收缩压≤100 mmHg", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
        ],
        "formula_expr": "qSOFA = 各项之和（0-3分）\n≥2分提示脓毒症高风险",
        "unit": "分",
        "interpretation": "qSOFA≥2：院内死亡率≥10%，应立即完整评估（SOFA评分、乳酸、培养、抗生素）；<2：不排除脓毒症，结合临床",
        "clinical_use": "急诊/普通病房感染患者快速筛查，触发完整脓毒症评估流程",
    },
    {
        "name": "SOFA评分（序贯器官衰竭评分）",
        "category": "感染/急诊",
        "description": "定量评估ICU患者各器官功能状态，SOFA≥2定义器官功能障碍（脓毒症诊断标准）。",
        "parameters": [
            {"id": "pao2_fio2", "name": "PaO₂/FiO₂（呼吸）", "unit": "mmHg", "type": "select", "options": [{"value": 0, "label": "≥400 (0)"}, {"value": 1, "label": "300-399 (+1)"}, {"value": 2, "label": "200-299 (+2)"}, {"value": 3, "label": "100-199+机械通气 (+3)"}, {"value": 4, "label": "<100+机械通气 (+4)"}]},
            {"id": "platelets", "name": "血小板（×10⁹/L）（凝血）", "unit": "", "type": "select", "options": [{"value": 0, "label": "≥150 (0)"}, {"value": 1, "label": "100-149 (+1)"}, {"value": 2, "label": "50-99 (+2)"}, {"value": 3, "label": "20-49 (+3)"}, {"value": 4, "label": "<20 (+4)"}]},
            {"id": "gcs", "name": "GCS评分（神经）", "unit": "", "type": "select", "options": [{"value": 0, "label": "15 (0)"}, {"value": 1, "label": "13-14 (+1)"}, {"value": 2, "label": "10-12 (+2)"}, {"value": 3, "label": "6-9 (+3)"}, {"value": 4, "label": "<6 (+4)"}]},
            {"id": "tbil", "name": "总胆红素（μmol/L）（肝脏）", "unit": "", "type": "select", "options": [{"value": 0, "label": "<20 (0)"}, {"value": 1, "label": "20-32 (+1)"}, {"value": 2, "label": "33-101 (+2)"}, {"value": 3, "label": "102-204 (+3)"}, {"value": 4, "label": ">204 (+4)"}]},
            {"id": "map_vaso", "name": "MAP/升压药（心血管）", "unit": "", "type": "select", "options": [{"value": 0, "label": "MAP≥70 (0)"}, {"value": 1, "label": "MAP<70 (+1)"}, {"value": 2, "label": "多巴胺≤5或任何剂量多巴酚丁胺 (+2)"}, {"value": 3, "label": "多巴胺>5或去甲肾上腺素≤0.1 (+3)"}, {"value": 4, "label": "多巴胺>15或去甲肾上腺素>0.1 (+4)"}]},
            {"id": "scr", "name": "血肌酐（μmol/L）（肾脏）", "unit": "", "type": "select", "options": [{"value": 0, "label": "<110 (0)"}, {"value": 1, "label": "110-170 (+1)"}, {"value": 2, "label": "171-299 (+2)"}, {"value": 3, "label": "300-440或尿量<500mL/d (+3)"}, {"value": 4, "label": ">440或尿量<200mL/d (+4)"}]},
        ],
        "formula_expr": "SOFA = 6项之和（0-24分）\n基线SOFA急性升高≥2分提示器官功能障碍（脓毒症）",
        "unit": "分",
        "interpretation": "0-6：低死亡率；7-9：中等（15-20%）；10-12：≈40%；13-14：≈50%；15-24：>50-95%死亡率",
        "clinical_use": "ICU脓毒症诊断（Sepsis-3）、器官功能动态监测、预后评估",
    },
    {
        "name": "Child-Pugh评分（肝功能分级）",
        "category": "肝病",
        "description": "评估肝硬化患者肝储备功能，用于手术风险分层、预后判断和TIPS/LT适应证评估。",
        "parameters": [
            {"id": "tbil", "name": "总胆红素（μmol/L）", "unit": "", "type": "select", "options": [{"value": 1, "label": "<34 (1)"}, {"value": 2, "label": "34-51 (2)"}, {"value": 3, "label": ">51 (3)"}]},
            {"id": "albumin", "name": "白蛋白（g/L）", "unit": "", "type": "select", "options": [{"value": 1, "label": ">35 (1)"}, {"value": 2, "label": "28-35 (2)"}, {"value": 3, "label": "<28 (3)"}]},
            {"id": "inr", "name": "INR/PT延长", "unit": "", "type": "select", "options": [{"value": 1, "label": "INR<1.7/PT延长<4s (1)"}, {"value": 2, "label": "INR 1.7-2.3/PT延长4-6s (2)"}, {"value": 3, "label": "INR>2.3/PT延长>6s (3)"}]},
            {"id": "ascites", "name": "腹水", "unit": "", "type": "select", "options": [{"value": 1, "label": "无 (1)"}, {"value": 2, "label": "轻度（利尿剂可控） (2)"}, {"value": 3, "label": "中重度（难治性） (3)"}]},
            {"id": "encephalopathy", "name": "肝性脑病", "unit": "", "type": "select", "options": [{"value": 1, "label": "无 (1)"}, {"value": 2, "label": "I-II期 (2)"}, {"value": 3, "label": "III-IV期 (3)"}]},
        ],
        "formula_expr": "Child-Pugh = 5项之和（5-15分）\nA级：5-6分；B级：7-9分；C级：10-15分",
        "unit": "分（A/B/C级）",
        "interpretation": "A级（5-6分）：1年存活率100%，手术耐受好；B级（7-9分）：1年存活率80%，手术风险中等；C级（10-15分）：1年存活率45%，手术禁忌",
        "clinical_use": "肝硬化手术耐受性评估、肝癌切除、TIPS适应证、肝移植评估；与MELD评分互补",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 电解质与渗透压
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "血清渗透压计算",
        "category": "电解质",
        "description": "估算血清渗透压，用于识别渗透压间隙（Osmolal Gap）升高原因，评估高渗性昏迷。",
        "parameters": [
            {"id": "na", "name": "血钠（Na⁺）", "unit": "mmol/L", "type": "number", "min": 100, "max": 180},
            {"id": "glucose", "name": "血糖", "unit": "mmol/L", "type": "number", "min": 2, "max": 100},
            {"id": "bun", "name": "尿素氮（BUN）", "unit": "mmol/L", "type": "number", "min": 1, "max": 60, "note": "若已知尿素氮，BUN(mmol/L)=BUN(mg/dL)×0.357"},
        ],
        "formula_expr": "计算渗透压 = 2×Na⁺ + 血糖(mmol/L) + BUN(mmol/L)\n渗透压间隙 = 实测渗透压 - 计算渗透压（正常<10 mOsm/kg）",
        "unit": "mOsm/kg",
        "interpretation": "正常血清渗透压：275-295 mOsm/kg；>320：高渗；渗透压间隙>10：提示乙醇/甲醇/乙二醇/丙酮等中毒",
        "clinical_use": "糖尿病高渗昏迷诊断、怀疑中毒时渗透压间隙评估、低钠血症分类",
    },
    {
        "name": "低钠血症补钠量计算",
        "category": "电解质",
        "description": "计算纠正低钠血症所需补充的钠量，指导补钠速度（防止渗透性脱髓鞘综合征）。",
        "parameters": [
            {"id": "target_na", "name": "目标血钠", "unit": "mmol/L", "type": "number", "min": 120, "max": 145},
            {"id": "current_na", "name": "当前血钠", "unit": "mmol/L", "type": "number", "min": 100, "max": 135},
            {"id": "weight", "name": "体重", "unit": "kg", "type": "number", "min": 20, "max": 200},
            {"id": "sex", "name": "性别", "unit": "", "type": "select", "options": [{"value": "M", "label": "男性（TBW系数=0.6）"}, {"value": "F", "label": "女性（TBW系数=0.5）"}]},
        ],
        "formula_expr": "TBW = 体重 × 0.6（男）或 × 0.5（女）\n补钠量(mmol) = TBW × (目标Na - 当前Na)\n注：纠正速度 ≤10-12 mmol/L/24h（急性低钠可适当加快至<18mmol/L/24h）",
        "unit": "mmol",
        "interpretation": "慢性低钠血症（>48h）纠正速度务必≤10 mmol/L/24h，避免渗透性脱髓鞘；急性低钠可1-2 mmol/L/h直至症状缓解",
        "clinical_use": "症状性低钠血症的3%氯化钠输注计划，SIADH、心衰、肝硬化低钠的目标管理",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 骨科/创伤（补充）
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "ISS创伤严重程度评分",
        "category": "骨科/创伤",
        "description": "量化多发伤严重程度，是创伤流行病学和质量控制的标准评分，ISS>15定义为重伤。",
        "parameters": [
            {"id": "region1", "name": "最重伤部位AIS评分（最高值）", "unit": "", "type": "select", "options": [{"value": 1, "label": "AIS 1 (轻)"}, {"value": 2, "label": "AIS 2 (中)"}, {"value": 3, "label": "AIS 3 (重)"}, {"value": 4, "label": "AIS 4 (严重)"}, {"value": 5, "label": "AIS 5 (危重)"}]},
            {"id": "region2", "name": "第二重伤部位AIS评分", "unit": "", "type": "select", "options": [{"value": 0, "label": "无"}, {"value": 1, "label": "AIS 1"}, {"value": 2, "label": "AIS 2"}, {"value": 3, "label": "AIS 3"}, {"value": 4, "label": "AIS 4"}, {"value": 5, "label": "AIS 5"}]},
            {"id": "region3", "name": "第三重伤部位AIS评分", "unit": "", "type": "select", "options": [{"value": 0, "label": "无"}, {"value": 1, "label": "AIS 1"}, {"value": 2, "label": "AIS 2"}, {"value": 3, "label": "AIS 3"}, {"value": 4, "label": "AIS 4"}, {"value": 5, "label": "AIS 5"}]},
        ],
        "formula_expr": "ISS = AIS₁² + AIS₂² + AIS₃²（三个最重不同身体区域各取最高AIS）\n若任一部位AIS=6（不可救治），ISS自动=75",
        "unit": "分",
        "interpretation": "轻伤：1-8；中等伤：9-15；重伤：16-24；危重伤：25-74；不可救治：75",
        "clinical_use": "多发伤伤情评估、创伤中心分诊、预后预测、质量控制比较",
    },
    {
        "name": "Revised Trauma Score（修正创伤评分）",
        "category": "骨科/创伤",
        "description": "基于生理参数的创伤严重度评分，用于院前分诊和预后预测，与ISS组合构成TRISS评分。",
        "parameters": [
            {"id": "gcs", "name": "GCS评分", "unit": "", "type": "select", "options": [{"value": 4, "label": "13-15 (4)"}, {"value": 3, "label": "9-12 (3)"}, {"value": 2, "label": "6-8 (2)"}, {"value": 1, "label": "4-5 (1)"}, {"value": 0, "label": "3 (0)"}]},
            {"id": "sbp", "name": "收缩压（mmHg）", "unit": "", "type": "select", "options": [{"value": 4, "label": ">89 (4)"}, {"value": 3, "label": "76-89 (3)"}, {"value": 2, "label": "50-75 (2)"}, {"value": 1, "label": "1-49 (1)"}, {"value": 0, "label": "0 (0)"}]},
            {"id": "rr", "name": "呼吸频率（次/分）", "unit": "", "type": "select", "options": [{"value": 4, "label": "10-29 (4)"}, {"value": 3, "label": ">29 (3)"}, {"value": 2, "label": "6-9 (2)"}, {"value": 1, "label": "1-5 (1)"}, {"value": 0, "label": "0 (0)"}]},
        ],
        "formula_expr": "RTS = 0.9368×GCS编码 + 0.7326×SBP编码 + 0.2908×RR编码\n（生理评分）\n院前分类RTS = GCS编码 + SBP编码 + RR编码（0-12分）",
        "unit": "分",
        "interpretation": "RTS=12（最高，最轻）；RTS≤11提示需创伤中心；院前RTS<12建议转创伤中心",
        "clinical_use": "院前急救分诊、直升机转运决策、创伤预后研究（TRISS法）",
    },
    {
        "name": "踝臂指数（ABI）",
        "category": "心血管",
        "description": "比较踝部与肱动脉收缩压，筛查下肢动脉粥样硬化性疾病（LEAD/PAD）的无创指标。",
        "parameters": [
            {"id": "ankle_sbp", "name": "踝部收缩压（较高值）", "unit": "mmHg", "type": "number", "min": 50, "max": 250},
            {"id": "arm_sbp", "name": "肱动脉收缩压（较高值）", "unit": "mmHg", "type": "number", "min": 50, "max": 250},
        ],
        "formula_expr": "ABI = 踝部收缩压 ÷ 肱动脉收缩压\n（取双侧踝部最高值 / 双侧肱部最高值）",
        "unit": "无量纲",
        "interpretation": ">1.40：动脉不可压缩（钙化）；1.00-1.40：正常；0.91-0.99：临界；0.41-0.90：轻-中度PAD；≤0.40：重度PAD（静息痛/坏疽风险）",
        "clinical_use": "下肢动脉病变筛查、心血管风险分层、静脉溃疡与动脉溃疡鉴别、周围动脉病随访",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 肺炎/感染评分
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "BISAP评分（急性胰腺炎）",
        "category": "感染/急诊",
        "description": "急性胰腺炎入院24小时内的简便严重度评分，早期预测重症和院内死亡率。",
        "parameters": [
            {"id": "bun", "name": "BUN>25 mg/dL（>8.9 mmol/L）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "impaired", "name": "精神状态改变（定向障碍/昏睡/昏迷）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "sirs", "name": "SIRS标准（≥2条：T>38或<36；HR>90；RR>20；WBC>12或<4×10⁹）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "age", "name": "年龄>60岁", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
            {"id": "pleural", "name": "胸腔积液（影像学证实）", "unit": "", "type": "select", "options": [{"value": 1, "label": "是 (+1)"}, {"value": 0, "label": "否 (0)"}]},
        ],
        "formula_expr": "BISAP = 各项之和（0-5分）",
        "unit": "分",
        "interpretation": "0-2：轻症，死亡率<1%；3：中重症，死亡率5-10%；4-5：重症，死亡率10-22%，考虑ICU收治",
        "clinical_use": "急性胰腺炎入院分诊，ICU收治指征评估，与Ranson评分互补（早期即可评估）",
    },

    # ═══════════════════════════════════════════════════════════════════════
    # 内分泌（补充）
    # ═══════════════════════════════════════════════════════════════════════
    {
        "name": "胰岛素抵抗指数（HOMA-IR）",
        "category": "内分泌",
        "description": "稳态模型评估胰岛素抵抗，用于代谢综合征、NAFLD、PCOS等筛查，无需OGTT。",
        "parameters": [
            {"id": "fasting_glucose", "name": "空腹血糖", "unit": "mmol/L", "type": "number", "min": 3, "max": 15},
            {"id": "fasting_insulin", "name": "空腹胰岛素", "unit": "μIU/mL", "type": "number", "min": 1, "max": 100},
        ],
        "formula_expr": "HOMA-IR = (空腹血糖[mmol/L] × 空腹胰岛素[μIU/mL]) / 22.5",
        "unit": "无量纲",
        "interpretation": "正常：<2.5；胰岛素抵抗：≥2.5（部分指南以2.7或3.0为切点）；>3.8：显著抵抗",
        "clinical_use": "代谢综合征诊断、NAFLD/NASH评估、PCOS胰岛素抵抗量化、降糖方案选择",
    },
    {
        "name": "稳态模型胰岛β细胞功能（HOMA-B）",
        "category": "内分泌",
        "description": "评估胰岛β细胞分泌功能，与HOMA-IR联合用于2型糖尿病发病机制研究和分型参考。",
        "parameters": [
            {"id": "fasting_glucose", "name": "空腹血糖", "unit": "mmol/L", "type": "number", "min": 3, "max": 15},
            {"id": "fasting_insulin", "name": "空腹胰岛素", "unit": "μIU/mL", "type": "number", "min": 1, "max": 100},
        ],
        "formula_expr": "HOMA-B(%) = (20 × 空腹胰岛素[μIU/mL]) / (空腹血糖[mmol/L] - 3.5)\n注：空腹血糖需>3.5 mmol/L才有意义",
        "unit": "%",
        "interpretation": "正常参考：100%左右；HOMA-B<50%提示β细胞功能明显受损（胰岛素分泌不足）",
        "clinical_use": "糖尿病分型辅助（1型vs2型）、β细胞功能纵向随访、胰岛素促泌剂疗效评估",
    },
    {
        "name": "甲状腺功能指数（FTI）",
        "category": "内分泌",
        "description": "用T3或T4与TBG/T3摄取率计算游离甲状腺激素指数，在无游离激素检测时评估甲状腺功能。",
        "parameters": [
            {"id": "t4", "name": "总T4（TT4）", "unit": "nmol/L", "type": "number", "min": 10, "max": 300},
            {"id": "t3_uptake", "name": "T3摄取率（T3U）", "unit": "%", "type": "number", "min": 20, "max": 50},
        ],
        "formula_expr": "FTI（游离T4指数） = TT4 × T3U%\n正常参考：FTI = TT4(nmol/L)×T3U%",
        "unit": "无量纲（相对值）",
        "interpretation": "升高：甲亢；降低：甲减；TBG升高（妊娠/雌激素）可导致TT4升高但FTI正常",
        "clinical_use": "无条件检测FT4时的替代指标，妊娠期甲状腺功能评估",
    },
]


if __name__ == "__main__":
    import json
    from pathlib import Path

    output = Path(__file__).parent / "data" / "processed" / "formulas.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(FORMULAS, f, ensure_ascii=False, indent=2)
    print(f"[OK] 医学公式库写出完成：{len(FORMULAS)} 条 -> {output}")
