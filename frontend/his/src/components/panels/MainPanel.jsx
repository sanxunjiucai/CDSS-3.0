import { usePatientStore }         from '@/stores/patient'
import { useClinicalContextStore }  from '@/stores/clinicalContext'
import { useWorkflowStage, STAGE_LAYOUT } from '@/hooks/useWorkflowStage'
import { SmartAlertCard }          from './SmartAlertCard'
import { AuxDiagnosisCard }        from './AuxDiagnosisCard'
import { ExamRecommendCard }       from './ExamRecommendCard'
import { TreatmentCard }           from './TreatmentCard'
import { LabResultCard }           from './LabResultCard'
import { RiskAssessEntryCard }     from './RiskAssessEntryCard'
import { GuidelineCard }           from './GuidelineCard'
import { InterventionCard }        from './InterventionCard'
import { SmartAssistCard }         from './SmartAssistCard'
import { TransferAssessCard }      from './TransferAssessCard'

/**
 * 动态卡片注册表（不含 SmartAssistCard，它始终固定置顶）
 */
const CARD_REGISTRY = {
  alert:        (open) => <SmartAlertCard      key="alert"        defaultOpen={open} />,
  diagnosis:    (open) => <AuxDiagnosisCard    key="diagnosis"    defaultOpen={open} />,
  exam:         (open) => <ExamRecommendCard   key="exam"         defaultOpen={open} />,
  treatment:    (open) => <TreatmentCard       key="treatment"    defaultOpen={open} />,
  labresult:    (open) => <LabResultCard       key="labresult"    defaultOpen={open} />,
  transfer:     (open) => <TransferAssessCard  key="transfer"     defaultOpen={open} />,
  risk:         (open) => <RiskAssessEntryCard key="risk"         defaultOpen={open} />,
  guideline:    (open) => <GuidelineCard       key="guideline"    defaultOpen={open} />,
  intervention: (open) => <InterventionCard    key="intervention" defaultOpen={open} />,
}

export function MainPanel() {
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

  const layout = STAGE_LAYOUT[stage] || STAGE_LAYOUT.initial

  return (
    <div key={stage}>
      <SmartAssistCard />
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

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
