import { usePatientStore }         from '@/stores/patient'
import { useClinicalContextStore }  from '@/stores/clinicalContext'
import { useWorkflowStage, STAGE_META, STAGE_LAYOUT } from '@/hooks/useWorkflowStage'
import { AlertStrip }              from './AlertStrip'
import { SmartAlertCard }          from './SmartAlertCard'
import { AuxDiagnosisCard }        from './AuxDiagnosisCard'
import { ExamRecommendCard }       from './ExamRecommendCard'
import { TreatmentCard }           from './TreatmentCard'
import { LabResultCard }           from './LabResultCard'
import { RiskAssessEntryCard }     from './RiskAssessEntryCard'
import { GuidelineCard }           from './GuidelineCard'
import { InterventionCard }        from './InterventionCard'
import { ChiefComplaintCard }      from './ChiefComplaintCard'

/**
 * 动态卡片注册表（不含 ChiefComplaintCard，它始终固定置顶）
 */
const CARD_REGISTRY = {
  alert:        (open) => <SmartAlertCard      key="alert"        defaultOpen={open} />,
  diagnosis:    (open) => <AuxDiagnosisCard    key="diagnosis"    defaultOpen={open} />,
  exam:         (open) => <ExamRecommendCard   key="exam"         defaultOpen={open} />,
  treatment:    (open) => <TreatmentCard       key="treatment"    defaultOpen={open} />,
  labresult:    (open) => <LabResultCard       key="labresult"    defaultOpen={open} />,
  risk:         (open) => <RiskAssessEntryCard key="risk"         defaultOpen={open} />,
  guideline:    (open) => <GuidelineCard       key="guideline"    defaultOpen={open} />,
  intervention: (open) => <InterventionCard    key="intervention" defaultOpen={open} />,
}

export function MainPanel() {
  // useNLPExtraction 已移至 HISLayout，全局持续运行
  const patient  = usePatientStore(s => s.context)
  const entities = useClinicalContextStore(s => s.entities)
  const stage    = useWorkflowStage(patient, entities)

  /* ── 空状态 ─────────────────────────────────────────────── */
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
        <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
          <span className="text-2xl">🩺</span>
        </div>
        <p className="text-sm text-gray-500">请在 HIS 中打开患者病历</p>
        <p className="text-xs text-gray-400">或点击顶栏"加载演示患者"体验功能</p>
      </div>
    )
  }

  const layout    = STAGE_LAYOUT[stage] || STAGE_LAYOUT.initial
  const stageMeta = STAGE_META[stage]

  return (
    <div key={stage}>

      {/* ① 始终置顶：危急预警条 */}
      <AlertStrip />

      {/* ② 始终置顶：主诉确认区（核心操作区） */}
      <ChiefComplaintCard />

      {/* ③ 阶段进度指示器 */}
      <StageBar stage={stage} meta={stageMeta} />

      {/* ④ 动态推荐卡片（随阶段自动排序） */}
      <div className="space-y-0">
        {layout.order.map(cardId => {
          const render = CARD_REGISTRY[cardId]
          if (!render) return null
          return render(layout.expanded.includes(cardId))
        })}
      </div>
    </div>
  )
}

/* ── 阶段进度条 ──────────────────────────────────────────────── */
function StageBar({ stage, meta }) {
  const steps = [
    { id: 'initial',       label: '主诉' },
    { id: 'has_labs',      label: '检验' },
    { id: 'has_diagnosis', label: '治疗' },
    { id: 'high_risk',     label: '危急' },
  ]
  const curIdx = steps.findIndex(s => s.id === stage)

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border-b border-border">
      {steps.map((step, i) => {
        const isPast    = i < curIdx
        const isCurrent = i === curIdx
        return (
          <div key={step.id} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1 ${isCurrent ? 'opacity-100' : 'opacity-40'}`}>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                isCurrent ? 'bg-primary' : isPast ? 'bg-success' : 'bg-gray-300'
              )} />
              <span className={cn(
                'text-2xs font-medium',
                isCurrent ? 'text-primary' : isPast ? 'text-success' : 'text-gray-400'
              )}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="text-gray-300 text-2xs">›</span>
            )}
          </div>
        )
      })}
      <span className={`ml-auto text-2xs font-medium ${meta.color}`}>
        {meta.label}
      </span>
    </div>
  )
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
