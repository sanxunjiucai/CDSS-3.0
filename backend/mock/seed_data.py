"""
Seed 数据：用于开发阶段快速填充知识库
运行方式：python -m mock.seed_data
"""
import asyncio
from db.database import AsyncSessionLocal, init_db
from db.models.disease import Disease
from db.models.drug import Drug
from db.models.exam import Exam
from db.models.assessment import Assessment
from db.models.user import User
from core.security import get_password_hash

DISEASES = [
    {"name": "社区获得性肺炎", "icd_code": "J18.9", "department": "呼吸内科",
     "system": "呼吸系统",
     "overview": "社区获得性肺炎（CAP）是指在医院外罹患的感染性肺实质炎症，包括具有明确潜伏期的病原体感染在入院后于潜伏期内发病的肺炎。",
     "symptoms": "发热、咳嗽、咳痰、胸痛、呼吸困难",
     "diagnosis_criteria": "临床症状结合影像学检查（胸片或CT）提示新发浸润性阴影",
     "treatment": "根据病情严重程度选择抗感染治疗方案。轻症门诊患者可口服阿莫西林或多西环素；住院患者可给予β-内酰胺类联合大环内酯类或喹诺酮类。"},
    {"name": "高血压", "icd_code": "I10", "department": "心血管内科",
     "system": "循环系统",
     "overview": "高血压是以体循环动脉血压升高为主要临床表现的心血管综合征，收缩压≥140mmHg和（或）舒张压≥90mmHg。",
     "symptoms": "头痛、头晕、心悸，多数患者无明显症状",
     "diagnosis_criteria": "诊室血压≥140/90mmHg，需非同日3次测量确认",
     "treatment": "生活方式干预为基础，药物治疗包括ACEI/ARB、CCB、利尿剂、β受体阻滞剂等。"},
    {"name": "2型糖尿病", "icd_code": "E11", "department": "内分泌科",
     "system": "内分泌系统",
     "overview": "2型糖尿病是以胰岛素抵抗为主，伴胰岛素分泌不足的慢性代谢性疾病。",
     "symptoms": "多饮、多尿、多食、体重减轻（三多一少），部分患者无症状",
     "diagnosis_criteria": "空腹血糖≥7.0mmol/L或餐后2小时血糖≥11.1mmol/L",
     "treatment": "生活方式干预+口服降糖药（二甲双胍首选）或胰岛素治疗，目标HbA1c<7%。"},
    {"name": "急性胃肠炎", "icd_code": "K29.7", "department": "消化内科",
     "system": "消化系统",
     "overview": "急性胃肠炎是指由病毒、细菌、寄生虫或毒素引起的胃肠道急性炎症。",
     "symptoms": "恶心、呕吐、腹痛、腹泻，可伴发热",
     "diagnosis_criteria": "临床症状结合流行病学史，排除其他疾病",
     "treatment": "补液治疗，细菌感染性腹泻适当抗感染，注意电解质平衡。"},
    {"name": "支气管哮喘", "icd_code": "J45", "department": "呼吸内科",
     "system": "呼吸系统",
     "overview": "哮喘是一种慢性气道炎症性疾病，以气道高反应性、可逆性气流受限为特征。",
     "symptoms": "反复发作的喘息、气急、胸闷、咳嗽，夜间及晨间多发",
     "diagnosis_criteria": "典型症状结合肺功能检查（支气管舒张试验阳性）",
     "treatment": "吸入性糖皮质激素（ICS）为基础，按需使用短效β2受体激动剂（SABA）。"},
]

DRUGS = [
    {"name": "阿莫西林", "trade_name": "阿莫西林胶囊", "category": "抗菌药物",
     "indications": "用于敏感菌引起的感染，包括泌尿道感染、呼吸道感染、皮肤软组织感染等",
     "dosage": "成人口服500mg，每8小时一次；儿童按体重25-50mg/kg/d，分3次",
     "contraindications": "青霉素过敏患者禁用",
     "interactions": "与丙磺舒合用可使血药浓度升高；与四环素类同用可产生拮抗",
     "adverse_reactions": "常见过敏反应（皮疹、荨麻疹），严重者可发生过敏性休克"},
    {"name": "氨氯地平", "trade_name": "络活喜", "category": "钙通道阻滞剂",
     "indications": "高血压、稳定型心绞痛",
     "dosage": "成人5mg/d，最大剂量10mg/d，一次服用",
     "contraindications": "严重低血压禁用",
     "interactions": "与西地那非合用可能加重低血压",
     "adverse_reactions": "踝部水肿、面部潮红、头痛"},
    {"name": "二甲双胍", "trade_name": "格华止", "category": "双胍类降糖药",
     "indications": "2型糖尿病的一线治疗药物",
     "dosage": "起始500mg Bid或850mg Qd，随餐服用，最大剂量2550mg/d",
     "contraindications": "肾功能损害（eGFR<30）、严重肝损害、心衰禁用",
     "interactions": "与造影剂合用时需暂停服药",
     "adverse_reactions": "消化道反应（恶心、腹泻），长期使用注意维生素B12缺乏"},
    {"name": "布地奈德福莫特罗", "trade_name": "信必可", "category": "吸入性糖皮质激素/LABA复合制剂",
     "indications": "哮喘、慢性阻塞性肺疾病",
     "dosage": "哮喘：160/4.5μg，每次1-2吸，每日2次",
     "contraindications": "对本品成分过敏禁用",
     "interactions": "与β受体阻滞剂联用可降低疗效",
     "adverse_reactions": "口咽部念珠菌感染、声音嘶哑（使用后漱口可预防）"},
    {"name": "奥美拉唑", "trade_name": "洛赛克", "category": "质子泵抑制剂",
     "indications": "消化性溃疡、胃食管反流病、根除幽门螺旋杆菌",
     "dosage": "成人20-40mg/d，晨起空腹服用",
     "contraindications": "对苯并咪唑类药物过敏禁用",
     "interactions": "可影响氯吡格雷代谢，尽量避免合用",
     "adverse_reactions": "头痛、腹泻、恶心，长期使用注意低镁血症"},
]

