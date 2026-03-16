/**
 * 智能预警卡（统一预警入口）
 *
 * 合并来源：
 *   1. 客户端规则 — 过敏史、危急值、异常检验值、实时患者数据规则
 *   2. 后端规则   — 患者上下文变化时自动调用 POST /audit/diagnosis-consistency
 *
 * 以 rule_id 去重，error 优先，其次 warning，最后 info。
 * 医生可逐条「知道了」关闭（本次会话有效）。
 */
import { useState, useEffect, useRef } from 'react'
import { XCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ClipboardCheck, Loader2 } from 'lucide-react'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

/* ── 客户端规则（需要实时患者数据，无法在后端简单替代）─────────────── */

function runClientRules(patient) {
  const findings = []

  // 过敏史（始终最高优先级）
  if (patient.allergies?.length) {
    findings.push({
      id:      'patient_allergies',
      level:   'error',
      tag:     '过敏史',
      title:   patient.allergies.join('、') + ' 过敏',
      content: `患者有【${patient.allergies.join('、')}】过敏史，开药时请注意回避相关药物及同类药物。`,
    })
  }

  // 危急检验值（超正常上限 5 倍以上）
  const critical = (patient.lab_results || []).filter(l =>
    l.is_abnormal && l.reference_high && l.abnormal_type === 'high' &&
    l.value / l.reference_high >= 5
  )
  critical.forEach(l => {
    findings.push({
      id:      `critical_${l.item_code || l.item_name}`,
      level:   'error',
      tag:     '危急值',
      title:   `${l.item_name} ${l.value} ${l.unit ?? ''} ↑↑`,
      content: `【${l.item_name}】${l.value} ${l.unit ?? ''}，超出正常上限约 ${(l.value / l.reference_high).toFixed(0)} 倍，请立即处置。`,
    })
  })

  // 普通异常检验值
  const criticalCodes = new Set(critical.map(l => l.item_code || l.item_name))
  const abnormal = (patient.lab_results || []).filter(
    l => l.is_abnormal && !criticalCodes.has(l.item_code || l.item_name)
  )
  abnormal.forEach(l => {
    findings.push({
      id:      `abnormal_${l.item_code || l.item_name}`,
      level:   'warning',
      tag:     '检验异常',
      title:   `${l.item_name} ${l.abnormal_type === 'high' ? '偏高 ↑' : '偏低 ↓'}`,
      content: `【${l.item_name}】${l.value} ${l.unit ?? ''}（参考 ${l.reference_low}–${l.reference_high}），${l.abnormal_type === 'high' ? '偏高' : '偏低'}，请关注临床意义。`,
    })
  })

  // β受体阻滞剂 × 心动过缓（依赖实时心率数值）
  const hasBradycardia = patient.lab_results?.some(
    l => l.item_name?.includes('心率') && l.value < 60
  )
  const hasBetaBlocker = patient.current_medications?.some(
    m => ['美托洛尔', '比索洛尔', '阿替洛尔'].some(b => m.includes(b))
  )
  if (hasBradycardia && hasBetaBlocker) {
    findings.push({
      id:      'betablocker_bradycardia',
      level:   'warning',
      tag:     '用药禁忌',
      title:   'β受体阻滞剂 × 心动过缓',
      content: '当前心率 < 60 次/分，使用 β受体阻滞剂需谨慎，可能加重心动过缓，建议评估后决定是否继续用药。',
    })
  }

  // STEMI 时间窗提醒
  if (patient.diagnosis_names?.includes('急性ST段抬高型心肌梗死')) {
    findings.push({
      id:      'stemi_dtb_window',
      level:   'info',
      tag:     '时间窗',
      title:   'D-to-B 目标 ≤ 90 分钟',
      content: 'STEMI 首选直接 PCI，从就诊到球囊扩张时间应控制在 90 分钟内。请确认导管室及介入团队是否已通知。',
    })
  }

  return findings
}

/* ── 后端 code → 显示标签映射 ─────────────────────────────────────── */

const CODE_TAG = {
  DRUG_CONTRAINDICATED:     '用药禁忌',
  DRUG_CAUTION:             '用药禁忌',
  DRUG_ALLERGY:             '过敏禁忌',
  REQUIRED_DRUG_MISSING:    '药物缺口',
  RECOMMENDED_DRUG_MISSING: '药物建议',
  REQUIRED_EXAM_MISSING:    '检查缺口',
  RECOMMENDED_EXAM_MISSING: '检查建议',
}

/* ── 样式配置 ─────────────────────────────────────────────────────── */

const LEVEL_CFG = {
  error: {
    Icon:       XCircle,
    iconColor:  'text-danger',
    accent:     'border-l-2 border-l-danger',
    tagBg:      'bg-red-50 text-danger',
    dismissCls: 'text-gray-400 hover:text-danger',
  },
  warning: {
    Icon:       AlertTriangle,
    iconColor:  'text-warning',
    accent:     'border-l-2 border-l-warning',
    tagBg:      'bg-orange-50 text-warning',
    dismissCls: 'text-gray-400 hover:text-warning',
  },
  info: {
    Icon:       Info,
    iconColor:  'text-primary',
    accent:     'border-l-2 border-l-primary',
    tagBg:      'bg-primary-50 text-primary',
    dismissCls: 'text-gray-400 hover:text-primary',
  },
}

