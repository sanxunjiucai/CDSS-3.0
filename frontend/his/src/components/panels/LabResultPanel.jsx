import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

// Mock 解读内容（后续对接 /v1/lab-result/interpret）
const INTERPRETATIONS = {
  HSTNT: {
    clinical_meaning: '高敏肌钙蛋白T（hs-cTnT）是心肌损伤的高灵敏度标志物。当前值 0.85 ng/mL 显著高于正常上限（0.014 ng/mL），提示存在急性心肌损伤，结合症状高度怀疑急性心肌梗死。',
    suggestions: ['立即复查hs-cTnT（2小时后）', '急查12导联心电图', '启动急性胸痛诊疗流程', '心内科会诊'],
    severity: 'critical',
  },
  NTPROBNP: {
    clinical_meaning: 'NT-proBNP是心力衰竭的重要标志物。当前值 3200 pg/mL（正常<125 pg/mL），提示存在心功能不全，结合临床症状考虑心力衰竭可能。',
    suggestions: ['完善超声心动图', '监测液体平衡', '心内科会诊评估心功能', '限制液体入量'],
    severity: 'high',
  },
  GLU: {
    clinical_meaning: '空腹血糖 9.2 mmol/L，高于正常范围（3.9–6.1 mmol/L）。患者有2型糖尿病病史，当前血糖控制欠佳。应激状态（急性心梗）可进一步升高血糖水平。',
    suggestions: ['监测血糖 q4h', '暂停二甲双胍（急性期）', '内分泌科会诊', '根据血糖水平调整胰岛素方案'],
    severity: 'moderate',
  },
}

const SEVERITY_CONFIG = {
  critical: { label: '危急', color: 'text-danger', bg: 'bg-red-50', border: 'border-red-200' },
  high:     { label: '异常↑', color: 'text-warning', bg: 'bg-orange-50', border: 'border-orange-200' },
  moderate: { label: '偏高', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  low:      { label: '偏低', color: 'text-primary', bg: 'bg-primary-50', border: 'border-primary-200' },
  normal:   { label: '正常', color: 'text-success', bg: 'bg-green-50', border: 'border-green-200' },
}

export function LabResultPanel() {
  const patient = usePatientStore(s => s.context)
  const [loadingItem, setLoadingItem] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)
  const [interpretations, setInterpretations] = useState({})

  const labResults = patient?.lab_results || []

  const handleInterpret = async (item) => {
    const code = item.item_code
    if (interpretations[code]) {
      setExpandedItem(prev => prev === code ? null : code)
      return
    }
    setLoadingItem(code)
    setExpandedItem(null)
    // 模拟接口请求
    await new Promise(r => setTimeout(r, 700))
    const result = INTERPRETATIONS[code] || {
      clinical_meaning: `${item.item_name}当前值${item.value}${item.unit}，${
        item.is_abnormal ? '超出正常参考范围' : '在正常参考范围内'
      }。建议结合临床综合评估。`,
      suggestions: ['结合临床综合分析', '必要时复查'],
      severity: item.is_abnormal
        ? (item.abnormal_type === 'high' ? 'high' : 'low')
        : 'normal',
    }
    setInterpretations(prev => ({ ...prev, [code]: result }))
    setLoadingItem(null)
    setExpandedItem(code)
  }

  if (!labResults.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-xs">暂无检验数据</p>
      </div>
    )
  }

  const abnormals = labResults.filter(r => r.is_abnormal)
  const normals = labResults.filter(r => !r.is_abnormal)

  return (
    <div className="flex flex-col h-full">
      {/* 页头 */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">检验解读</h2>
        <p className="text-2xs text-gray-400">
          共 {labResults.length} 项，其中异常 {abnormals.length} 项
        </p>
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
                  isLoading={loadingItem === item.item_code}
                  isExpanded={expandedItem === item.item_code}
                  interpretation={interpretations[item.item_code]}
                  onInterpret={() => handleInterpret(item)}
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
              {normals.map(item => (
                <NormalResultRow key={item.item_code} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function LabResultItemRow({ item, isLoading, isExpanded, interpretation, onInterpret }) {
  const isHigh = item.abnormal_type === 'high'
  const cfg = SEVERITY_CONFIG[interpretation?.severity ?? (isHigh ? 'high' : 'low')]
  const Icon = isHigh ? TrendingUp : TrendingDown

  return (
    <div className={cn('rounded border overflow-hidden', cfg.border)}>
      {/* 主行 */}
      <div className={cn('flex items-center gap-2 px-2.5 py-2', cfg.bg)}>
        <Icon size={13} className={cfg.color} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-800">{item.item_name}</span>
            <span className={cn(
              'text-2xs px-1 py-0.5 rounded-sm font-medium',
              cfg.bg, cfg.color, 'border', cfg.border
            )}>
              {isHigh ? '↑' : '↓'} {cfg.label}
            </span>
          </div>
          <p className="text-2xs text-gray-500">
            参考值：{item.reference_low}–{item.reference_high} {item.unit}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className={cn('text-sm font-bold', cfg.color)}>
            {item.value}
          </p>
          <p className="text-2xs text-gray-400">{item.unit}</p>
        </div>
      </div>

      {/* 解读按钮 */}
      <div className="border-t border-inherit">
        <button
          onClick={onInterpret}
          disabled={isLoading}
          className="w-full flex items-center justify-between px-2.5 py-1.5
                     text-2xs text-primary hover:bg-primary-50 transition-colors"
        >
          <span>{isLoading ? '解读中...' : interpretation ? '查看临床解读' : '点击获取临床解读'}</span>
          {isLoading
            ? <Loader2 size={11} className="animate-spin" />
            : isExpanded
              ? <ChevronUp size={11} />
              : <ChevronDown size={11} />
          }
        </button>

        {/* 解读内容 */}
        {isExpanded && interpretation && (
          <div className="px-2.5 pb-2.5 space-y-2 border-t border-inherit bg-white">
            <p className="text-xs text-gray-700 leading-relaxed pt-2">
              {interpretation.clinical_meaning}
            </p>

            {interpretation.suggestions?.length > 0 && (
              <div>
                <p className="text-2xs font-medium text-gray-500 mb-1">建议处理：</p>
                <ul className="space-y-0.5">
                  {interpretation.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-2xs text-gray-700">
                      <span className="w-3.5 h-3.5 rounded-full bg-primary-50 text-primary
                                       flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
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
