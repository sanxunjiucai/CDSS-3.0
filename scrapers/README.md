# CDSS 3.0 知识库爬取工程

## 目录结构

```
scrapers/
├── pipeline.py          # 总流水线（主入口）
├── base_scraper.py      # 基础类（请求/断点/存储）
├── disease_scraper.py   # 疾病知识库（默沙东中文版）
├── drug_scraper.py      # 药品知识库（国家药监局）
├── exam_scraper.py      # 检验检查知识库（MSD + 卫健委标准）
├── assessment_data.py   # 量表库（内置，10个量表）
├── formula_data.py      # 医学公式库（内置，15个公式）
├── requirements.txt     # Python依赖
└── data/
    ├── raw/             # 原始爬取数据
    ├── processed/       # 清洗后的标准JSON（导入用）
    └── checkpoints/     # 断点续爬状态
```

## 快速开始

### 1. 安装依赖

```bash
cd scrapers
pip install -r requirements.txt
# 安装 Playwright（药品爬虫需要）
playwright install chromium
```

### 2. 运行爬虫

```bash
# 查看当前状态
python pipeline.py --status

# 写出内置数据（量表+公式，秒级完成，建议先运行）
python pipeline.py --builtin

# 爬取检验检查知识库（MSD参考值）
python pipeline.py --exam

# 爬取疾病知识库（默沙东，耗时较长）
python pipeline.py --disease

# 爬取药品知识库（国家药监局）
python pipeline.py --drug

# 运行全部
python pipeline.py --all
```

### 3. 断点续爬

爬虫支持断点续爬，中途 Ctrl+C 后直接重新运行即可从上次位置继续。

## 数据来源

| 知识库 | 来源 | 类型 | 预计数据量 |
|-------|------|------|----------|
| 疾病知识库 | 默沙东诊疗手册中文专业版 | 网络爬取 | 1500-3000条 |
| 药品知识库 | 国家药品监督管理局 | 网络爬取 | 5000-20000条 |
| 检验检查知识库 | MSD参考值 + 卫健委WS/T标准 | 爬取+内置 | 200-500条 |
| 量表库 | 各学术组织公开量表 | 内置 | 10条（核心量表） |
| 医学公式库 | 教科书/指南公开公式 | 内置 | 15条 |

## 输出格式

所有输出文件保存在 `data/processed/`，格式为 JSON 数组，直接对应后端数据库模型。

### 疾病（diseases.json）
```json
[{
  "name": "社区获得性肺炎",
  "icd_code": "J18.9",
  "alias": ["CAP", "肺炎"],
  "department": "呼吸科",
  "system": "呼吸系统",
  "overview": "...",
  "etiology": "...",
  "symptoms": "...",
  "diagnosis_criteria": "...",
  "treatment": "...",
  "prognosis": "..."
}]
```

### 药品（drugs.json）
```json
[{
  "name": "阿莫西林",
  "trade_name": "再林",
  "approval_number": "国药准字H10960003",
  "category": "化学药品",
  "indications": "...",
  "dosage": "...",
  "contraindications": "...",
  "interactions": "...",
  "adverse_reactions": "...",
  "special_population": "..."
}]
```

### 检验检查（exams.json）
```json
[{
  "name": "白细胞计数（WBC）",
  "code": "WBC",
  "type": "lab",
  "unit": "×10⁹/L",
  "reference_ranges": [
    {"gender": "", "age_min": 18, "age_max": null, "low": 3.5, "high": 9.5, "condition": "成人"}
  ],
  "clinical_significance": "...",
  "indications": "...",
  "preparation": "..."
}]
```

## 注意事项

1. **请求限速**：爬虫内置随机延迟（1.5-5秒），不要修改为0，避免被封IP
2. **药品爬虫**：需要 Playwright（headless Chrome），国家药监局有动态签名保护
3. **版权**：默沙东内容仅用于临床辅助目的，禁止商业转售
4. **数据质量**：建议爬取后人工抽检10-20条，核验关键字段
