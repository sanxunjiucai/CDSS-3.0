/**
 * 根据患者上下文 + 诊疗阶段生成当前辅助项
 */
import { useMemo } from 'react'
import { useWorkflowStage } from './useWorkflowStage'

const ITEM_TYPES = {
  HIGH_RISK: 'high_risk',
  CHIEF_COMPLAINT: 'chief_complaint',
  DIAGNOSIS: 'diagnosis',
  EXAM: 'exam',
  TREATMENT: 'treatment',
}

const PRIORITY = {
  high_risk: 1,
  chief_complaint: 2,
  diagnosis: 3,
  exam: 4,
  treatment: 5,
}

export function useAssistItems(patient, clinicalContext) {
  const stage = useWorkflowStage(patient, clinicalContext?.entities)

  return useMemo(() => {
    if (!patient) return { current: null, pending: [], confirmed: [] }

    const items = []

    // 1. 高危提醒
    const riskItems = generateRiskItems(patient, clinicalContext)
    items.push(...riskItems)

    // 2. 根据阶段生成辅助项
    if (stage === 'initial') {
      const ccItem = generateChiefComplaintItem(patient, clinicalContext)
      if (ccItem) items.push(ccItem)
    }

    if (stage === 'has_labs' || stage === 'has_diagnosis') {
      const dxItem = generateDiagnosisItem(patient, clinicalContext)
      if (dxItem) items.push(dxItem)
    }

    if (stage === 'has_diagnosis') {
      const txItem = generateTreatmentItem(patient, clinicalContext)
      if (txItem) items.push(txItem)
    }

    // 按优先级排序
    items.sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type])

    return {
      current: items[0] || null,
      pending: items.slice(1),
      confirmed: [],
    }
  }, [patient, clinicalContext, stage])
}

function generateRiskItems(patient, ctx) {
  const items = []

  // 过敏冲突
  const allergies = patient.allergies || []
  const meds = patient.current_medications || []
  allergies.forEach(al => {
    meds.forEach(med => {
      if (al.includes('青霉素') && (med.includes('青霉素') || med.includes('阿莫西林'))) {
        items.push({
          type: ITEM_TYPES.HIGH_RISK,
          title: '过敏冲突',
          reason: `患者对${al}过敏，当前用药包含${med}`,
          content: '建议立即停用该药物，更换为大环内酯类或喹诺酮类抗生素',
          actions: ['立即处理', '查看详情'],
        })
      }
    })
  })

  // 危急值
  const labs = patient.lab_results || []
  labs.forEach(lab => {
    if (lab.item_code === 'HSTNT' && parseFloat(lab.value) > 52) {
      items.push({
        type: ITEM_TYPES.HIGH_RISK,
        title: '危急值提醒',
        reason: `${lab.item_name} ${lab.value}${lab.unit}（参考值<52）`,
        content: '提示急性心肌损伤，建议立即评估是否为急性冠脉综合征',
        actions: ['立即处理', '查看详情'],
      })
    }
  })

  return items
}

function generateChiefComplaintItem(patient, ctx) {
  const aiCC = ctx?.inferred?.chief_complaint_refined
  if (!aiCC) return null

  return {
    type: ITEM_TYPES.CHIEF_COMPLAINT,
    title: '建议确认主诉',
    reason: '已从病历中识别到主诉信息',
    content: aiCC,
    actions: ['采纳并写入HIS', '修改后写入', '暂不处理'],
  }
}

function generateDiagnosisItem(patient, ctx) {
  const diagnoses = ctx?.entities?.diagnoses_mentioned || []
  if (diagnoses.length === 0) return null

  return {
    type: ITEM_TYPES.DIAGNOSIS,
    title: '建议确认诊断',
    reason: '根据症状和检验结果分析',
    content: diagnoses[0],
    actions: ['采纳并写入HIS', '查看依据', '暂不处理'],
  }
}

function generateTreatmentItem(patient, ctx) {
  const diagnoses = patient.diagnosis_names || []
  if (diagnoses.length === 0) return null

  // 简化：根据诊断给出通用建议
  if (diagnoses.some(d => d.includes('心肌梗死'))) {
    return {
      type: ITEM_TYPES.TREATMENT,
      title: '建议确认治疗方案',
      reason: '诊断为急性心肌梗死',
      content: '双联抗血小板（阿司匹林+氯吡格雷）+ 他汀类 + β受体阻滞剂',
      actions: ['采纳并写入HIS', '查看详情', '暂不处理'],
    }
  }

  return null
}
