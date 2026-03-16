/**
 * 智谱 GLM-4 API 客户端
 * 用于临床实体提取 + 追问问题生成
 * 生产环境应通过后端代理调用，避免 key 暴露
 */

const API_BASE = 'https://open.bigmodel.cn/api/paas/v4'
const API_KEY  = import.meta.env.VITE_GLM_API_KEY
const MODEL    = import.meta.env.VITE_GLM_MODEL || 'glm-4-flashx'

async function chat(messages, opts = {}) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.1,   // 低温度，保证提取稳定性
      max_tokens: 1024,
      ...opts,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GLM API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

/* ─────────────────────────────────────────────────────────
   1. 临床实体提取
   输入：录音转写文字
   输出：结构化 JSON
────────────────────────────────────────────────────────── */
const EXTRACT_SYSTEM = `你是一名临床信息结构化助手，擅长从医生与患者的对话录音中提取结构化临床信息。
请严格按照 JSON 格式返回，不要输出任何其他文字、代码块标记或解释。`

const EXTRACT_USER = (transcript) => `从以下录音转写内容中提取结构化临床信息：

---
${transcript}
---

请返回如下 JSON 格式（所有字段都要填，没有信息则用空数组或 null）：
{
  "chief_complaint": "主诉一句话概括（如有）",
  "symptoms": [
    { "name": "症状名", "location": "部位", "duration": "时长", "severity": null, "quality": "性质" }
  ],
  "associated_symptoms": ["伴随症状列表"],
  "denied_symptoms": ["患者明确否认的症状"],
  "vital_signs": { "心率": null, "血压": null, "体温": null, "血氧": null },
  "past_history": ["既往病史列表"],
  "allergies_mentioned": ["提及的过敏史"],
  "medications_mentioned": ["提及的药物"],
  "diagnoses_mentioned": ["医生或患者提及的诊断"],
  "risk_signals": ["危急信号词，如：休克、骤停、大出血等"],
  "stage_hint": "根据信息判断当前阶段：initial / has_labs / has_diagnosis / high_risk",
  "missing_key_info": ["还缺少的关键信息，用于生成追问问题，最多5条"]
}`

export async function extractClinicalEntities(transcript) {
  if (!transcript?.trim() || transcript.trim().length < 10) return null

  const raw = await chat([
    { role: 'system', content: EXTRACT_SYSTEM },
    { role: 'user',   content: EXTRACT_USER(transcript) },
  ])

  try {
    // 兼容模型偶尔返回 ```json ... ``` 包裹的情况
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    console.warn('[GLM] 实体提取 JSON 解析失败:', raw)
    return null
  }
}

/* ─────────────────────────────────────────────────────────
   2. 追问问题生成
   输入：已提取的实体 + 缺失字段
   输出：追问问题列表（每条带选项）
────────────────────────────────────────────────────────── */
const FOLLOWUP_SYSTEM = `你是一名经验丰富的临床医生助手，根据已采集的患者信息，生成需要继续追问的问题。
要求：
- 问题要简洁，符合临床问诊习惯
- 每个问题必须带 2-4 个快捷选项（适合医生快速点选）
- 仅生成最关键的 3 个问题
- 严格返回 JSON，不要其他文字`

const FOLLOWUP_USER = (entities) => `已知患者信息：
主症状：${entities.symptoms?.map(s => s.name).join('、') || '未知'}
主诉：${entities.chief_complaint || '未录入'}
缺失信息：${entities.missing_key_info?.join('、') || '无'}

请生成 3 个最关键的追问问题，格式如下：
[
  {
    "id": "q1",
    "question": "问题内容",
    "options": ["选项A", "选项B", "选项C"],
    "key": "对应的临床字段名，如：severity/quality/radiation"
  }
]`

export async function generateFollowUpQuestions(entities) {
  if (!entities?.symptoms?.length && !entities?.chief_complaint) return []

  const raw = await chat([
    { role: 'system', content: FOLLOWUP_SYSTEM },
    { role: 'user',   content: FOLLOWUP_USER(entities) },
  ])

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    console.warn('[GLM] 追问问题 JSON 解析失败:', raw)
    return []
  }
}

