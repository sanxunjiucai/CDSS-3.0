/**
 * ProactiveActionCard — 预判下一步操作
 *
 * 基于当前诊疗阶段（useWorkflowStage）和已推断数据，
 * 预测医生下一步最可能执行的操作，以预填形式展示，
 * 医生只需"确认"或"忽略"，无需逐步点击操作。
 *
 * 数据来源：完全复用 clinicalContextStore + patientStore，无需额外 AI 调用。
 * 生命周期：MainPanel 的 key={stage} 保证阶段切换时自动重置本卡状态。
 */
import { useState, useMemo } from 'react'
import {
  Zap, Stethoscope, FlaskConical, HeartPulse, ArrowUpRight,
  CheckCircle2, X, ChevronDown, ChevronUp, BookOpen,
  AlertTriangle, Sparkles,
} from 'lucide-react'
import { usePatientStore }         from '@/stores/patient'
import { useClinicalContextStore } from '@/stores/clinicalContext'
import { useWorkflowStage }        from '@/hooks/useWorkflowStage'
import { cn }                      from '@/lib/utils'

/* ── 阶段 → 预判操作 ─────────────────────────────────────────────── */
function derivePredictedAction(stage, patient, diagnosisSuggestions, labInterpretations) {
  switch (stage) {

    case 'initial': {
      const topDx = diagnosisSuggestions?.[0]
      if (!topDx) return null
      const pct = Math.round((topDx.match_score || 0) * 100)
      return {
        type:         'fill_diagnosis',
        Icon:         Stethoscope,
        iconBg:       'bg-blue-500',
        accentCls:    'border-l-blue-400',
        headerBg:     'bg-blue-50',
        title:        '建议填写诊断',
        preview:      topDx.disease_name,
        previewSub:   `${pct}% 匹配度`,
        evidence:     topDx.evidence?.slice(0, 3) || [],
        confidence:   topDx.match_score >= 0.8 ? 'high' : topDx.match_score >= 0.6 ? 'medium' : 'low',
        confirmLabel: '确认填入诊断',
        payload:      { disease_name: topDx.disease_name, icd_code: topDx.icd_code },
        safetyNote:   null,
      }
    }

    case 'has_labs': {
      // 优先 GLM 解读结果；回退到 patient 原始异常检验
      const topInterp = labInterpretations?.[0]
      const topRaw    = patient?.lab_results?.find(l => l.is_abnormal)
      if (!topInterp && !topRaw) return null

      const labName = topInterp?.item_name ?? topRaw.item_name
      const labVal  = topRaw
        ? `${topRaw.value}${topRaw.unit || ''}`
        : ''
      const interp  = topInterp?.interpretation ?? topInterp?.action ?? '异常值，建议关注临床意义'
      const hasGlm  = !!topInterp

      return {
        type:         'review_labs',
        Icon:         FlaskConical,
        iconBg:       'bg-orange-500',
        accentCls:    'border-l-orange-400',
        headerBg:     'bg-orange-50',
        title:        '建议解读检验结果',
        preview:      labVal ? `${labName}  ${labVal}` : labName,
        previewSub:   hasGlm ? 'AI 解读已就绪' : '异常值',
        evidence:     [interp, ...(topInterp?.action ? [topInterp.action] : [])].filter(Boolean).slice(0, 2),
        confidence:   hasGlm ? 'high' : 'medium',
        confirmLabel: '确认写入解读',
        payload:      { item_name: labName, interpretation: interp },
        safetyNote:   null,
      }
    }

    case 'has_diagnosis': {
      const firstDx = patient?.diagnosis_names?.[0]
      if (!firstDx) return null
      // 过敏/用药提示
      const allergyCount = patient?.allergies?.length ?? 0
      const evidence = [
        `诊断已明确：${firstDx}`,
        allergyCount > 0 ? `注意：患者有 ${allergyCount} 条过敏史，请核查方案禁忌` : null,
      ].filter(Boolean)

      return {
        type:         'write_treatment',
        Icon:         HeartPulse,
        iconBg:       'bg-green-500',
        accentCls:    'border-l-green-400',
        headerBg:     'bg-green-50',
        title:        '建议开具治疗方案',
        preview:      `${firstDx}  首选方案`,
        previewSub:   '详见下方治疗推荐卡片',
        evidence,
        confidence:   'high',
        confirmLabel: '确认开具医嘱',
        payload:      { diagnosis: firstDx },
        safetyNote:   '请核实方案与患者实际情况（过敏史/肾功能/禁忌）完全相符后再确认',
      }
    }

    case 'high_risk': {
      // 找最显著的危急信号
      const critLab = patient?.lab_results?.find(l => {
        if (!l.is_abnormal || !l.reference_high || l.reference_high === 0) return false
        return l.value / l.reference_high >= 5
      })
      const riskDx = patient?.diagnosis_names?.[0]
      const evidence = critLab
        ? [`${critLab.item_name} ${critLab.value}${critLab.unit} 达危急值（超正常上限 ${Math.round(critLab.value / critLab.reference_high)}×）`]
        : riskDx
        ? [`高风险诊断：${riskDx}`]
        : ['检测到危急临床信号']

      return {
        type:         'initiate_transfer',
        Icon:         ArrowUpRight,
        iconBg:       'bg-red-500',
        accentCls:    'border-l-red-500',
        headerBg:     'bg-red-50',
        title:        '建议发起转诊',
        preview:      '危重  →  即刻处置',
        previewSub:   'CCU / 急诊科',
        evidence,
        confidence:   'high',
        confirmLabel: '确认发起转诊申请',
        payload:      { level: 'critical' },
        safetyNote:   '转诊申请将通知目标科室，请确认病情已充分评估',
      }
    }

    default:
      return null
  }
}

