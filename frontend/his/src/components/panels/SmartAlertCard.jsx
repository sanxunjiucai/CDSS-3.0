/**
 * 诊断合理性审核卡
 * PRD #20：开单/开药前审核诊断与处置一致性
 *
 * 三类规则：
 *  1. 诊断 × 当前用药 → 矛盾/禁忌
 *  2. 诊断 → 必要检查缺口
 *  3. 诊断 → 时间窗提醒
 *
 * 严重度：error（必须处理）/ warning（建议处理）/ info（知悉）
 * 医生可逐条"知道了"关闭（本次会话有效）
 */
import { useState } from 'react'
import { XCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

/* ── 规则引擎 ────────────────────────────────────────────────── */

const RULES = [
  // ── 类型1：诊断 × 用药禁忌 ────────────────────────────────
  {
    id: 'metformin_stemi',
    level: 'warning',
    tag: '用药禁忌',
    check: (p) =>
      p.diagnosis_names?.includes('急性ST段抬高型心肌梗死') &&
      p.current_medications?.some(m => m.includes('二甲双胍')),
    title: '建议暂停二甲双胍',
    content: 'STEMI 急性期肾灌注不稳定，二甲双胍有乳酸酸中毒风险。建议改用胰岛素控制血糖，请内分泌科会诊。',
  },
  {
    id: 'nsaid_stemi',
    level: 'error',
    tag: '用药禁忌',
    check: (p) =>
      p.diagnosis_names?.includes('急性ST段抬高型心肌梗死') &&
      p.current_medications?.some(m => ['布洛芬', '吲哚美辛', '双氯芬酸', 'NSAIDs'].some(n => m.includes(n))),
    title: 'NSAIDs 禁用于 STEMI',
    content: 'NSAIDs 可增加 STEMI 患者死亡率及心衰风险，应立即停用，考虑替代镇痛方案（如吗啡）。',
  },
  {
    id: 'allergy_med_conflict',
    level: 'error',
    tag: '过敏禁忌',
    check: (p) => {
      const allergies = p.allergies || []
      const meds = p.current_medications || []
      if (!allergies.length || !meds.length) return false
      return allergies.some(a =>
        meds.some(m => m.includes(a.replace(/过敏$/, '')) || a.includes(m.split(/[\d\s]/)[0]))
      )
    },
    title: (p) => {
      const allergies = p.allergies || []
      const meds = p.current_medications || []
      const conflict = meds.find(m =>
        allergies.some(a => m.includes(a.replace(/过敏$/, '')))
      )
      return `用药含过敏成分：${conflict || '请核查'}`
    },
    content: (p) => {
      const allergies = p.allergies || []
      return `患者有【${allergies.join('、')}】过敏史，当前用药可能含相关成分，请立即核查并替换。`
    },
  },
  {
    id: 'betablocker_bradycardia',
    level: 'warning',
    tag: '用药禁忌',
    check: (p) => {
      const hasBradycardia = p.lab_results?.some(
        l => l.item_name?.includes('心率') && l.value < 60
      )
      const hasBetaBlocker = p.current_medications?.some(
        m => ['美托洛尔', '比索洛尔', '阿替洛尔'].some(b => m.includes(b))
      )
      return hasBradycardia && hasBetaBlocker
    },
    title: 'β受体阻滞剂 × 心动过缓',
    content: '当前心率 < 60 次/分，使用 β受体阻滞剂需谨慎，可能加重心动过缓，建议评估后决定是否继续用药。',
  },

  // ── 类型2：诊断 → 必要检查缺口 ───────────────────────────
  {
    id: 'stemi_echo_missing',
    level: 'warning',
    tag: '检查缺口',
    check: (p) => {
      if (!p.diagnosis_names?.includes('急性ST段抬高型心肌梗死')) return false
      const labNames = (p.lab_results || []).map(l => l.item_name || '')
      return !labNames.some(n => n.includes('超声') || n.includes('心动图') || n.includes('ECHO'))
    },
    title: '超声心动图（LVEF 评估）尚未完成',
    content: 'STEMI 标准诊疗路径要求评估 LVEF 及室壁运动异常。建议血流动力学稳定后尽快开具床旁超声心动图。',
  },
  {
    id: 'stemi_troponin_missing',
    level: 'warning',
    tag: '检查缺口',
    check: (p) => {
      if (!p.diagnosis_names?.includes('急性ST段抬高型心肌梗死')) return false
      const labNames = (p.lab_results || []).map(l => l.item_name || '')
      return !labNames.some(n => n.includes('肌钙蛋白') || n.includes('TNI') || n.includes('TNT'))
    },
    title: '肌钙蛋白尚未检测',
    content: '肌钙蛋白（cTnI/cTnT）是 STEMI 诊断及梗死面积评估的关键指标，建议立即开具动态检测。',
  },
  {
    id: 'dm_hba1c_missing',
    level: 'info',
    tag: '检查建议',
    check: (p) => {
      if (!p.diagnosis_names?.includes('2型糖尿病')) return false
      const labNames = (p.lab_results || []).map(l => l.item_name || '')
      return !labNames.some(n => n.includes('糖化') || n.includes('HbA1c'))
    },
    title: '糖化血红蛋白（HbA1c）未检测',
    content: '糖尿病患者建议检测 HbA1c 评估近3个月血糖控制情况，辅助制定降糖方案。',
  },

  // ── 类型3：时间窗提醒 ─────────────────────────────────────
  {
    id: 'stemi_dtb_window',
    level: 'info',
    tag: '时间窗',
    check: (p) => p.diagnosis_names?.includes('急性ST段抬高型心肌梗死'),
    title: 'D-to-B 目标 ≤ 90 分钟',
    content: 'STEMI 首选直接 PCI，从就诊到球囊扩张时间应控制在 90 分钟内。请确认导管室及介入团队是否已通知。',
  },
  {
    id: 'stemi_antiplatelet_timing',
    level: 'info',
    tag: '时间窗',
    check: (p) =>
      p.diagnosis_names?.includes('急性ST段抬高型心肌梗死') &&
      !p.current_medications?.some(m => ['阿司匹林', '氯吡格雷', '替格瑞洛'].some(d => m.includes(d))),
    title: '抗血小板药物尚未使用',
    content: 'STEMI 患者应尽早启动双联抗血小板治疗（阿司匹林 + P2Y12 抑制剂），尽量在 PCI 前给药。',
  },
]

/* ── 工具函数 ────────────────────────────────────────────────── */

function resolve(fieldOrFn, patient) {
  return typeof fieldOrFn === 'function' ? fieldOrFn(patient) : fieldOrFn
}

function runRules(patient) {
  return RULES
    .filter(r => r.check(patient))
    .map(r => ({
      id:      r.id,
      level:   r.level,
      tag:     resolve(r.tag,     patient),
      title:   resolve(r.title,   patient),
      content: resolve(r.content, patient),
    }))
}

/* ── 样式配置 ────────────────────────────────────────────────── */

const LEVEL_CFG = {
  error: {
    icon:        XCircle,
    iconColor:   'text-danger',
    bg:          'bg-red-50',
    border:      'border-red-200',
    tagBg:       'bg-red-100 text-danger',
    dismissCls:  'text-danger/70 hover:text-danger',
  },
  warning: {
    icon:        AlertTriangle,
    iconColor:   'text-warning',
    bg:          'bg-orange-50',
    border:      'border-orange-200',
    tagBg:       'bg-orange-100 text-warning',
    dismissCls:  'text-warning/70 hover:text-warning',
  },
  info: {
    icon:        Info,
    iconColor:   'text-primary',
    bg:          'bg-blue-50',
    border:      'border-blue-200',
    tagBg:       'bg-blue-100 text-primary',
    dismissCls:  'text-primary/60 hover:text-primary',
  },
}

/* ── 主组件 ──────────────────────────────────────────────────── */

export function SmartAlertCard({ defaultOpen = true }) {
  const patient  = usePatientStore(s => s.context)
  const [open,      setOpen]      = useState(defaultOpen)
  const [dismissed, setDismissed] = useState(new Set())

  if (!patient) return null

  const allFindings  = runRules(patient)
  const findings     = allFindings.filter(f => !dismissed.has(f.id))

  if (!allFindings.length) return null

  const dismiss = (id) => setDismissed(prev => new Set([...prev, id]))

  const errorCount   = findings.filter(f => f.level === 'error').length
  const warningCount = findings.filter(f => f.level === 'warning').length

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
        <span className="text-xs font-semibold text-gray-800 flex-1">诊断合理性审核</span>

        {/* 未关闭数量 */}
        {findings.length > 0 && (
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

        {findings.length === 0 && allFindings.length > 0 && (
          <span className="text-2xs text-success">✓ 已全部确认</span>
        )}

        {open
          ? <ChevronUp size={13} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
        }
      </button>

      {/* ── 展开内容 ────────────────────────────────────────── */}
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {findings.length === 0 ? (
            <p className="text-2xs text-success text-center py-2">
              ✓ 无诊断合理性问题
            </p>
          ) : (
            // error 优先，其次 warning，最后 info
            [...findings]
              .sort((a, b) => {
                const order = { error: 0, warning: 1, info: 2 }
                return order[a.level] - order[b.level]
              })
              .map(finding => {
                const cfg  = LEVEL_CFG[finding.level]
                const Icon = cfg.icon
                return (
                  <div
                    key={finding.id}
                    className={cn(
                      'rounded border px-2.5 py-2 space-y-1',
                      cfg.bg, cfg.border
                    )}
                  >
                    {/* 标题行 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <Icon size={12} className={cn(cfg.iconColor, 'flex-shrink-0')} />
                        <span className={cn(
                          'text-2xs font-medium px-1 py-0.5 rounded flex-shrink-0',
                          cfg.tagBg
                        )}>
                          {finding.tag}
                        </span>
                        <span className="text-xs font-medium text-gray-800 truncate">
                          {finding.title}
                        </span>
                      </div>
                      {/* 知道了 */}
                      <button
                        onClick={() => dismiss(finding.id)}
                        className={cn(
                          'text-2xs flex-shrink-0 transition-colors whitespace-nowrap',
                          cfg.dismissCls
                        )}
                      >
                        知道了
                      </button>
                    </div>

                    {/* 内容 */}
                    <p className="text-2xs text-gray-600 leading-relaxed pl-4">
                      {finding.content}
                    </p>
                  </div>
                )
              })
          )}
        </div>
      )}
    </div>
  )
}
