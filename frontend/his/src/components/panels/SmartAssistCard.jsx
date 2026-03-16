/**
 * SmartAssistCard — 智能辅助（合同 2.1 辅助输入）
 *
 * 数据流：
 *   HIS患者数据（patient store）
 *     ↓  患者加载后自动触发 usePatientInference
 *   GLM推断（inferFromPatientData）
 *     ↓  综合诊断 + 检验 + 用药 + 主诉 + 既往史
 *   推断结果（clinicalContext.inferred）
 *     ↓  结构化展示，区分 HIS原始 / AI推断
 *   医生确认后写回 HIS
 */
import { useState } from 'react'
import { Sparkles, Loader2, PlusCircle, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePatientStore }         from '@/stores/patient'
import { useClinicalContextStore } from '@/stores/clinicalContext'

/* ── 主组件 ─────────────────────────────────────────────────────── */
export function SmartAssistCard({ defaultOpen = true }) {
  const patient    = usePatientStore(s => s.context)
  const { inferred, isInferring } = useClinicalContextStore()
  const [open, setOpen] = useState(defaultOpen)

  if (!patient) return null

  const fmt = (arr = []) => arr.filter(Boolean).join('、')

  /* ── 规则兜底：GLM失败时从患者数据提取风险信号 ─── */
  const deriveFallbackRisks = (pt) => {
    const signals = []

    // 1. 危急检验值
    const CRITICAL_LABS = {
      HSTNT:    v => v > 52,
      NTPROBNP: v => v > 900,
      K:        v => v > 6.0 || v < 3.0,
      NA:       v => v > 150 || v < 125,
      GLU:      v => v > 16.7 || v < 3.9,
      CREA:     v => v > 440,
      HB:       v => v < 60,
    }
    ;(pt.lab_results || []).forEach(r => {
      const rule = CRITICAL_LABS[r.item_code]
      const val  = parseFloat(r.value)
      if (rule && !isNaN(val) && rule(val)) {
        signals.push(`${r.item_name} ${r.value}${r.unit}（危急值）`)
      } else if (r.is_abnormal && r.abnormal_type === 'high') {
        signals.push(`${r.item_name}↑（${r.value}${r.unit}）`)
      }
    })

    // 2. 高风险诊断关键词
    const HIGH_RISK_DX = [
      ['STEMI', '急性ST段抬高型心肌梗死'],
      ['NSTEMI', '急性非ST段抬高型心肌梗死'],
      ['脓毒症', '感染性休克'],
      ['急性心力衰竭', '心力衰竭急性发作'],
      ['脑卒中', '脑梗死', '脑出血'],
      ['肺栓塞'],
      ['主动脉夹层'],
      ['急性肾衰竭', '急性肾损伤'],
    ]
    const dxNames = pt.diagnosis_names || []
    HIGH_RISK_DX.forEach(group => {
      const matched = group.find(kw => dxNames.some(d => d.includes(kw)))
      if (matched) signals.push(`高风险诊断：${matched}`)
    })

    // 3. 过敏-用药冲突
    const allergies  = pt.allergies || []
    const meds       = pt.current_medications || []
    allergies.forEach(al => {
      meds.forEach(med => {
        if (
          med.includes(al) || al.includes(med) ||
          (al.includes('青霉素') && (med.includes('青霉素') || med.includes('阿莫西林') || med.includes('氨苄')))
        ) {
          signals.push(`⚠ 过敏冲突：${al} ↔ ${med}`)
        }
      })
    })

    return signals
  }

  return (
    <div className="bg-white border-b border-border">

      {/* ── 标题行（可点击展开/收起）──────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-primary" />
          <span className="text-xs font-semibold text-gray-800">智能辅助</span>
          {isInferring && (
            <div className="flex items-center gap-1 text-2xs text-primary">
              <Loader2 size={10} className="animate-spin" />
              <span>推断中…</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* HIS 实时监听状态 */}
          <div className="flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full
                               rounded-full bg-success opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
            </span>
            <span className="text-2xs text-gray-400">HIS 实时监听</span>
          </div>
          <ChevronDown
            size={13}
            className={cn('text-gray-400 transition-transform', open && 'rotate-180')}
          />
        </div>
      </div>

      {/* ── 内容区（可收起）──────────────────────────────────── */}
      {open && (
        <div className="px-3 pb-3 space-y-1.5">

          {/* 主诉 */}
          <Field
            label="主诉"
            hisValue={patient.chief_complaint}
            aiValue={inferred?.chief_complaint_refined}
            isLoading={isInferring}
          />

          {/* 现病史（纯AI推断） */}
          <Field
            label="现病史"
            hisValue={null}
            aiValue={inferred?.present_illness}
            isLoading={isInferring}
            multiline
          />

          {/* 既往史 */}
          <Field
            label="既往史"
            hisValue={fmt(patient.past_history)}
            aiValue={null}
          />

          {/* 过敏史 */}
          <Field
            label="过敏史"
            hisValue={fmt(patient.allergies)}
            aiValue={null}
            danger
          />

          {/* 风险信号（AI优先，GLM失败时用规则兜底） */}
          {(() => {
            if (isInferring) {
              return <RiskSignals signals={null} isLoading />
            }
            const aiSignals = inferred?.risk_signals
            if (aiSignals?.length > 0) {
              return <RiskSignals signals={aiSignals} isLoading={false} />
            }
            // GLM未返回时，规则兜底
            const fallback = deriveFallbackRisks(patient)
            if (fallback.length > 0) {
              return <RiskSignals signals={fallback} isLoading={false} isFallback />
            }
            return null
          })()}
        </div>
      )}
    </div>
  )
}

