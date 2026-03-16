import { HeartPulse, ChevronRight, Star, BookOpen, PlusCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { Badge } from '@/components/ui/badge'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

// Mock 治疗方案数据（后续接 /v1/treatment 接口）
const TREATMENT_DATA = {
  '急性ST段抬高型心肌梗死': {
    western: [
      {
        label: '方案一',
        tag: '抗凝治疗',
        isFirst: true,
        content: '双联抗血小板治疗（阿司匹林 + P2Y12 抑制剂）联合低分子肝素抗凝，适用于所有无禁忌证的 STEMI 患者，需尽早启动。',
        drugs: ['阿司匹林 100mg', '氯吡格雷 75mg', '低分子肝素'],
        guideline: { title: 'STEMI诊疗指南(2019)', level: 'IA' },
        allergyNote: null,
      },
      {
        label: '方案二',
        tag: '再灌注治疗',
        isFirst: false,
        content: 'PCI（经皮冠状动脉介入治疗）是 STEMI 首选再灌注策略，建议在症状发作 12 小时内、就诊至球囊扩张时间 < 90 分钟内完成。',
        drugs: ['替格瑞洛 90mg', '比伐卢定'],
        guideline: { title: 'ESC ACS指南(2023)', level: 'IA' },
        allergyNote: '替格瑞洛不含青霉素成分，对青霉素过敏患者可安全使用',
      },
    ],
    traditional: [
      {
        label: '方案一',
        tag: '活血化瘀',
        isFirst: true,
        content: '以活血化瘀、通络止痛为主，可选用丹参注射液、血栓通等辅助治疗，配合西医规范治疗，改善预后。',
        drugs: ['丹参注射液', '参附注射液'],
        guideline: { title: '心肌梗死中西医结合诊疗专家共识', level: 'IIB' },
        allergyNote: null,
      },
    ],
  },
}

export function TreatmentCard({ defaultOpen = true }) {
  const patient = usePatientStore(s => s.context)
  const [activeTab, setActiveTab] = useState('western')
  const [expanded, setExpanded] = useState(null)

  const firstDiagnosis = patient?.diagnosis_names?.[0]
  const data = TREATMENT_DATA[firstDiagnosis]

  if (!data) return null

  const plans = data[activeTab] || []

  return (
    <CollapsibleCard
      title="治疗推荐"
      iconBg="bg-green-500"
      icon={<HeartPulse size={11} className="text-white" />}
      defaultOpen={defaultOpen}
    >
      {/* 通用治疗 / 个性化治疗 Tab */}
      <div className="flex gap-1.5 mb-3">
        {['western', 'traditional'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-1 text-xs rounded font-medium transition-colors',
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab === 'western' ? '通用治疗' : '个性化治疗'}
          </button>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-200 mb-2 -mx-3" />
      <p className="text-2xs text-gray-400 mb-2 text-center">药物治疗</p>

      {plans.length === 0 ? (
        <p className="text-xs text-gray-400">暂无治疗方案</p>
      ) : (
        <div className="space-y-2.5">
          {plans.map((plan, i) => (
            <TreatmentPlan
              key={i}
              plan={plan}
              isExpanded={expanded === i}
              onToggle={() => setExpanded(expanded === i ? null : i)}
              patient={patient}
            />
          ))}
        </div>
      )}
    </CollapsibleCard>
  )
}

function TreatmentPlan({ plan, isExpanded, onToggle, patient }) {
  const hasAllergyNote = plan.allergyNote && patient?.allergies?.length > 0
  const [added, setAdded] = useState(false)

  const handleAdd = (e) => {
    e.stopPropagation()
    console.log('[HIS WriteBack] treatment_plan', { label: plan.label, tag: plan.tag, drugs: plan.drugs })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="rounded border border-border overflow-hidden">
      {/* 标题行 */}
      <div
        className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 cursor-pointer
                   hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <span className="text-xs font-semibold text-primary">{plan.label}</span>
        <Badge variant="blue">{plan.tag}</Badge>

        {/* 指南徽章 */}
        {plan.guideline && (
          <span className="flex items-center gap-0.5 text-2xs text-gray-500
                           bg-gray-100 border border-gray-200 px-1 py-0.5 rounded-sm">
            <BookOpen size={9} />
            {plan.guideline.level}
          </span>
        )}

        {plan.isFirst && (
          <div className="flex items-center gap-0.5 text-2xs text-amber-500">
            <Star size={10} fill="currentColor" />
            <span>首选</span>
          </div>
        )}

        {/* 回写 HIS 按钮 */}
        <button
          onClick={handleAdd}
          title="将治疗方案写入 HIS"
          className={cn(
            'ml-auto flex-shrink-0 transition-colors',
            added ? 'text-success' : 'text-gray-300 hover:text-primary'
          )}
        >
          {added ? <CheckCircle2 size={13} /> : <PlusCircle size={13} />}
        </button>

        {!plan.isFirst && (
          <ChevronRight
            size={12}
            className={cn(
              'text-gray-400 transition-transform flex-shrink-0',
              isExpanded && 'rotate-90'
            )}
          />
        )}
      </div>

      {/* 方案内容（首选默认展开，其余点击展开） */}
      {(plan.isFirst || isExpanded) && (
        <div className="px-2.5 py-2 space-y-2">
          {/* 过敏提示 */}
          {hasAllergyNote && (
            <div className="flex items-start gap-1.5 border-l-2 border-l-warning bg-white
                             rounded px-2 py-1.5 border border-border">
              <span className="text-2xs text-warning">
                ⚠ {plan.allergyNote}
              </span>
            </div>
          )}

          {/* 正文 */}
          <p className="text-xs text-gray-600 leading-relaxed">{plan.content}</p>

          {/* 推荐药物 */}
          {plan.drugs?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {plan.drugs.map(drug => (
                <span
                  key={drug}
                  className="text-2xs bg-gray-100 text-gray-600 border border-gray-200
                             px-1.5 py-0.5 rounded-sm cursor-pointer hover:bg-gray-200"
                >
                  {drug}
                </span>
              ))}
            </div>
          )}

          {/* 循证依据 */}
          {plan.guideline && (
            <div className="flex items-center gap-1 pt-1 border-t border-dashed border-gray-200">
              <BookOpen size={10} className="text-indigo-500 flex-shrink-0" />
              <span className="text-2xs text-gray-500">
                循证依据：{plan.guideline.title}
                <span className="ml-1 text-indigo-600 font-medium">[{plan.guideline.level}]</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
