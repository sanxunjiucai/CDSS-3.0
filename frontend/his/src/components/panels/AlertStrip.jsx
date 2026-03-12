import { AlertTriangle, Info, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

/**
 * 始终置顶的单行预警摘要条（不可折叠）
 * 点击可展开全部预警列表
 */
export function AlertStrip() {
  const patient = usePatientStore(s => s.context)
  const [expanded, setExpanded] = useState(false)

  if (!patient) return null

  const alerts = buildAlerts(patient)
  if (!alerts.length) return null

  const dangerAlerts  = alerts.filter(a => a.type === 'danger')
  const warningAlerts = alerts.filter(a => a.type === 'warning')
  const infoAlerts    = alerts.filter(a => a.type === 'info')

  return (
    <div className="flex-shrink-0 border-b border-border">

      {/* ── 单行摘要 ─────────────────────────────────── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5
                   bg-amber-50 hover:bg-amber-100 transition-colors text-left"
      >
        <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />

        {/* 危急/过敏 pills */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
          {dangerAlerts.map((a, i) => (
            <span
              key={i}
              className="text-2xs bg-red-100 text-danger border border-red-200
                         px-1.5 py-0.5 rounded-sm font-medium flex-shrink-0"
            >
              {a.tag}：{a.short}
            </span>
          ))}
          {warningAlerts.slice(0, 2).map((a, i) => (
            <span
              key={i}
              className="text-2xs bg-orange-100 text-warning border border-orange-200
                         px-1.5 py-0.5 rounded-sm font-medium flex-shrink-0"
            >
              {a.short}
            </span>
          ))}
          {warningAlerts.length > 2 && (
            <span className="text-2xs text-gray-500 flex-shrink-0">
              +{warningAlerts.length - 2}项异常
            </span>
          )}
          {infoAlerts.length > 0 && (
            <span className="text-2xs text-primary flex-shrink-0">
              {infoAlerts.length}条提示
            </span>
          )}
        </div>

        <ChevronRight
          size={12}
          className={cn(
            'text-gray-400 flex-shrink-0 transition-transform',
            expanded && 'rotate-90'
          )}
        />
      </button>

      {/* ── 展开详情 ─────────────────────────────────── */}
      {expanded && (
        <div className="px-2.5 py-2 space-y-1.5 bg-white border-t border-amber-100">
          {alerts.map((alert, i) => {
            const cfg = ALERT_STYLES[alert.type]
            const Icon = cfg.icon
            return (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2 rounded px-2 py-1.5 border text-xs',
                  cfg.bg, cfg.border
                )}
              >
                <Icon size={12} className={cn(cfg.iconColor, 'flex-shrink-0 mt-0.5')} />
                <div>
                  <span className={cn('font-medium mr-1', cfg.iconColor)}>[{alert.tag}]</span>
                  <span className="text-gray-700">{alert.content}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── helpers ─────────────────────── */

function buildAlerts(patient) {
  const alerts = []

  // 过敏（最高优先级）
  if (patient.allergies?.length) {
    alerts.push({
      type: 'danger',
      tag: '过敏',
      short: `${patient.allergies.join('、')}过敏`,
      content: `患者有【${patient.allergies.join('、')}】过敏史，开药时请注意回避相关药物及同类药物。`,
    })
  }

  // 危急检验值
  const critical = (patient.lab_results || []).filter(l => {
    if (!l.is_abnormal || !l.reference_high) return false
    return l.abnormal_type === 'high' && l.value / l.reference_high >= 5
  })
  critical.forEach(l => {
    alerts.push({
      type: 'danger',
      tag: '危急值',
      short: `${l.item_name} ${l.abnormal_type === 'high' ? '↑' : '↓'}${l.value}`,
      content: `【${l.item_name}】${l.value} ${l.unit}，超出正常上限 ${(l.value / l.reference_high).toFixed(0)} 倍，请立即处置。`,
    })
  })

  // 普通异常检验值
  const abnormal = (patient.lab_results || []).filter(
    l => l.is_abnormal && !critical.find(c => c.item_code === l.item_code)
  )
  abnormal.forEach(l => {
    alerts.push({
      type: 'warning',
      tag: '检验',
      short: `${l.item_name}${l.abnormal_type === 'high' ? '↑' : '↓'}`,
      content: `【${l.item_name}】${l.value} ${l.unit}（参考 ${l.reference_low}–${l.reference_high}），${l.abnormal_type === 'high' ? '偏高' : '偏低'}，请关注临床意义。`,
    })
  })

  // 转诊评估（危急值 or 高风险诊断时触发）
  const highRiskDx = ['急性ST段抬高型心肌梗死', '主动脉夹层', '肺栓塞']
  const hasHighRiskDx = (patient.diagnosis_names || []).some(d => highRiskDx.includes(d))
  if (hasHighRiskDx || critical.length > 0) {
    alerts.push({
      type: 'danger',
      tag: '转诊评估',
      short: '建议转诊',
      content: '当前病情危急，建议尽快联系心血管内科/CCU 会诊或转诊，由上级医师参与决策。',
    })
  }

  // 诊断相关提示
  if (patient.diagnosis_names?.includes('急性ST段抬高型心肌梗死')) {
    alerts.push({
      type: 'info',
      tag: '提示',
      short: 'D-to-B<90min',
      content: 'STEMI 首选 PCI，目标 door-to-balloon ≤ 90 分钟。若无 PCI 条件，考虑溶栓治疗并启动转运。',
    })
  }

  return alerts
}

const ALERT_STYLES = {
  danger:  { bg: 'bg-red-50',    border: 'border-red-200',    icon: AlertTriangle, iconColor: 'text-danger'  },
  warning: { bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle, iconColor: 'text-warning' },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: Info,          iconColor: 'text-primary' },
}
