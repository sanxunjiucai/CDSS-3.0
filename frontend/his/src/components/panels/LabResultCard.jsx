/**
 * LabResultCard — 检验结果解读（合同 2.6）
 *
 * 三层功能：
 *  ① 查看报告：每项显示数值 + AI临床解读 + 建议处置
 *  ② 多参考值判断：对年龄/性别/诊断特异性项目自动调整判断基准并标注
 *  ③ 下达申请知识：展开可查阅适应症、标本采集、临床意义、注意事项
 */
import { useState } from 'react'
import { FlaskConical, TrendingUp, TrendingDown, Minus,
         ChevronDown, Loader2, Info } from 'lucide-react'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { usePatientStore } from '@/stores/patient'
import { useClinicalContextStore } from '@/stores/clinicalContext'
import { cn } from '@/lib/utils'

/* ── 检验项目知识库（下达申请时展示）───────────────────────────── */
const LAB_KNOWLEDGE = {
  HSTNT: {
    full_name:   '高敏心肌肌钙蛋白T',
    indications: ['急性胸痛鉴别', '急性冠脉综合征', '心肌炎', '心力衰竭'],
    specimen:    '静脉血，EDTA抗凝管，4℃保存',
    significance:'心肌损伤高度特异性标志物，升高提示心肌细胞损伤或坏死',
    precautions: '建议动态检测（0h / 3h / 6h）；肾功能不全患者可见假性升高',
    multi_range: true,
    range_note:  '参考上限因年龄（>65岁阈值更高）及性别不同而异',
  },
  NTPROBNP: {
    full_name:   'N末端B型利钠肽原',
    indications: ['心力衰竭诊断及分级', '呼吸困难鉴别', '心功能评估'],
    specimen:    '静脉血，EDTA抗凝管',
    significance:'心室负荷增加和心肌损伤的标志物，与心衰严重程度正相关',
    precautions: '肾功能不全、高龄可导致升高；肥胖患者可偏低',
    multi_range: true,
    range_note:  '参考范围按年龄分层：<50岁 <450 pg/mL，50-75岁 <900 pg/mL，>75岁 <1800 pg/mL',
  },
  GLU: {
    full_name:   '血糖（葡萄糖）',
    indications: ['糖尿病诊断与监测', '低血糖评估', '围手术期管理'],
    specimen:    '静脉血，氟化钠管；空腹或餐后2h采集',
    significance:'反映即时血糖水平，用于糖尿病诊断、治疗监测及低血糖诊断',
    precautions: '需注明采集时间（空腹/餐后），应激状态可导致一过性升高',
    multi_range: true,
    range_note:  '空腹参考 3.9–6.1 mmol/L；餐后2h参考 < 7.8 mmol/L',
  },
  K: {
    full_name:   '血清钾',
    indications: ['电解质平衡评估', '心律失常评估', '肾功能监测'],
    specimen:    '静脉血，分离胶促凝管；避免溶血',
    significance:'细胞内主要阳离子，参与心肌、神经肌肉电生理，异常可致心律失常',
    precautions: '溶血可致假性升高；握拳采血可致局部升高；利尿剂影响血钾',
    multi_range: false,
    range_note:  '',
  },
}

const DEFAULT_KNOWLEDGE = {
  full_name:   '检验项目',
  indications: ['临床诊断辅助'],
  specimen:    '静脉血',
  significance:'参见检验科说明',
  precautions: '按检验科规范采集',
  multi_range: false,
  range_note:  '',
}

/* ── 严重度样式 ──────────────────────────────────────────────── */
const SEVERITY_CFG = {
  critical:   { accent: 'border-l-2 border-l-danger',   badge: 'bg-red-100 text-danger',        label: '危急' },
  abnormal:   { accent: 'border-l-2 border-l-warning',  badge: 'bg-orange-100 text-warning',    label: '异常' },
  borderline: { accent: 'border-l-2 border-l-amber-400',badge: 'bg-amber-50 text-amber-600',    label: '临界' },
  normal:     { accent: '',                              badge: 'bg-gray-100 text-gray-400',     label: '正常' },
}

