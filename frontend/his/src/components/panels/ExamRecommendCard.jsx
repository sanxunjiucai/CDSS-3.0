import { FlaskConical, FileText, PlusCircle, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { Badge } from '@/components/ui/badge'
import { usePatientStore } from '@/stores/patient'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { get } from '@shared/api/request'

export function ExamRecommendCard({ defaultOpen = true }) {
  const patient  = usePatientStore(s => s.context)
  const navigate = useNavigate()

  const [exams, setExams]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [checked, setChecked]       = useState(new Set())
  const [batchAdded, setBatchAdded] = useState(false)

  useEffect(() => {
    const diagNames = patient?.diagnosis_names || []
    if (!diagNames.length) { setExams([]); return }

    setLoading(true)
    get('/exam-recommend', { params: { disease_names: diagNames.join(','), limit: 15 } })
      .then(data => {
        const items = data?.items || []
        setExams(items)
        setChecked(new Set(items.filter(e => e.level === 'required').map(e => e.code)))
      })
      .catch(() => setExams([]))
      .finally(() => setLoading(false))
  }, [patient?.diagnosis_names?.join(',')])

  const toggle = (code) => setChecked(prev => {
    const next = new Set(prev)
    next.has(code) ? next.delete(code) : next.add(code)
    return next
  })

  const handleBatchAdd = () => {
    const selected = exams.filter(e => checked.has(e.code))
    console.log('[HIS WriteBack] exams batch', selected.map(e => e.name))
    setBatchAdded(true)
    setTimeout(() => setBatchAdded(false), 2000)
  }

  if (loading) return null
  if (!exams.length) return null

  const requiredCount = exams.filter(e => e.level === 'required').length

  return (
    <CollapsibleCard
      title="推荐检验检查"
      iconBg="bg-teal-500"
      icon={<FlaskConical size={11} className="text-white" />}
      badge={`${requiredCount} 必查`}
      defaultOpen={defaultOpen}
    >
      <div className="space-y-0.5">
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

      {/* 批量添加 */}
      {checked.size > 0 && (
        <button
          onClick={handleBatchAdd}
          className={cn(
            'mt-2 w-full text-xs py-1.5 rounded flex items-center justify-center gap-1.5 transition-all',
            batchAdded
              ? 'bg-green-50 text-success border border-green-200'
              : 'bg-primary text-white hover:bg-primary/90'
          )}
        >
          {batchAdded
            ? <><CheckCircle2 size={12} /> 已添加至 HIS</>
            : <><PlusCircle   size={12} /> 添加至 HIS（{checked.size} 项）</>
          }
        </button>
      )}
    </CollapsibleCard>
  )
}

function ExamItem({ exam, checked, onToggle, onDetail }) {
  return (
    <div className={cn(
      'flex items-center gap-2 py-1.5 px-1.5 rounded transition-colors group',
      checked ? 'bg-primary-50/50' : 'hover:bg-gray-50'
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
        className="flex-1 text-xs text-gray-800 truncate cursor-pointer"
        onClick={onDetail}
      >
        {exam.name}
      </span>

      {/* 必查 / 酌情 */}
      <Badge variant={exam.level === 'required' ? 'required' : 'optional'}>
        {exam.level === 'required' ? '必查' : '酌情'}
      </Badge>

      {/* 查阅说明 */}
      <button
        onClick={onDetail}
        title="查阅说明"
        className="text-gray-300 hover:text-primary flex-shrink-0 transition-colors
                   opacity-0 group-hover:opacity-100"
      >
        <FileText size={11} />
      </button>
    </div>
  )
}