/* ── 置信度样式 ──────────────────────────────────────────────────── */
const CONFIDENCE_CFG = {
  high:   { label: '高置信', cls: 'text-green-700 bg-green-50 border-green-200' },
  medium: { label: '中置信', cls: 'text-amber-600 bg-amber-50  border-amber-200' },
  low:    { label: '低置信', cls: 'text-gray-500  bg-gray-50   border-gray-200'  },
}

/* ── 主组件 ──────────────────────────────────────────────────────── */
export function ProactiveActionCard() {
  const patient              = usePatientStore(s => s.context)
  const {
    entities,
    diagnosisSuggestions,
    labInterpretations,
    isSuggesting,
  } = useClinicalContextStore()

  const stage    = useWorkflowStage(patient, entities)
  const [dismissed,    setDismissed]    = useState(false)
  const [confirmed,    setConfirmed]    = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)

  const action = useMemo(
    () => derivePredictedAction(stage, patient, diagnosisSuggestions, labInterpretations),
    [stage, patient, diagnosisSuggestions, labInterpretations],
  )

  // 初始阶段诊断推断还在进行中时先等
  if (!patient || !action || dismissed)           return null
  if (isSuggesting && stage === 'initial')        return null

  const {
    Icon, iconBg, accentCls, headerBg,
    title, preview, previewSub,
    evidence, confidence,
    confirmLabel, payload, safetyNote,
  } = action

  const confCfg = CONFIDENCE_CFG[confidence]

  const handleConfirm = () => {
    console.log('[ProactiveAction] confirmed', { type: action.type, payload })
    setConfirmed(true)
    // 1.8s 后自动收起，让医生视线回到卡片流
    setTimeout(() => {
      setConfirmed(false)
      setDismissed(true)
    }, 1800)
  }

  return (
    <div className={cn('border-b border-border border-l-4 bg-white', accentCls)}>

      {/* ── 头部标题栏 ───────────────────────────────────────── */}
      <div className={cn('flex items-center gap-2 px-3 py-1.5', headerBg)}>
        {/* 操作图标 */}
        <div className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
          iconBg,
        )}>
          <Icon size={11} className="text-white" />
        </div>

        {/* 标题 */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Zap size={10} className="text-gray-400 flex-shrink-0" />
          <span className="text-2xs text-gray-500 font-medium whitespace-nowrap">AI 预判下一步</span>
          <span className="text-xs font-semibold text-gray-800 truncate">{title}</span>
        </div>

        {/* 置信度徽章 */}
        <span className={cn(
          'text-2xs px-1 py-px rounded border flex-shrink-0 font-medium',
          confCfg.cls,
        )}>
          {confCfg.label}
        </span>

        {/* 关闭 */}
        <button
          onClick={() => setDismissed(true)}
          title="忽略此建议"
          className="text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors ml-1"
        >
          <X size={12} />
        </button>
      </div>

      {/* ── 内容区 ───────────────────────────────────────────── */}
      <div className="px-3 py-2 space-y-2">

        {/* 预填内容框 */}
        <div className="flex items-center gap-2 px-2.5 py-2 rounded border border-border bg-gray-50">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{preview}</p>
            <p className="text-2xs text-gray-400 mt-0.5">{previewSub}</p>
          </div>
          <span className="flex items-center gap-0.5 text-2xs text-primary
                           bg-primary-50 border border-primary-100 px-1 py-px
                           rounded-sm flex-shrink-0 whitespace-nowrap">
            <Sparkles size={8} />
            AI预填
          </span>
        </div>

        {/* 折叠依据 */}
        {evidence?.length > 0 && (
          <div>
            <button
              onClick={() => setShowEvidence(v => !v)}
              className="flex items-center gap-1 text-2xs text-gray-400
                         hover:text-gray-600 transition-colors"
            >
              <BookOpen size={9} />
              <span>依据 ({evidence.length})</span>
              {showEvidence
                ? <ChevronUp size={9} />
                : <ChevronDown size={9} />}
            </button>

            {showEvidence && (
              <div className="mt-1 space-y-1 pl-1">
                {evidence.map((ev, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                    <p className="text-2xs text-gray-600 leading-relaxed">{ev}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 安全提示（高风险 / 处方类操作） */}
        {safetyNote && (
          <div className="flex items-start gap-1.5 px-2 py-1.5 rounded
                          bg-amber-50 border border-amber-100">
            <AlertTriangle size={10} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-2xs text-amber-700 leading-relaxed">{safetyNote}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-1.5 pb-0.5">
          <button
            onClick={handleConfirm}
            disabled={confirmed}
            className={cn(
              'flex-1 py-1.5 text-xs rounded font-medium',
              'flex items-center justify-center gap-1.5 transition-all',
              confirmed
                ? 'bg-green-50 text-success border border-green-200 cursor-default'
                : `${iconBg} text-white hover:opacity-90 active:scale-[.98]`,
            )}
          >
            <CheckCircle2 size={12} />
            {confirmed ? '已确认' : confirmLabel}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100
                       hover:bg-gray-200 rounded font-medium transition-colors"
          >
            忽略
          </button>
        </div>

      </div>
    </div>
  )
}