/* ─────────────────────────────────────────────────────────
   3. 智能诊断推荐
   输入：患者结构化数据（主诉 + 检验 + 诊断 + 年龄性别）
   输出：按可能性排序的诊断建议列表
────────────────────────────────────────────────────────── */
const SUGGEST_SYSTEM = `你是一名临床诊断辅助AI，根据患者数据给出诊断推荐与鉴别诊断。
要求：
- 推荐2-3个最可能的诊断（needs_rule_out: false），按可能性从高到低排序
- 额外提供2-3个需要鉴别排除的诊断（needs_rule_out: true），即临床表现相似但需排除的疾病
- 每条给出支持或需鉴别的患者证据
- 严格返回 JSON 数组，不要任何其他文字`

const SUGGEST_USER = (patient, presentIllness) => {
  const abnormalLabs = (patient.lab_results || [])
    .filter(l => l.is_abnormal)
    .map(l => `${l.item_name} ${l.value}${l.unit}(${l.abnormal_type === 'high' ? '↑' : '↓'})`)
    .join('、') || '无'

  return `患者信息：
性别：${patient.gender === 'male' ? '男' : '女'} 年龄：${patient.age}岁
主诉：${patient.chief_complaint || '未录入'}
现病史：${presentIllness || '未录入'}
HIS已有诊断：${(patient.diagnosis_names || []).join('、') || '无'}
异常检验：${abnormalLabs}
过敏史：${(patient.allergies || []).join('、') || '无'}

请返回如下JSON数组（共4-6条，其中2-3条needs_rule_out为true的鉴别诊断）：
[
  {
    "disease_name": "疾病名称",
    "icd_code": "ICD-10编码",
    "match_score": 0.92,
    "evidence": ["支持或需鉴别的患者证据1", "证据2"],
    "needs_rule_out": false
  }
]`
}

export async function suggestDiagnoses(patient, presentIllness) {
  if (!patient?.patient_id) return []

  const raw = await chat([
    { role: 'system', content: SUGGEST_SYSTEM },
    { role: 'user',   content: SUGGEST_USER(patient, presentIllness) },
  ])

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const result = JSON.parse(cleaned)
    return Array.isArray(result) ? result : []
  } catch {
    console.warn('[GLM] 诊断推荐 JSON 解析失败:', raw)
    return []
  }
}

/* ─────────────────────────────────────────────────────────
   4. 检验结果解读
   输入：患者信息 + 全部检验结果
   输出：每项异常结果的临床解读、严重程度、建议处置
────────────────────────────────────────────────────────── */
const INTERPRET_SYSTEM = `你是一名临床检验解读AI，根据患者信息对检验结果给出个性化临床解读。
要求：
- 结合患者诊断、性别、年龄、用药等背景给出针对性解读
- 对多参考值项目说明是否使用了患者特异性参考范围
- 严重度分三级：critical（危急）/ abnormal（异常）/ borderline（临界）
- 严格返回 JSON 数组，不要任何其他文字`

const INTERPRET_USER = (patient) => {
  const abnormals = (patient.lab_results || []).filter(l => l.is_abnormal)
  if (!abnormals.length) return ''

  return `患者背景：
性别：${patient.gender === 'male' ? '男' : '女'} 年龄：${patient.age}岁
诊断：${(patient.diagnosis_names || []).join('、') || '无'}
现用药：${(patient.current_medications || []).join('、') || '无'}

异常检验结果：
${abnormals.map(l =>
  `- ${l.item_name}：${l.value}${l.unit}（参考${l.reference_low}–${l.reference_high}，${l.abnormal_type === 'high' ? '偏高' : '偏低'}）`
).join('\n')}

请对每项异常结果返回如下JSON数组：
[
  {
    "item_code": "检验项目代码",
    "item_name": "检验项目名称",
    "severity": "critical | abnormal | borderline",
    "interpretation": "结合患者背景的临床解读（40字以内）",
    "action": "建议处置（20字以内）",
    "adjusted_range": true或false（是否使用了患者特异性参考范围）,
    "range_note": "若adjusted_range为true，说明调整依据（如：年龄特异性阈值）"
  }
]`
}

