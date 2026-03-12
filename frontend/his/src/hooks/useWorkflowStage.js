/**
 * 根据患者上下文 + NLP实体推断当前诊疗阶段
 *
 * 数据来源优先级：
 *  1. NLP entities（录音实时提取，优先级最高）
 *  2. HIS 患者数据（静态背景信息）
 *
 * Stages:
 *  'no_patient'    — 未加载患者
 *  'initial'       — 患者已加载，尚无强信号（辅助诊断优先）
 *  'has_labs'      — 存在异常检验值（检验解读优先）
 *  'has_diagnosis' — 诊断已明确，检验已看（治疗/指南优先）
 *  'high_risk'     — 风险评估为高危（风险评估+转诊优先）
 */
export function useWorkflowStage(patient, entities) {
  if (!patient) return 'no_patient'

  // ── 1. 优先采用 NLP stage_hint ──────────────────────────────
  if (entities?.stage_hint && entities.stage_hint !== 'initial') {
    const hint = entities.stage_hint
    // NLP 识别到危急信号词 → high_risk
    if (hint === 'high_risk' || (entities.risk_signals?.length > 0)) return 'high_risk'
    if (hint === 'has_diagnosis') return 'has_diagnosis'
    if (hint === 'has_labs') return 'has_labs'
  }

  // NLP 识别到危急信号词（无论 stage_hint 如何）
  const CRITICAL_KEYWORDS = ['休克', '骤停', '大出血', '昏迷', '呼吸衰竭', '心衰', '急性心肌梗死']
  if (entities?.risk_signals?.some(r => CRITICAL_KEYWORDS.some(k => r.includes(k)))) {
    return 'high_risk'
  }

  // NLP 识别到诊断
  if (entities?.diagnoses_mentioned?.length > 0) return 'has_diagnosis'

  // ── 2. 回退到 HIS 静态数据 ──────────────────────────────────
  const labs       = patient.lab_results || []
  const diagnoses  = patient.diagnosis_names || []

  const abnormalLabs = labs.filter(l => l.is_abnormal)
  const criticalLabs = abnormalLabs.filter(l => {
    if (!l.reference_high || !l.reference_low) return false
    return (
      (l.abnormal_type === 'high' && l.value / l.reference_high >= 5) ||
      (l.abnormal_type === 'low'  && l.reference_low > 0 && l.value / l.reference_low <= 0.2)
    )
  })

  if (criticalLabs.length > 0) return 'high_risk'
  if (abnormalLabs.length > 0) return 'has_labs'
  if (diagnoses.length > 0) return 'has_diagnosis'

  return 'initial'
}

/** 阶段元信息 */
export const STAGE_META = {
  no_patient:    { label: '未接诊',   color: 'text-gray-400' },
  initial:       { label: '主诉录入', color: 'text-primary'  },
  has_labs:      { label: '检验解读', color: 'text-warning'  },
  has_diagnosis: { label: '治疗决策', color: 'text-success'  },
  high_risk:     { label: '危急处置', color: 'text-danger'   },
}

/**
 * 每个 Stage 对应的卡片顺序（cardId 列表）与默认展开卡片
 * cardId 与 MainPanel 中的 CARDS 数组 id 字段对应
 */
// ChiefComplaintCard 已固定在 MainPanel 顶部，不参与动态排序
export const STAGE_LAYOUT = {
  initial: {
    order:    ['alert', 'diagnosis', 'exam', 'treatment', 'labresult', 'guideline', 'risk', 'intervention'],
    expanded: ['alert', 'diagnosis'],
  },
  has_labs: {
    order:    ['alert', 'labresult', 'diagnosis', 'risk', 'treatment', 'exam', 'guideline', 'intervention'],
    expanded: ['alert', 'labresult'],
  },
  has_diagnosis: {
    order:    ['alert', 'treatment', 'guideline', 'risk', 'labresult', 'exam', 'intervention'],
    expanded: ['alert', 'treatment', 'guideline'],
  },
  high_risk: {
    order:    ['alert', 'labresult', 'risk', 'treatment', 'diagnosis', 'guideline', 'exam', 'intervention'],
    expanded: ['alert', 'labresult', 'risk'],
  },
}
