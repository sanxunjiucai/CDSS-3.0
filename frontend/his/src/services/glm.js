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
   3. 结构化主诉生成（最终摘要）
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
