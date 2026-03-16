import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { usePatientStore } from '@/stores/patient'
import { useClinicalContextStore } from '@/stores/clinicalContext'
import { cn } from '@/lib/utils'

/* ── 兜底 hardcoded 解读（GLM 失败时的降级）──────────────── */
const FALLBACK_INTERPRETATIONS = {
  HSTNT: {
    severity: 'critical',
    interpretation: '高敏肌钙蛋白T显著升高，提示急性心肌损伤，结合症状高度怀疑急性心肌梗死',
    action: '立即复查（2h后）+ 急查心电图 + 心内科会诊',
    adjusted_range: false,
  },
  NTPROBNP: {
    severity: 'abnormal',
    interpretation: 'NT-proBNP显著升高，提示心功能不全，结合临床考虑心力衰竭可能',
    action: '完善超声心动图 + 限制液体 + 心内科会诊',
    adjusted_range: false,
  },
  GLU: {
    severity: 'abnormal',
    interpretation: '空腹血糖偏高，糖尿病患者应激状态下血糖可进一步升高',
    action: '监测血糖 q4h，急性期暂停二甲双胍，内分泌科会诊',
    adjusted_range: false,
  },
}

const SEVERITY_CONFIG = {
  critical:   { label: '危急',  color: 'text-danger',    accent: 'border-l-2 border-l-danger'  },
  abnormal:   { label: '异常',  color: 'text-warning',   accent: 'border-l-2 border-l-warning' },
  borderline: { label: '临界',  color: 'text-amber-500', accent: 'border-l-2 border-l-amber-400' },
  high:       { label: '偏高↑', color: 'text-warning',   accent: 'border-l-2 border-l-warning' },
  low:        { label: '偏低↓', color: 'text-primary',   accent: 'border-l-2 border-l-primary' },
  normal:     { label: '正常',  color: 'text-success',   accent: ''                            },
}