export async function interpretLabResults(patient) {
  if (!patient?.lab_results?.some(l => l.is_abnormal)) return []

  const raw = await chat([
    { role: 'system', content: INTERPRET_SYSTEM },
    { role: 'user',   content: INTERPRET_USER(patient) },
  ])

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const result = JSON.parse(cleaned)
    return Array.isArray(result) ? result : []
  } catch {
    console.warn('[GLM] 检验解读 JSON 解析失败:', raw)
    return []
  }
}

/* ─────────────────────────────────────────────────────────
   5. 患者数据推断（核心：基于HIS已有数据做临床推断）
   输入：患者结构化数据（诊断 + 检验 + 用药 + 主诉 + 既往史）
   输出：AI推断的现病史、完善主诉、风险信号、缺失信息
────────────────────────────────────────────────────────── */
const INFER_SYSTEM = `你是一名临床决策辅助AI，根据患者的HIS结构化数据，推断并生成标准临床文书字段。
要求：
- 基于已有数据做合理临床推断，不臆造不确定的信息
- 推断内容仅作为医生辅助参考，需医生确认后写入病历
- 严格返回 JSON，不要任何其他文字或代码块标记`

const INFER_USER = (patient) => {
  const abnormalLabs = (patient.lab_results || [])
    .filter(l => l.is_abnormal)
    .map(l => `${l.item_name} ${l.value}${l.unit}(${l.abnormal_type === 'high' ? '↑' : '↓'})`)
    .join('、') || '无'

  return `患者HIS数据：
主诉：${patient.chief_complaint || '未录入'}
当前诊断：${(patient.diagnosis_names || []).join('、') || '无'}
过敏史：${(patient.allergies || []).join('、') || '无'}
现用药：${(patient.current_medications || []).join('、') || '无'}
既往史：${(patient.past_history || []).join('、') || '无'}
异常检验：${abnormalLabs}
性别：${patient.gender === 'male' ? '男' : '女'} 年龄：${patient.age}岁

请基于以上数据推断，返回如下JSON（无把握的字段返回null或空数组）：
{
  "chief_complaint_refined": "根据诊断与检验完善后的标准主诉（≤60字，若原主诉已完整则优化表达）",
  "present_illness": "推断的现病史要点（结合诊断+异常检验+用药，≤120字，以第三人称叙述）",
  "risk_signals": ["基于检验值和诊断识别的危急或高风险信号，无则返回空数组"],
  "missing_key_info": ["建议医生补充的关键缺失临床信息，最多3条"],
  "stage_hint": "initial | has_labs | has_diagnosis | high_risk"
}`
}

export async function inferFromPatientData(patient) {
  if (!patient?.patient_id) return null

  const raw = await chat([
    { role: 'system', content: INFER_SYSTEM },
    { role: 'user',   content: INFER_USER(patient) },
  ])

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    console.warn('[GLM] 患者推断 JSON 解析失败:', raw)
    return null
  }
}

/* ─────────────────────────────────────────────────────────
   4. 结构化主诉生成（最终摘要）
   输入：实体 + 追问答案
   输出：标准主诉文本 + 结构化字段
────────────────────────────────────────────────────────── */
export async function generateStructuredSummary(entities, followUpAnswers) {
  const answersText = Object.entries(followUpAnswers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const raw = await chat([
    {
      role: 'system',
      content: '你是临床病历书写助手，根据采集的结构化信息生成标准主诉描述，不超过60字，符合病历书写规范。只返回主诉文本，不要其他内容。'
    },
    {
      role: 'user',
      content: `提取信息：${JSON.stringify(entities, null, 2)}\n\n追问答案：\n${answersText}\n\n请生成标准主诉：`
    },
  ])

  return raw.trim()
}
