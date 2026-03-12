import { FlaskConical, ChevronRight, FileText } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { Badge } from '@/components/ui/badge'
import { usePatientStore } from '@/stores/patient'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

// Mock 推荐检验数据（按诊断规则生成，后续接 /v1/treatment 接口）
const EXAM_RECOMMENDATIONS = {
  '急性ST段抬高型心肌梗死': [
    { name: '心电图',         level: 'required', code: 'ECG' },
    { name: '冠状动脉造影',   level: 'required', code: 'CAG' },
    { name: 'hs-cTnT',        level: 'optional', code: 'HSTNT' },
    { name: 'NT-proBNP',      level: 'optional', code: 'NTPROBNP' },
    { name: '多普勒超声心动图', level: 'optional', code: 'ECHO' },
  ],
  '高血压': [
    { name: '血压监测',   level: 'required', code: 'BP' },
    { name: '肾功能',     level: 'optional', code: 'RENAL' },
    { name: '电解质',     level: 'optional', code: 'ELEC' },
  ],
}

export function ExamRecommendCard({ defaultOpen = true }) {
  const patient = usePatientStore(s => s.context)
  const navigate = useNavigate()

  // 合并所有诊断的推荐检验
  const allExams = (patient?.diagnosis_names || []).flatMap(
    d => EXAM_RECOMMENDATIONS[d] || []
  )
  // 去重
  const exams = [...new Map(allExams.map(e => [e.code, e])).values()]

  const [checked, setChecked] = useState(new Set())
  const toggle = (code) => setChecked(prev => {
    const next = new Set(prev)
    next.has(code) ? next.delete(code) : next.add(code)
    return next
  })

  if (!exams.length) return null

  const requiredCount = exams.filter(e => e.level === 'required').length

  return (
    <CollapsibleCard
      title="推荐检验检查"
      iconBg="bg-teal-500"
      icon={<FlaskConical size={11} className="text-white" />}
      badge={`${requiredCount}必查`}
      defaultOpen={defaultOpen}
    >
      <div className="space-y-1">
        {exams.map((exam) => (
          <ExamItem
            key={exam.code}
            exam={exam}
            checked={checked.has(exam.code)}
            onToggle={() => toggle(exam.code)}
            onDetail={() => navigate(`/knowledge/exam/${exam.code}`)}
          />
        ))}
      </div>

      {checked.size > 0 && (
        <button className="mt-2 w-full text-xs bg-primary text-white py-1.5 rounded
                           hover:bg-primary-600 transition-colors">
          开具选中项目（{checked.size}项）
        </button>
      )}
    </CollapsibleCard>
  )
}

function ExamItem({ exam, checked, onToggle, onDetail }) {
  const levelLabel = exam.level === 'required' ? '必查' : '酌情'
  const levelVariant = exam.level === 'required' ? 'required' : 'optional'

  return (
    <div className={cn(
      'flex items-center gap-2 py-1.5 px-1.5 rounded hover:bg-gray-50',
      'transition-colors group cursor-pointer'
    )}>
      {/* 复选框 */}
      <div
        onClick={onToggle}
        className={cn(
          'w-3.5 h-3.5 rounded-sm border-2 flex-shrink-0 transition-colors cursor-pointer',
          'flex items-center justify-center',
          checked
            ? 'border-primary bg-primary'
            : 'border-gray-300 bg-white hover:border-primary'
        )}
      >
        {checked && (
          <div className="w-1.5 h-1 border-b-2 border-r-2 border-white rotate-45 translate-y-[-1px]" />
        )}
      </div>

      {/* 检验名称 */}
      <span
        className="flex-1 text-sm text-gray-700 truncate"
        onClick={onDetail}
      >
        {exam.name}
      </span>

      {/* 必查/酌情 */}
      <Badge variant={levelVariant}>{levelLabel}</Badge>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onDetail}
          className="text-gray-400 hover:text-primary"
          title="查看说明"
        >
          <FileText size={11} />
        </button>
        <ChevronRight size={11} className="text-gray-300" />
      </div>
    </div>
  )
}