export function LabResultPanel() {
  const patient = usePatientStore(s => s.context)
  const { labInterpretations, isInterpreting } = useClinicalContextStore()

  const [expandedItem, setExpandedItem] = useState(null)

  const labResults = patient?.lab_results || []

  /* 按 item_code 建立 GLM 解读查找表 */
  const glmMap = {}
  labInterpretations.forEach(i => {
    glmMap[i.item_code] = i
    glmMap[i.item_name] = i   // 也用 item_name 匹配
  })

  /* 获取某项检验的解读（GLM 优先，否则 hardcoded，否则 generic） */
  const getInterpretation = (item) => {
    const glm = glmMap[item.item_code] || glmMap[item.item_name]
    if (glm) return { ...glm, _source: 'glm' }

    const fallback = FALLBACK_INTERPRETATIONS[item.item_code]
    if (fallback) return { ...fallback, _source: 'fallback' }

    return {
      severity:       item.is_abnormal ? (item.abnormal_type === 'high' ? 'high' : 'low') : 'normal',
      interpretation: `${item.item_name}当前值 ${item.value}${item.unit}，${item.is_abnormal ? '超出正常参考范围' : '在正常参考范围内'}。建议结合临床综合评估。`,
      action:         '结合临床综合分析，必要时复查',
      adjusted_range: false,
      _source:        'generic',
    }
  }

  if (!labResults.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-xs">暂无检验数据</p>
      </div>
    )
  }

  const abnormals = labResults.filter(r => r.is_abnormal)
  const normals   = labResults.filter(r => !r.is_abnormal)

  return (
    <div className="flex flex-col h-full">
      {/* 页头 */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">检验解读</h2>
        <div className="flex items-center gap-1.5">
          <p className="text-2xs text-gray-400">
            共 {labResults.length} 项，其中异常 {abnormals.length} 项
          </p>
          {isInterpreting && (
            <span className="flex items-center gap-1 text-2xs text-primary">
              <Loader2 size={10} className="animate-spin" />AI解读中…
            </span>
          )}
          {!isInterpreting && labInterpretations.length > 0 && (
            <span className="text-2xs text-success">✓ AI解读已就绪</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 异常指标 */}
        {abnormals.length > 0 && (
          <section>
            <p className="text-2xs font-medium text-gray-500 mb-1.5">
              ⚠ 异常指标（{abnormals.length}）
            </p>
            <div className="space-y-2">
              {abnormals.map(item => (
                <LabResultItemRow
                  key={item.item_code}
                  item={item}
                  interpretation={getInterpretation(item)}
                  isInterpreting={isInterpreting}
                  isExpanded={expandedItem === item.item_code}
                  onToggle={() => setExpandedItem(
                    prev => prev === item.item_code ? null : item.item_code
                  )}
                />
              ))}
            </div>
          </section>
        )}

        {/* 正常指标 */}
        {normals.length > 0 && (
          <section>
            <p className="text-2xs font-medium text-gray-500 mb-1.5">
              ✓ 正常指标（{normals.length}）
            </p>
            <div className="space-y-1.5">
              {normals.map(item => <NormalResultRow key={item.item_code} item={item} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function LabResultItemRow({ item, interpretation, isInterpreting, isExpanded, onToggle }) {
  const isHigh = item.abnormal_type === 'high'
  const Icon   = isHigh ? TrendingUp : TrendingDown
  const cfg    = SEVERITY_CONFIG[interpretation?.severity ?? (isHigh ? 'high' : 'low')]

  return (
    <div className={cn('rounded border border-border overflow-hidden bg-white', cfg.accent)}>
      {/* 主行 */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        <Icon size={13} className={cfg.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-800">{item.item_name}</span>
            <span className={cn('text-2xs px-1 py-0.5 rounded-sm font-medium', cfg.color)}>
              {isHigh ? '↑' : '↓'} {cfg.label}
            </span>
          </div>
          <p className="text-2xs text-gray-500">
            参考值：{item.reference_low}–{item.reference_high} {item.unit}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn('text-sm font-bold', cfg.color)}>{item.value}</p>
          <p className="text-2xs text-gray-400">{item.unit}</p>
        </div>
      </div>

      {/* 解读按钮 */}
      <div className="border-t border-inherit">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-2.5 py-1.5
                     text-2xs text-primary hover:bg-primary-50 transition-colors"
        >
          <span>
            {isInterpreting && !interpretation._source
              ? 'AI 解读中…'
              : isExpanded ? '收起解读' : '查看临床解读'}
          </span>
          {isInterpreting && !interpretation._source
            ? <Loader2 size={11} className="animate-spin" />
            : isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />
          }
        </button>

        {isExpanded && (
          <div className="px-2.5 pb-2.5 space-y-2 border-t border-border bg-white">
            <p className="text-xs text-gray-700 leading-relaxed pt-2">
              {interpretation.interpretation}
            </p>
            {interpretation.adjusted_range && interpretation.range_note && (
              <p className="text-2xs text-primary bg-primary-50 rounded px-2 py-1">
                ℹ {interpretation.range_note}
              </p>
            )}
            {interpretation.action && (
              <div>
                <p className="text-2xs font-medium text-gray-500 mb-1">建议处理：</p>
                <p className="text-2xs text-gray-700 bg-gray-50 rounded px-2 py-1.5">
                  {interpretation.action}
                </p>
              </div>
            )}
            {interpretation._source === 'glm' && (
              <p className="text-2xs text-primary/60">✦ AI 个性化解读</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NormalResultRow({ item }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 rounded border border-border bg-gray-50">
      <div className="flex items-center gap-1.5">
        <Minus size={11} className="text-success" />
        <span className="text-xs text-gray-700">{item.item_name}</span>
      </div>
      <div className="text-right">
        <span className="text-xs font-medium text-gray-800">{item.value}</span>
        <span className="text-2xs text-gray-400 ml-1">{item.unit}</span>
        <span className="text-2xs text-gray-400 ml-1">
          ({item.reference_low}–{item.reference_high})
        </span>
      </div>
    </div>
  )
}
