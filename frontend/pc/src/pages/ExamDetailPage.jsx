import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, FlaskConical, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { examApi } from '@/api'
import { DetailSection, RichText } from '@/components/common/DetailSection'
import { TagBadge } from '@/components/common/TagBadge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useHistoryStore } from '@/stores/history'
import { cn } from '@/lib/utils'

export function ExamDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const addRecord = useHistoryStore(s => s.addRecord)

  const [exam, setExam]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    examApi.detail(id)
      .then(data => {
        setExam(data)
        addRecord({ id, type: 'exam', name: data.name, path: `/exams/${id}` })
      })
      .catch(() => setExam(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-gray-500">未找到该检验项目信息</p>
        <button onClick={() => navigate('/exams')} className="text-primary text-sm hover:underline">
          返回检验检查库
        </button>
      </div>
    )
  }

  const typeLabel = exam.type === 'lab' ? '检验（化验）' : '检查（影像/功能）'

  return (
    <div>
      <button
        onClick={() => navigate('/exams')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors mb-4"
      >
        <ChevronLeft size={14} />
        返回检验检查库
      </button>

      {/* 标题卡 */}
      <div className="bg-white border border-border rounded-xl px-6 py-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <FlaskConical size={22} className="text-orange-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{exam.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {exam.code && <TagBadge color="default">编码：{exam.code}</TagBadge>}
              <TagBadge color="warning">{typeLabel}</TagBadge>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <DetailSection title="项目说明" defaultOpen={true}>
          <RichText content={exam.description} />
        </DetailSection>

        {/* 参考范围 — 核心展示 */}
        <DetailSection title="参考范围" defaultOpen={true}>
          <ReferenceRangeTable ranges={exam.reference_ranges} />
        </DetailSection>

        <DetailSection title="临床意义">
          <RichText content={exam.clinical_significance} />
        </DetailSection>

        <DetailSection title="适应症">
          <RichText content={exam.indications} />
        </DetailSection>

        <DetailSection title="检查前准备">
          <RichText content={exam.preparation} />
        </DetailSection>
      </div>
    </div>
  )
}

/**
 * 参考范围展示组件
 * ranges: [{gender, age_min, age_max, unit, low, high, condition}]
 */
function ReferenceRangeTable({ ranges }) {
  if (!ranges || ranges.length === 0) {
    return <p className="text-sm text-gray-400 mt-3">暂无参考范围数据</p>
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50">
            {['适用人群', '年龄范围', '条件', '参考范围', '单位'].map(h => (
              <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-medium
                                     border border-border whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranges.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2 border border-border">
                <GenderBadge gender={r.gender} />
              </td>
              <td className="px-3 py-2 border border-border text-gray-600 whitespace-nowrap">
                {r.age_min != null || r.age_max != null
                  ? `${r.age_min ?? 0} ~ ${r.age_max ?? '∞'} 岁`
                  : '—'
                }
              </td>
              <td className="px-3 py-2 border border-border text-gray-600 text-xs">
                {r.condition || '—'}
              </td>
              <td className="px-3 py-2 border border-border font-medium text-gray-800 whitespace-nowrap">
                {r.low != null && r.high != null
                  ? `${r.low} ~ ${r.high}`
                  : r.low != null ? `≥ ${r.low}` : r.high != null ? `≤ ${r.high}` : '—'
                }
              </td>
              <td className="px-3 py-2 border border-border text-gray-500 text-xs">
                {r.unit || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GenderBadge({ gender }) {
  const config = {
    male:   { label: '男', color: 'bg-blue-50 text-blue-700' },
    female: { label: '女', color: 'bg-pink-50 text-pink-700' },
    all:    { label: '通用', color: 'bg-gray-100 text-gray-600' },
  }
  const { label, color } = config[gender] || config.all
  return (
    <span className={cn('inline-block text-xs px-1.5 py-0.5 rounded', color)}>
      {label}
    </span>
  )
}
