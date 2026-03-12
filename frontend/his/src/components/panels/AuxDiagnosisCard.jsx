import { Stethoscope, ChevronRight, Copy, FileText } from 'lucide-react'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { usePatientStore } from '@/stores/patient'
import { useNavigate } from 'react-router-dom'

export function AuxDiagnosisCard({ defaultOpen = true }) {
  const patient = usePatientStore(s => s.context)
  const navigate = useNavigate()
  const diagnoses = patient?.diagnosis_names || []

  return (
    <CollapsibleCard
      title="辅助诊断"
      iconBg="bg-blue-500"
      icon={<Stethoscope size={11} className="text-white" />}
      defaultOpen={defaultOpen}
    >
      {diagnoses.length === 0 ? (
        <p className="text-xs text-gray-400">暂无诊断信息</p>
      ) : (
        <div className="space-y-1.5">
          {diagnoses.map((d, i) => (
            <DiagnosisItem
              key={i}
              name={d}
              icd={patient.diagnoses?.[i]}
              onClick={() => navigate(`/knowledge/disease/${patient.diagnoses?.[i] || 'unknown'}`)}
            />
          ))}
        </div>
      )}

      {/* 跳转辅助诊断详情 */}
      <button
        onClick={() => navigate('/diagnosis')}
        className="mt-2 w-full text-xs text-primary hover:text-primary-600
                   flex items-center justify-center gap-1 py-1 rounded
                   border border-dashed border-primary-300 hover:border-primary
                   transition-colors"
      >
        <Stethoscope size={11} />
        症状输入，获取诊断建议
      </button>
    </CollapsibleCard>
  )
}

function DiagnosisItem({ name, icd, onClick }) {
  return (
    <div
      className="flex items-center justify-between gap-2 py-1.5 px-2 rounded
                 hover:bg-gray-50 cursor-pointer group transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* 选中框样式（纯展示，表示已确认诊断）*/}
        <div className="w-3.5 h-3.5 rounded-sm border-2 border-primary bg-primary
                        flex items-center justify-center flex-shrink-0">
          <div className="w-1.5 h-1 border-b-2 border-r-2 border-white
                          rotate-45 translate-y-[-1px]" />
        </div>
        <span className="text-sm text-gray-800 truncate">{name}</span>
        {icd && (
          <span className="text-2xs text-gray-400 flex-shrink-0">{icd}</span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(name) }}
          className="text-gray-400 hover:text-gray-600"
          title="复制诊断名称"
        >
          <Copy size={11} />
        </button>
        <button className="text-gray-400 hover:text-gray-600" title="查看详情">
          <FileText size={11} />
        </button>
        <ChevronRight size={11} className="text-gray-300" />
      </div>
    </div>
  )
}