/* ── 单字段行：支持 HIS原始 + AI推断 并列或各自展示 ────────────── */
function Field({ label, hisValue, aiValue, isLoading, danger = false, multiline = false }) {
  // HIS 原始值和 AI 推断值各自有独立的写入状态
  const [hisAdded, setHisAdded] = useState(false)
  const [aiAdded,  setAiAdded]  = useState(false)

  const handleWrite = (value, setAdded) => {
    console.log('[HIS WriteBack]', { label, value })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  // 若两个值相同（或 AI 值只是小调整），只展示 AI 版本
  const showBoth = hisValue && aiValue && hisValue !== aiValue

  return (
    <div className="space-y-0.5">
      {/* HIS 原始行 */}
      {hisValue && (
        <div className="flex items-start gap-1.5 group">
          <span className="text-2xs text-gray-400 w-14 flex-shrink-0 pt-0.5">{label}</span>
          <div className="flex-1 min-w-0">
            <span className={cn(
              'text-xs leading-relaxed',
              danger ? 'text-danger font-medium' : showBoth ? 'text-gray-400' : 'text-gray-800'
            )}>
              {hisValue}
            </span>
            {showBoth && (
              <span className="ml-1 text-2xs text-gray-300 bg-gray-50 border border-gray-200
                               px-1 py-px rounded-sm">HIS</span>
            )}
          </div>
          <WriteBtn added={hisAdded} onClick={() => handleWrite(hisValue, setHisAdded)} />
        </div>
      )}

      {/* AI 推断行 */}
      {aiValue && (
        <div className="flex items-start gap-1.5 group">
          {/* 标签：若 HIS 已显示过则留空，否则显示字段名 */}
          <span className="text-2xs text-gray-400 w-14 flex-shrink-0 pt-0.5">
            {!hisValue ? label : ''}
          </span>
          <div className="flex-1 min-w-0">
            <span className={cn(
              'text-xs leading-relaxed text-gray-800',
              multiline ? 'block' : ''
            )}>
              {aiValue}
            </span>
            <AiBadge />
          </div>
          <WriteBtn added={aiAdded} onClick={() => handleWrite(aiValue, setAiAdded)} />
        </div>
      )}

      {/* 加载占位 */}
      {isLoading && !aiValue && !hisValue && (
        <div className="flex items-start gap-1.5">
          <span className="text-2xs text-gray-400 w-14 flex-shrink-0 pt-0.5">{label}</span>
          <span className="text-xs text-gray-300">推断中…</span>
        </div>
      )}

      {/* 空值占位 */}
      {!isLoading && !hisValue && !aiValue && (
        <div className="flex items-start gap-1.5">
          <span className="text-2xs text-gray-400 w-14 flex-shrink-0 pt-0.5">{label}</span>
          <span className="text-xs text-gray-300">—</span>
        </div>
      )}
    </div>
  )
}

/* ── 风险信号区块 ───────────────────────────────────────────────── */
function RiskSignals({ signals, isLoading, isFallback = false }) {
  const [added, setAdded] = useState(false)
  if (isLoading) return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-gray-50">
      <AlertTriangle size={11} className="text-gray-300 flex-shrink-0" />
      <span className="text-2xs text-gray-300">风险信号识别中…</span>
    </div>
  )
  if (!signals?.length) return null

  const handleWrite = () => {
    console.log('[HIS WriteBack]', { label: '风险信号', value: signals.join('、') })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-white border border-border border-l-2 border-l-danger group">
      <AlertTriangle size={11} className="text-danger flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1">
          {signals.map((s, i) => (
            <span key={i} className="text-2xs text-danger font-medium">{s}</span>
          ))}
        </div>
        {isFallback
          ? <span className="inline-flex items-center gap-0.5 text-2xs px-1 py-px rounded-sm mt-0.5
                              text-orange-500 bg-orange-50 border border-orange-200">
              规则识别
            </span>
          : <AiBadge danger />
        }
      </div>
      <WriteBtn added={added} onClick={handleWrite} />
    </div>
  )
}

/* ── AI推断标记 ─────────────────────────────────────────────────── */
function AiBadge({ danger = false }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-2xs px-1 py-px rounded-sm mt-0.5',
      danger
        ? 'text-danger bg-red-50 border border-red-200'
        : 'text-primary bg-primary-50 border border-primary-100'
    )}>
      <Sparkles size={8} />
      AI推断
    </span>
  )
}

/* ── 写入HIS按钮 ─────────────────────────────────────────────────── */
function WriteBtn({ added, onClick }) {
  return (
    <button
      onClick={onClick}
      title="写入 HIS"
      className={cn(
        'flex-shrink-0 mt-0.5 transition-colors',
        added ? 'text-success' : 'text-gray-300 hover:text-primary'
      )}
    >
      {added ? <CheckCircle2 size={13} /> : <PlusCircle size={13} />}
    </button>
  )
}