/* ── 主组件 ─────────────────────────────────────────────────── */
export function LabResultCard({ defaultOpen = true }) {
  const patient            = usePatientStore(s => s.context)
  const { labInterpretations, isInterpreting } = useClinicalContextStore()

  const allResults  = patient?.lab_results || []
  const abnormals   = allResults.filter(r => r.is_abnormal)
  const normals     = allResults.filter(r => !r.is_abnormal)
  const [showNormal, setShowNormal] = useState(false)

  if (!allResults.length) return null

  // 以 item_code 为 key 快速查找解读
  const interpMap = Object.fromEntries(
    labInterpretations.map(i => [i.item_code, i])
  )

  return (
    <CollapsibleCard
      title="检验结果解读"
      iconBg="bg-orange-500"
      icon={<FlaskConical size={11} className="text-white" />}
      badge={abnormals.length > 0 ? `${abnormals.length} 异常` : undefined}
      defaultOpen={defaultOpen}
      extra={isInterpreting && <Loader2 size={11} className="text-primary animate-spin" />}
    >
      {/* ── 异常项目 ────────────────────────────────────────── */}
      {abnormals.length > 0 ? (
        <div className="space-y-2">
          {abnormals.map((item) => (
            <LabItem
              key={item.item_code}
              item={item}
              interp={interpMap[item.item_code]}
              isInterpreting={isInterpreting}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-success">✓ 全部检验结果正常</p>
      )}

      {/* ── 正常项目（折叠）──────────────────────────────────── */}
      {normals.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowNormal(o => !o)}
            className="flex items-center gap-1 text-2xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown size={11} className={cn('transition-transform', showNormal && 'rotate-180')} />
            {showNormal ? '收起' : `查看 ${normals.length} 项正常结果`}
          </button>
          {showNormal && (
            <div className="mt-1.5 space-y-1">
              {normals.map((item) => (
                <LabItem key={item.item_code} item={item} interp={null} isInterpreting={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </CollapsibleCard>
  )
}

/* ── 单项检验行（可展开查看知识）───────────────────────────────── */
function LabItem({ item, interp, isInterpreting }) {
  const [open, setOpen] = useState(false)

  const isHigh   = item.abnormal_type === 'high'
  const isNormal = !item.is_abnormal
  const severity = interp?.severity || (isNormal ? 'normal' : 'abnormal')
  const cfg      = SEVERITY_CFG[severity] || SEVERITY_CFG.abnormal
  const knowledge = LAB_KNOWLEDGE[item.item_code] || DEFAULT_KNOWLEDGE

  const TrendIcon = isNormal ? Minus : isHigh ? TrendingUp : TrendingDown
  const trendColor = isNormal ? 'text-gray-400' : isHigh ? 'text-danger' : 'text-primary'

  return (
    <div className={cn('rounded border border-border overflow-hidden bg-white', cfg.accent)}>
      {/* ── 数值行（点击展开）──────────────────────────────── */}
      <div
        className="px-2.5 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <TrendIcon size={12} className={cn(trendColor, 'flex-shrink-0')} />

          {/* 项目名 */}
          <span className="text-xs font-medium text-gray-800 flex-1 truncate">
            {item.item_name}
          </span>

          {/* 数值 */}
          <span className={cn('text-xs font-semibold flex-shrink-0', trendColor)}>
            {item.value}
            <span className="font-normal text-gray-500 ml-0.5">{item.unit}</span>
          </span>

          {/* 参考范围 */}
          <span className="text-2xs text-gray-400 flex-shrink-0">
            {item.reference_low}–{item.reference_high}
          </span>

          {/* 严重度标签 */}
          {!isNormal && (
            <span className={cn('text-2xs px-1 py-px rounded-sm font-medium flex-shrink-0', cfg.badge)}>
              {cfg.label}
            </span>
          )}

          {/* 多参考值标注 */}
          {knowledge.multi_range && !isNormal && (
            <Info size={11} className="text-amber-400 flex-shrink-0" title={knowledge.range_note} />
          )}

          <ChevronDown size={11} className={cn('text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
        </div>

        {/* AI解读行（有解读时显示，加载中显示占位）*/}
        {!isNormal && (
          <div className="mt-1 pl-5">
            {isInterpreting && !interp && (
              <div className="flex items-center gap-1 text-2xs text-gray-300">
                <Loader2 size={9} className="animate-spin" />
                解读中…
              </div>
            )}
            {interp && (
              <div className="space-y-0.5">
                <p className="text-2xs text-gray-600 leading-relaxed">{interp.interpretation}</p>
                {interp.action && (
                  <p className="text-2xs text-primary font-medium">→ {interp.action}</p>
                )}
                {interp.adjusted_range && interp.range_note && (
                  <p className="text-2xs text-amber-600">
                    ⚠ {interp.range_note}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 展开：项目知识（下达申请时参考）──────────────────── */}
      {open && (
        <div className="px-2.5 py-2 bg-white border-t border-gray-100 space-y-2">
          <p className="text-2xs font-medium text-gray-500">
            {knowledge.full_name}
          </p>

          <KnowledgeRow label="适应症" value={knowledge.indications.join('、')} />
          <KnowledgeRow label="标本采集" value={knowledge.specimen} />
          <KnowledgeRow label="临床意义" value={knowledge.significance} />
          <KnowledgeRow label="注意事项" value={knowledge.precautions} />

          {knowledge.multi_range && knowledge.range_note && (
            <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-amber-50 border border-amber-100">
              <Info size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-2xs text-amber-700">{knowledge.range_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KnowledgeRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-2xs text-gray-400 w-14 flex-shrink-0">{label}</span>
      <span className="text-2xs text-gray-700 leading-relaxed">{value}</span>
    </div>
  )
}
