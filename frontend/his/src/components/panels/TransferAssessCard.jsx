/**
 * TransferAssessCard — 转诊评估
 *
 * 基于规则引擎对患者临床数据进行病情评级，并给出转诊建议：
 *  危重（critical）→ 即刻转诊至 CCU / 心脏介入科等
 *  急症（urgent）  → 2h 内转专科
 *  待观察（watch） → 24h 内专科评估
 *  稳定（stable）  → 暂无需转诊
 *
 * 支持"发起转诊申请"回写 HIS
 */
import { useState } from 'react'
import { Activity, AlertOctagon, AlertTriangle, Clock,
         ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

/* ── 病情等级配置 ────────────────────────────────────────────── */
const LEVEL_CFG = {
  critical: {
    label:      '危重',
    subLabel:   '建议立即转诊',
    iconBg:     'bg-red-500',
    badgeCls:   'bg-red-50 text-red-600',
    blockAccent:'border-l-4 border-l-danger',
    dot:        'bg-red-500',
    labelColor: 'text-red-600',
    deptCls:    'bg-gray-100 text-gray-600 border border-gray-200',
    btnCls:     'bg-red-500 hover:bg-red-600 text-white',
    Icon:       AlertOctagon,
    iconColor:  'text-red-400',
  },
  urgent: {
    label:      '急症',
    subLabel:   '建议尽快转诊',
    iconBg:     'bg-orange-500',
    badgeCls:   'bg-orange-50 text-orange-600',
    blockAccent:'border-l-4 border-l-warning',
    dot:        'bg-orange-500',
    labelColor: 'text-orange-600',
    deptCls:    'bg-gray-100 text-gray-600 border border-gray-200',
    btnCls:     'bg-orange-500 hover:bg-orange-600 text-white',
    Icon:       AlertTriangle,
    iconColor:  'text-orange-400',
  },
  watch: {
    label:      '待观察',
    subLabel:   '建议专科评估',
    iconBg:     'bg-yellow-500',
    badgeCls:   'bg-amber-50 text-amber-600',
    blockAccent:'border-l-4 border-l-amber-400',
    dot:        'bg-amber-400',
    labelColor: 'text-amber-600',
    deptCls:    'bg-gray-100 text-gray-600 border border-gray-200',
    btnCls:     'bg-amber-400 hover:bg-amber-500 text-white',
    Icon:       Clock,
    iconColor:  'text-amber-400',
  },
  stable: {
    label:      '病情稳定',
    subLabel:   '暂无需紧急转诊',
    iconBg:     'bg-green-500',
    badgeCls:   'bg-green-50 text-green-600',
    blockAccent:'border-l-4 border-l-success',
    dot:        'bg-green-500',
    labelColor: 'text-green-600',
    deptCls:    'bg-gray-100 text-gray-600 border border-gray-200',
    btnCls:     'bg-green-500 hover:bg-green-600 text-white',
    Icon:       CheckCircle2,
    iconColor:  'text-green-400',
  },
}

const LEVEL_ORDER = { critical: 0, urgent: 1, watch: 2, stable: 3 }

/* ── 规则引擎 ────────────────────────────────────────────────── */
const RULES = [

  // ── 危重（critical）─────────────────────────────────────────
  {
    id: 'stemi',
    level: 'critical',
    departments: ['CCU', '心脏介入科'],
    urgency: '即刻',
    check: (p) => p.diagnosis_names?.includes('急性ST段抬高型心肌梗死'),
    evidence: () => ['确诊急性ST段抬高型心肌梗死，需紧急直接PCI，D-to-B目标 ≤ 90 分钟'],
  },
  {
    id: 'troponin_critical',
    level: 'critical',
    departments: ['CCU'],
    urgency: '即刻',
    check: (p) => {
      const lab = p.lab_results?.find(l => l.item_code === 'HSTNT')
      return lab?.is_abnormal && lab.reference_high > 0 && (lab.value / lab.reference_high) >= 10
    },
    evidence: (p) => {
      const lab = p.lab_results?.find(l => l.item_code === 'HSTNT')
      const fold = lab ? Math.round(lab.value / lab.reference_high) : ''
      return [`hs-cTnT ${lab?.value} ${lab?.unit}（超正常上限 ${fold}×），提示大面积心肌坏死`]
    },
  },
  {
    id: 'bnp_severe',
    level: 'critical',
    departments: ['CCU', '心内科'],
    urgency: '即刻',
    check: (p) => {
      const lab = p.lab_results?.find(l => l.item_code === 'NTPROBNP')
      if (!lab?.is_abnormal) return false
      // 年龄分层心衰危重阈值
      const threshold = p.age > 75 ? 3600 : p.age > 50 ? 1800 : 900
      return lab.value >= threshold
    },
    evidence: (p) => {
      const lab = p.lab_results?.find(l => l.item_code === 'NTPROBNP')
      return [`NT-proBNP ${lab?.value} ${lab?.unit}，达到急性心力衰竭诊断阈值`]
    },
  },

  // ── 急症（urgent）───────────────────────────────────────────
  {
    id: 'bnp_elevated',
    level: 'urgent',
    departments: ['心内科'],
    urgency: '2h 内',
    check: (p) => {
      const lab = p.lab_results?.find(l => l.item_code === 'NTPROBNP')
      if (!lab?.is_abnormal) return false
      const urgentThreshold  = p.age > 75 ? 1800 : p.age > 50 ? 900 : 450
      const criticalThreshold = p.age > 75 ? 3600 : p.age > 50 ? 1800 : 900
      return lab.value >= urgentThreshold && lab.value < criticalThreshold
    },
    evidence: (p) => {
      const lab = p.lab_results?.find(l => l.item_code === 'NTPROBNP')
      return [`NT-proBNP ${lab?.value} ${lab?.unit}，超年龄调整参考范围，提示心功能不全`]
    },
  },
  {
    id: 'multi_critical_labs',
    level: 'urgent',
    departments: ['急诊科'],
    urgency: '2h 内',
    check: (p) => {
      const criticals = (p.lab_results || []).filter(l => {
        if (!l.is_abnormal) return false
        const refH = l.reference_high, refL = l.reference_low
        return (
          (l.abnormal_type === 'high' && refH > 0 && l.value / refH >= 3) ||
          (l.abnormal_type === 'low'  && refL > 0 && l.value / refL <= 0.5)
        )
      })
      return criticals.length >= 2
    },
    evidence: (p) => {
      const criticals = (p.lab_results || []).filter(l => {
        if (!l.is_abnormal) return false
        const refH = l.reference_high, refL = l.reference_low
        return (
          (l.abnormal_type === 'high' && refH > 0 && l.value / refH >= 3) ||
          (l.abnormal_type === 'low'  && refL > 0 && l.value / refL <= 0.5)
        )
      })
      return [`${criticals.length} 项检验严重异常（${criticals.map(l => l.item_name).join('、')}），需急诊评估`]
    },
  },
  {
    id: 'troponin_elevated',
    level: 'urgent',
    departments: ['心内科'],
    urgency: '2h 内',
    check: (p) => {
      const lab = p.lab_results?.find(l => l.item_code === 'HSTNT')
      if (!lab?.is_abnormal || !lab.reference_high) return false
      const ratio = lab.value / lab.reference_high
      return ratio >= 2 && ratio < 10
    },
    evidence: (p) => {
      const lab = p.lab_results?.find(l => l.item_code === 'HSTNT')
      return [`hs-cTnT ${lab?.value} ${lab?.unit}，升高提示急性心肌损伤，需进一步排查`]
    },
  },

  // ── 待观察（watch）──────────────────────────────────────────
  {
    id: 'htn_complications',
    level: 'watch',
    departments: ['心内科'],
    urgency: '24h 内',
    check: (p) =>
      p.diagnosis_names?.includes('高血压') &&
      ((p.lab_results || []).some(l => l.is_abnormal) || p.diagnosis_names?.length > 1),
    evidence: () => ['高血压合并异常检验，建议评估靶器官损害（肾功能、眼底、心脏超声）'],
  },
  {
    id: 'dm_uncontrolled',
    level: 'watch',
    departments: ['内分泌科'],
    urgency: '24h 内',
    check: (p) => {
      const glu = p.lab_results?.find(l => l.item_code === 'GLU')
      return p.diagnosis_names?.includes('2型糖尿病') && glu?.is_abnormal && glu.value > 11.1
    },
    evidence: (p) => {
      const glu = p.lab_results?.find(l => l.item_code === 'GLU')
      return [`血糖 ${glu?.value} mmol/L，2型糖尿病血糖控制欠佳，需内分泌科介入`]
    },
  },
]

/* ── 规则引擎执行 ──────────────────────────────────────────────── */
function assess(patient) {
  const triggered = RULES.filter(r => r.check(patient)).map(r => ({
    level:       r.level,
    departments: r.departments,
    urgency:     r.urgency,
    evidence:    r.evidence(patient),
  }))

  if (!triggered.length) {
    return { level: 'stable', departments: [], urgency: '—', evidence: ['各项指标未见明显危急异常'] }
  }

  // 取最高严重级别
  const overallLevel = triggered.reduce((best, cur) =>
    LEVEL_ORDER[cur.level] < LEVEL_ORDER[best] ? cur.level : best,
    'stable'
  )

  // 取最紧迫度（即刻 > 2h内 > 24h内 > —）
  const urgencyOrder = { '即刻': 0, '2h 内': 1, '24h 内': 2, '—': 3 }
  const urgency = triggered.reduce((best, cur) =>
    (urgencyOrder[cur.urgency] ?? 3) < (urgencyOrder[best] ?? 3) ? cur.urgency : best,
    '—'
  )

  // 汇总所有涉及科室（去重）
  const departments = [...new Set(triggered.flatMap(r => r.departments))]

  // 汇总所有依据
  const evidence = triggered.flatMap(r => r.evidence)

  return { level: overallLevel, departments, urgency, evidence }
}

/* ── 主组件 ──────────────────────────────────────────────────── */
export function TransferAssessCard({ defaultOpen = true }) {
  const patient       = usePatientStore(s => s.context)
  const [transferred, setTransferred] = useState(false)

  if (!patient) return null

  const { level, departments, urgency, evidence } = assess(patient)
  const cfg = LEVEL_CFG[level]
  const { Icon } = cfg

  const handleTransfer = () => {
    console.log('[HIS WriteBack] 转诊申请', { level, departments, urgency })
    setTransferred(true)
    setTimeout(() => setTransferred(false), 3000)
  }

  return (
    <CollapsibleCard
      title="转诊评估"
      iconBg={cfg.iconBg}
      icon={<Activity size={11} className="text-white" />}
      extra={
        <span className={cn('text-2xs px-1.5 py-0.5 rounded font-medium mr-1', cfg.badgeCls)}>
          {cfg.label}
        </span>
      }
      defaultOpen={defaultOpen}
    >
      {/* ── 病情等级块 ───────────────────────────────────── */}
      <div className={cn('rounded border border-border bg-white px-3 py-2.5 mb-3', cfg.blockAccent)}>
        <div className="flex items-center gap-2.5">

          {/* 脉冲圆点（危重/急症时跳动）*/}
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            {(level === 'critical' || level === 'urgent') && (
              <span className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-60',
                cfg.dot
              )} />
            )}
            <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', cfg.dot)} />
          </span>

          <div className="flex-1 min-w-0">
            {/* 等级标签 + 副标题 */}
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-bold', cfg.labelColor)}>
                {cfg.label}
              </span>
              <span className="text-xs text-gray-500">{cfg.subLabel}</span>
            </div>

            {/* 目标科室 + 紧迫度 */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {departments.map(d => (
                <span key={d} className={cn('text-2xs px-1.5 py-0.5 rounded-sm font-medium', cfg.deptCls)}>
                  {d}
                </span>
              ))}
              {urgency !== '—' && (
                <span className="flex items-center gap-0.5 text-2xs text-gray-400">
                  <Clock size={9} />
                  {urgency}
                </span>
              )}
            </div>
          </div>

          <Icon size={22} className={cn('flex-shrink-0 opacity-20', cfg.iconColor)} />
        </div>
      </div>

      {/* ── 评估依据 ─────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-2xs text-gray-400 font-medium tracking-wide">评估依据</p>
        {evidence.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1', cfg.dot)} />
            <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
          </div>
        ))}
      </div>

      {/* ── 发起转诊申请 ─────────────────────────────────── */}
      {level !== 'stable' && (
        <button
          onClick={handleTransfer}
          className={cn(
            'mt-3 w-full text-xs py-1.5 rounded-md flex items-center justify-center gap-1.5',
            'font-medium transition-all',
            transferred
              ? 'bg-green-50 text-success border border-green-200'
              : cfg.btnCls
          )}
        >
          {transferred
            ? <><CheckCircle2 size={12} /> 转诊申请已发起</>
            : <><ArrowUpRight  size={12} /> 发起转诊申请</>
          }
        </button>
      )}
    </CollapsibleCard>
  )
}