/* ── 主组件 ───────────────────────────────────────────────────────── */

export function SmartAlertCard({ defaultOpen = true }) {
  const patient = usePatientStore(s => s.context)

  const [open,            setOpen]            = useState(defaultOpen)
  const [dismissed,       setDismissed]       = useState(new Set())
  const [backendFindings, setBackendFindings] = useState([])
  const [backendLoading,  setBackendLoading]  = useState(false)

  const abortRef = useRef(null)

  // 患者上下文变化时自动调后端审核
  useEffect(() => {
    if (!patient?.diagnosis_names?.length) {
      setBackendFindings([])
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setBackendLoading(true)

    fetch(`${API_BASE}/audit/diagnosis-consistency`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patient.patient_id,
        diagnoses:  patient.diagnosis_names      || [],
        drug_names: patient.current_medications  || [],
        exam_names: [],
      }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(json => {
        const findings = (json.data?.warnings || []).map(w => ({
          id:      w.rule_id,
          level:   w.level,
          tag:     CODE_TAG[w.code] || w.code,
          title:   w.message,
          content: w.suggestion,
        }))
        setBackendFindings(findings)
      })
      .catch(err => {
        if (err.name !== 'AbortError') setBackendFindings([])
      })
      .finally(() => setBackendLoading(false))

    return () => controller.abort()
  }, [
    patient?.patient_id,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    patient?.diagnosis_names?.join(','),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    patient?.current_medications?.join(','),
  ])

  if (!patient) return null

  // 合并：客户端 + 后端（rule_id 去重），按严重度排序
  const clientFindings = runClientRules(patient)
  const clientIds      = new Set(clientFindings.map(f => f.id))
  const allFindings    = [
    ...clientFindings,
    ...backendFindings.filter(f => !clientIds.has(f.id)),
  ].sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2 }
    return (order[a.level] ?? 9) - (order[b.level] ?? 9)
  })

  const visibleFindings = allFindings.filter(f => !dismissed.has(f.id))

  if (!allFindings.length && !backendLoading) return null

  const errorCount   = visibleFindings.filter(f => f.level === 'error').length
  const warningCount = visibleFindings.filter(f => f.level === 'warning').length

  const dismiss = (id) => setDismissed(prev => new Set([...prev, id]))

  return (
    <div className="border-b border-border bg-white">

      {/* ── 卡片头 ─────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2
                   hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-5 h-5 rounded bg-amber-400 flex items-center justify-center flex-shrink-0">
          <ClipboardCheck size={11} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-800 flex-1">智能预警</span>

        {backendLoading && (
          <Loader2 size={11} className="text-gray-300 animate-spin flex-shrink-0" />
        )}

        {!backendLoading && visibleFindings.length > 0 && (
          <div className="flex items-center gap-1">
            {errorCount > 0 && (
              <span className="text-2xs bg-red-100 text-danger px-1.5 py-0.5 rounded-full font-medium">
                ❌ {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-2xs bg-orange-100 text-warning px-1.5 py-0.5 rounded-full font-medium">
                ⚠ {warningCount}
              </span>
            )}
          </div>
        )}

        {!backendLoading && visibleFindings.length === 0 && allFindings.length > 0 && (
          <span className="text-2xs text-success">✓ 已全部确认</span>
        )}

        {open
          ? <ChevronUp   size={13} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
        }
      </button>

      {/* ── 展开内容 ────────────────────────────────────────── */}
      {open && (
        <div className="px-3 pb-3 space-y-2">

          {backendLoading && !allFindings.length && (
            <div className="flex items-center gap-2 py-3 text-gray-300">
              <Loader2 size={13} className="animate-spin" />
              <span className="text-2xs">正在审核诊断合理性…</span>
            </div>
          )}

          {!backendLoading && visibleFindings.length === 0 && (
            <p className="text-2xs text-success text-center py-2">✓ 无预警信息</p>
          )}

          {visibleFindings.map(finding => {
            const cfg  = LEVEL_CFG[finding.level]
            const Icon = cfg.Icon
            return (
              <div
                key={finding.id}
                className={cn('rounded border border-border bg-white px-2.5 py-2 space-y-1', cfg.accent)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Icon size={12} className={cn(cfg.iconColor, 'flex-shrink-0')} />
                    <span className={cn('text-2xs font-medium px-1 py-0.5 rounded flex-shrink-0', cfg.tagBg)}>
                      {finding.tag}
                    </span>
                    <span className="text-xs font-medium text-gray-800 truncate">
                      {finding.title}
                    </span>
                  </div>
                  <button
                    onClick={() => dismiss(finding.id)}
                    className={cn('text-2xs flex-shrink-0 transition-colors whitespace-nowrap', cfg.dismissCls)}
                  >
                    知道了
                  </button>
                </div>
                <p className="text-2xs text-gray-600 leading-relaxed pl-4">
                  {finding.content}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
