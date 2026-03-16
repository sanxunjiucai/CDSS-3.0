import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ClipboardList, CheckCircle2 } from 'lucide-react'
import { assessmentApi } from '@/api'
import { TagBadge } from '@/components/common/TagBadge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useHistoryStore } from '@/stores/history'
import { cn } from '@/lib/utils'

export function AssessmentDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const addRecord = useHistoryStore(s => s.addRecord)

  const [item, setItem]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [answers, setAnswers]   = useState({})   // { [questionId]: selectedOptionValue }
  const [result, setResult]     = useState(null)
  const [scoring, setScoring]   = useState(false)

  useEffect(() => {
    setLoading(true)
    assessmentApi.detail(id)
      .then(data => {
        setItem(data)
        addRecord({ id, type: 'assessment', name: data.name, path: `/assessments/${id}` })
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id])

  const setAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setResult(null)
  }

  const handleSubmit = async () => {
    const questions = item.questions || []
    const allAnswered = questions.every(q => answers[q.id] !== undefined)
    if (!allAnswered) {
      alert('请回答所有题目')
      return
    }
    setScoring(true)
    try {
      const res = await assessmentApi.score(id, answers)
      setResult(res)
    } catch {
      setResult({ error: '评分失败，请稍后重试' })
    } finally {
      setScoring(false)
    }
  }

  if (loading) return <LoadingSpinner />

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-gray-500">未找到该量表信息</p>
        <button onClick={() => navigate('/assessments')} className="text-primary text-sm hover:underline">
          返回量表列表
        </button>
      </div>
    )
  }

  const questions = item.questions || []
  const answeredCount = Object.keys(answers).length

  return (
    <div>
      <button
        onClick={() => navigate('/assessments')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors mb-4"
      >
        <ChevronLeft size={14} />
        返回量表列表
      </button>

      {/* 标题卡 */}
      <div className="bg-white border border-border rounded-xl px-6 py-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList size={22} className="text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">{item.name}</h1>
            <p className="text-sm text-gray-500">{item.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <TagBadge color="default">{questions.length} 题</TagBadge>
              <TagBadge color="primary">
                已完成 {answeredCount} / {questions.length}
              </TagBadge>
            </div>
          </div>
        </div>
      </div>

      {/* 题目区 */}
      <div className="space-y-4 mb-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white border border-border rounded-md p-4">
            <p className="text-sm font-medium text-gray-800 mb-3">
              <span className="text-primary font-bold mr-2">{idx + 1}.</span>
              {q.text}
            </p>
            <div className="space-y-2">
              {(q.options || []).map(opt => {
                const selected = answers[q.id] === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAnswer(q.id, opt.value)}
                    className={cn(
                      'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded text-sm',
                      'border transition-all',
                      selected
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-border hover:border-primary/40 hover:bg-primary-50/50 text-gray-700'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      selected ? 'border-primary' : 'border-gray-300'
                    )}>
                      {selected && <div className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                    <span>{opt.label}</span>
                    {opt.score !== undefined && (
                      <span className="ml-auto text-xs text-gray-400">{opt.score}分</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={scoring || answeredCount < questions.length}
        className={cn(
          'w-full py-3 text-sm font-medium rounded-lg transition-colors mb-4',
          'bg-primary text-white hover:bg-primary-600',
          (scoring || answeredCount < questions.length) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {scoring ? '评分计算中...' : `提交评分（${answeredCount}/${questions.length} 题已完成）`}
      </button>

      {/* 评分结果 */}
      {result && (
        <div className={cn(
          'rounded-xl p-5 border',
          result.error
            ? 'bg-red-50 border-red-200'
            : 'bg-primary-50 border-primary/20'
        )}>
          {result.error ? (
            <p className="text-danger text-sm">{result.error}</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={18} className="text-primary" />
                <p className="font-semibold text-gray-900">评分结果</p>
              </div>
              <p className="text-4xl font-bold text-primary mb-1">
                {result.total_score}
                <span className="text-base text-gray-500 ml-1">分</span>
              </p>
              {result.level && (
                <TagBadge color={result.level === '低危' ? 'success' : result.level === '高危' ? 'danger' : 'warning'} className="mt-2 mb-3">
                  {result.level}
                </TagBadge>
              )}
              {result.interpretation && (
                <p className="text-sm text-gray-700 mt-2">{result.interpretation}</p>
              )}
              {result.recommendation && (
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <p className="text-xs text-gray-500 mb-1">推荐处置意见</p>
                  <p className="text-sm text-gray-700">{result.recommendation}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