EXAMS = [
    {"name": "白细胞计数", "code": "WBC", "type": "lab",
     "description": "白细胞是血液中的免疫细胞，用于评估感染、炎症和免疫状态",
     "reference_ranges": [
         {"gender": None, "age_min": 18, "age_max": None, "unit": "×10⁹/L", "low": 4.0, "high": 10.0}
     ],
     "clinical_significance": "升高提示细菌感染、应激反应；降低提示病毒感染、骨髓抑制",
     "preparation": "无特殊准备"},
    {"name": "血红蛋白", "code": "HGB", "type": "lab",
     "description": "血红蛋白是红细胞的主要成分，用于评估贫血",
     "reference_ranges": [
         {"gender": "male", "age_min": 18, "age_max": None, "unit": "g/L", "low": 120.0, "high": 160.0},
         {"gender": "female", "age_min": 18, "age_max": None, "unit": "g/L", "low": 110.0, "high": 150.0},
     ],
     "clinical_significance": "低于参考值提示贫血，需进一步分类诊断",
     "preparation": "无特殊准备"},
    {"name": "空腹血糖", "code": "FBG", "type": "lab",
     "description": "空腹状态下血液中葡萄糖浓度，用于糖尿病筛查和监测",
     "reference_ranges": [
         {"gender": None, "age_min": None, "age_max": None, "unit": "mmol/L",
          "low": 3.9, "high": 6.1, "condition": "空腹8小时以上"}
     ],
     "clinical_significance": "≥7.0mmol/L提示糖尿病，6.1-7.0为空腹血糖受损",
     "preparation": "空腹8小时以上，禁食禁饮（可饮少量白水）"},
    {"name": "胸部X线检查", "code": "CHEST_XR", "type": "exam",
     "description": "胸部正位/侧位X线摄影，用于评估肺部、心脏、胸廓病变",
     "reference_ranges": [],
     "clinical_significance": "可发现肺炎浸润、胸腔积液、心影增大、气胸等病变",
     "preparation": "去除金属饰品，女性避免妊娠期检查"},
    {"name": "糖化血红蛋白", "code": "HbA1c", "type": "lab",
     "description": "反映过去2-3个月的平均血糖控制水平",
     "reference_ranges": [
         {"gender": None, "age_min": None, "age_max": None, "unit": "%", "low": None, "high": 6.0}
     ],
     "clinical_significance": "糖尿病患者控制目标<7%；>7%提示血糖控制不佳",
     "preparation": "无需空腹"},
]

ASSESSMENTS = [
    {
        "name": "CURB-65 肺炎严重程度评分",
        "description": "用于社区获得性肺炎患者病情严重程度评估及住院决策",
        "department": "呼吸内科",
        "questions": [
            {"id": "confusion", "text": "是否存在意识障碍（新发混乱/定向障碍）",
             "options": [{"value": "0", "score": 0, "label": "否"}, {"value": "1", "score": 1, "label": "是"}],
             "auto_fill_field": None},
            {"id": "bun", "text": "血尿素氮 > 7mmol/L",
             "options": [{"value": "0", "score": 0, "label": "否"}, {"value": "1", "score": 1, "label": "是"}],
             "auto_fill_field": "lab_bun"},
            {"id": "rr", "text": "呼吸频率 ≥ 30次/分",
             "options": [{"value": "0", "score": 0, "label": "否"}, {"value": "1", "score": 1, "label": "是"}],
             "auto_fill_field": None},
            {"id": "bp", "text": "收缩压 < 90mmHg 或舒张压 ≤ 60mmHg",
             "options": [{"value": "0", "score": 0, "label": "否"}, {"value": "1", "score": 1, "label": "是"}],
             "auto_fill_field": None},
            {"id": "age", "text": "年龄 ≥ 65岁",
             "options": [{"value": "0", "score": 0, "label": "否"}, {"value": "1", "score": 1, "label": "是"}],
             "auto_fill_field": "age"},
        ],
        "scoring_rules": [
            {"range_min": 0, "range_max": 1, "level": "低风险", "interpretation": "30天病死率 < 3%",
             "recommendation": "门诊治疗，口服抗生素"},
            {"range_min": 2, "range_max": 2, "level": "中风险", "interpretation": "30天病死率 9%",
             "recommendation": "住院治疗，短期观察"},
            {"range_min": 3, "range_max": 5, "level": "高风险", "interpretation": "30天病死率 15-40%",
             "recommendation": "住院或ICU治疗"},
        ],
    }
]


async def seed():
    await init_db()
    async with AsyncSessionLocal() as session:
        # 创建默认管理员账号
        admin = User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            display_name="系统管理员",
            role="admin",
        )
        session.add(admin)

        # 导入疾病数据
        for d in DISEASES:
            session.add(Disease(**d))

        # 导入药品数据
        for d in DRUGS:
            session.add(Drug(**d))

        # 导入检验检查数据
        for e in EXAMS:
            session.add(Exam(**e))

        # 导入量表数据
        for a in ASSESSMENTS:
            session.add(Assessment(**a))

        await session.commit()
        print(f"Seed 完成: {len(DISEASES)}疾病, {len(DRUGS)}药品, {len(EXAMS)}检验检查, {len(ASSESSMENTS)}量表, 1个管理员账号")


if __name__ == "__main__":
    asyncio.run(seed())
