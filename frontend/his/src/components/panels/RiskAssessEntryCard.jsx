import { ShieldCheck, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { usePatientStore } from '@/stores/patient'

// 后续对接 /v1/assessments 接口，根据患者诊断动态推荐
const ASSESSMENT_RULES = [
  {
    id: 1,
    name: 'CURB-65 评分',
    desc: '社区获得性肺炎严重程度',
    relatedDiagnoses: ['肺炎', '社区获得性肺炎'],
    always: false,
  },
  {
    id: 2,
    name: 'GRACE 评分',
    desc: '急性冠脉综合征风险分层',
    relatedDiagnoses: ['急性ST段抬高型心肌梗死', '不稳定型心绞痛', 'ACS'],
    always: false,
  },
  {
    id: 3,
    name: 'CHA₂DS₂-VASc',
    desc: '房颤卒中风险评估',
    relatedDiagnoses: ['心房颤动', '房颤'],
    always: false,
  },
  {
    id: 4,
    name: 'Wells 评分',
    desc: '深静脉血栓/肺栓塞预测',
    relatedDiagnoses: ['深静脉血栓', '肺栓塞'],
    always: false,
  },
]

export function RiskAssessEntryCard({ defaultOpen = true }) {
  const navigate = useNavigate()
  const patient = usePatientStore(s => s.context)

  const diagnosisNames = patient?.diagnosis_names || []

  // 根据诊断匹配推荐量表
  const recommended = ASSESSMENT_RULES.filter(rule => {
    if (rule.always) return true
    return rule.relatedDiagnoses.some(d =>
      diagnosisNames.some(dn => dn.includes(d) || d.includes(dn))
    )
  })

  // 若无匹配，展示全部（最多3个）作为通用入口
  const items = recommended.length > 0
    ? recommended
    : ASSESSMENT_RULES.slice(0, 3)

  return (
    <CollapsibleCard
      title="风险评估"
      iconBg="bg-purple-500"
      icon={<ShieldCheck size={11} className="text-white" />}
      badge={recommended.length > 0 ? recommended.length : undefined}
      defaultOpen={defaultOpen}
    >
      <div className="space-y-1.5">
        {items.map(item => (
          <AssessEntry
            key={item.id}
            item={item}
            isRecommended={recommended.some(r => r.id === item.id)}
            onClick={() => navigate(`/assessment/${item.id}`)}
          />
        ))}
      </div>
    </CollapsibleCard>
  )
}

function AssessEntry({ item, isRecommended, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded border border-border
                 bg-white hover:bg-gray-50 transition-colors text-left group"
    >
      {/* 指示点 */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
        isRecommended ? 'bg-primary' : 'bg-gray-300'
      }`} />

      {/* 量表信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-800">{item.name}</span>
          {isRecommended && (
            <span className="text-2xs text-primary px-1 py-0.5 rounded-sm">推荐</span>
          )}
        </div>
        <p className="text-2xs text-gray-400 truncate">{item.desc}</p>
      </div>

      <ChevronRight size={12} className="text-gray-300 group-hover:text-primary flex-shrink-0
                                          transition-colors" />
    </button>
  )
}
