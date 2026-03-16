import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, AlertTriangle, RotateCcw, Sparkles,
         CheckCircle2, ClipboardList, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

/* ─────────────────────────────────────────────────────────────
   前端 autoFill 映射（按 question_id）
   返回 true  → 选评分最高选项
   返回 false → 选评分为 0 的选项
   返回 undefined → 不预填
───────────────────────────────────────────────────────────── */
const AUTO_FILL_MAP = {
  // CURB-65
  'U':    p => p.lab_results?.find(l => l.item_code === 'BUN' || l.item_name?.includes('尿素氮'))?.is_abnormal ? true : undefined,
  '65':   p => p.age != null ? p.age >= 65 : undefined,

  // CHA₂DS₂-VASc / HAS-BLED 共用字段
  'CHF':    p => p.diagnosis_names?.some(d => d.includes('心力衰竭') || d.includes('心衰')) ? true : undefined,
  'HT':     p => p.diagnosis_names?.some(d => d.includes('高血压')) ? true : undefined,
  'AGE75':  p => p.age != null ? p.age >= 75 : undefined,
  'AGE65':  p => p.age != null ? (p.age >= 65 && p.age < 75) : undefined,
  'DM':     p => p.diagnosis_names?.some(d => d.includes('糖尿病')) ? true : undefined,
  'STROKE': p => p.diagnosis_names?.some(d => d.includes('卒中') || d.includes('TIA')) ? true : undefined,
  'VD':     p => p.diagnosis_names?.some(d => d.includes('心肌梗死') || d.includes('冠心病') || d.includes('动脉硬化')) ? true : undefined,
  'SEX':    p => p.gender === 'female' ? true : (p.gender === 'male' ? false : undefined),

  // Wells DVT
  'activecancer': p => p.diagnosis_names?.some(d => d.includes('癌') || d.includes('肿瘤') || d.includes('恶性')) ? true : undefined,
  'prevdvt':      p => p.past_history?.some(h => h.includes('深静脉血栓') || h.includes('DVT')) ? true : undefined,

  // Wells PE
  'dvtsigns':     p => p.diagnosis_names?.some(d => d.includes('深静脉血栓') || d.includes('DVT')) ? true : undefined,

  // SOFA / qSOFA
  'resp':    p => p.lab_results?.find(l => l.item_name?.includes('氧') || l.item_name?.includes('PaO2'))?.is_abnormal ? true : undefined,

  // GCS 各维度——无法从 HIS 数据自动推断，略

  // Braden / Morse / NRS-2002——护理量表，无法从常规 HIS 数据推断，略
}

/* 从 autoFill 结果（true/false）映射到选项 label */
function resolveAutoFillLabel(boolVal, options) {
  if (boolVal === true) {
    const maxScore = Math.max(...options.map(o => o.score))
    return options.find(o => o.score === maxScore)?.label
  }
  if (boolVal === false) {
    return options.find(o => o.score === 0)?.label ?? options[0]?.label
  }
  return undefined
}

/* 根据 level 文本映射颜色 */
function levelToColor(level = '') {
  if (/高危|极高|严重|重度/.test(level)) return 'danger'
  if (/中危|中度|中等|升高/.test(level)) return 'warning'
  return 'success'
}

const COLOR_MAP = {
  success: { text: 'text-success', accent: 'border-l-2 border-l-success', badge: 'bg-green-50 text-success' },
  warning: { text: 'text-warning', accent: 'border-l-2 border-l-warning', badge: 'bg-orange-50 text-warning' },
  danger:  { text: 'text-danger',  accent: 'border-l-2 border-l-danger',  badge: 'bg-red-50 text-danger'   },
}

/* ── 主组件 ────────────────────────────────────────────────── */
export function AssessmentPanel() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const patient  = usePatientStore(s => s.context)

  const [assessment, setAssessment] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [answers,    setAnswers]    = useState({})   // { [qId]: label_string }
  const [savedToHIS, setSavedToHIS] = useState(false)

  /* 加载量表 */
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/assessments/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(json => {
        const data = json.data
        setAssessment(data)
        // 自动预填
        if (patient && data?.questions) {
          const filled = {}
          data.questions.forEach(q => {
            const fn = AUTO_FILL_MAP[q.id]
            if (!fn) return
            const boolVal = fn(patient)
            const label   = resolveAutoFillLabel(boolVal, q.options || [])
            if (label != null) filled[q.id] = label
          })
          setAnswers(filled)
        }
      })
      .catch(() => setError('量表加载失败'))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line

  /* 总分 */
  const totalScore = useMemo(() => {
    if (!assessment) return 0
    return assessment.questions.reduce((sum, q) => {
      const selected = (q.options || []).find(o => o.label === answers[q.id])
      return sum + (selected?.score ?? 0)
    }, 0)
  }, [assessment, answers])

  /* 匹配 scoring_rule */
  const resultRule = useMemo(() => {
    if (!assessment) return null
    return (assessment.scoring_rules || []).find(
      r => totalScore >= r.range_min && totalScore <= r.range_max
    )
  }, [assessment, totalScore])

  /* 统计 */
  const totalQ     = assessment?.questions?.length ?? 0
  const answeredQ  = Object.keys(answers).length
  const pendingQ   = totalQ - answeredQ
  const autoFilled = useMemo(() => {
    if (!assessment || !patient) return {}
    const filled = {}
    assessment.questions.forEach(q => {
      const fn = AUTO_FILL_MAP[q.id]
      if (!fn) return
      const boolVal = fn(patient)
      const label = resolveAutoFillLabel(boolVal, q.options || [])
      if (label != null) filled[q.id] = label
    })
    return filled
  }, [assessment, patient])
  const autoFillCount = Object.keys(autoFilled).length

  /* 进度 */
  const maxScore  = useMemo(() => {
    if (!assessment) return 1
    return Math.max(1, assessment.questions.reduce((s, q) => {
      const scores = (q.options || []).map(o => o.score)
      return s + (scores.length ? Math.max(...scores) : 0)
    }, 0))
  }, [assessment])
  const scorePct   = Math.min(100, Math.max(0, Math.round((totalScore / maxScore) * 100)))
  const handledPct = totalQ ? Math.round((answeredQ / totalQ) * 100) : 0

  const handleReset = () => {
    if (!assessment || !patient) { setAnswers({}); return }
    const filled = {}
    assessment.questions.forEach(q => {
      const fn = AUTO_FILL_MAP[q.id]
      if (!fn) return
      const label = resolveAutoFillLabel(fn(patient), q.options || [])
      if (label != null) filled[q.id] = label
    })
    setAnswers(filled)
    setSavedToHIS(false)
  }

  const handleSave = () => {
    console.log('[HIS WriteBack] 评分结果', {
      scale: assessment?.name,
      score: totalScore,
      level: resultRule?.level,
    })
    setSavedToHIS(true)
    setTimeout(() => setSavedToHIS(false), 3000)
  }

  /* ── 渲染 ── */
  if (loading) return (
    <div className="flex items-center justify-center h-full gap-2 text-gray-400">
      <Loader2 size={16} className="animate-spin" />
      <span className="text-xs">加载量表…</span>
    </div>
  )

  if (error || !assessment) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
      <p className="text-xs">{error || '量表不存在'}</p>
      <Button variant="outline" size="sm" onClick={() => navigate(-1)}>返回</Button>
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* 页头 */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-700 p-0.5 flex-shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-800">{assessment.name}</h2>
            <p className="text-2xs text-gray-400">{assessment.description}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* 患者信息条 */}
        {patient && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded
                          bg-gray-50 border border-border text-2xs">
            <span className="text-gray-600">患者：</span>
            <span className="font-medium text-gray-800">{patient.name}</span>
            <span className="text-gray-500">{patient.age}岁 {patient.gender === 'male' ? '男' : '女'}</span>
            {autoFillCount > 0 && (
              <span className="ml-auto flex items-center gap-0.5 text-purple-600">
                <Sparkles size={10} />已从 HIS 预填 {autoFillCount} 项
              </span>
            )}
          </div>
        )}

        {/* 实时结果（有作答就显示） */}
        {answeredQ > 0 && resultRule && (
          <ResultCard
            rule={resultRule}
            score={totalScore}
            pendingCount={pendingQ}
          />
        )}

        {/* 题目列表 */}
        <div className="space-y-1.5">
          {assessment.questions.map((q, i) => (
            <QuestionItem
              key={q.id}
              question={q}
              index={i}
              selected={answers[q.id]}
              isAutoFilled={q.id in autoFilled}
              onChange={label => setAnswers(prev => ({ ...prev, [q.id]: label }))}
            />
          ))}
        </div>

        {/* 进度 + 分数 */}
        <div className="rounded border border-border bg-gray-50 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">
              当前得分
              {pendingQ > 0 && (
                <span className="text-2xs text-amber-500 ml-1">（{pendingQ} 项未填）</span>
              )}
            </span>
            <span className="text-lg font-bold text-primary">{totalScore}</span>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300"
                   style={{ width: `${scorePct}%` }} />
            </div>
            <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-gray-300 transition-all duration-300"
                   style={{ width: `${handledPct}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-2xs text-gray-400">
            <span>已答 {answeredQ}/{totalQ}</span>
            {pendingQ > 0 && <span>待填 {pendingQ} 项</span>}
            {autoFillCount > 0 && (
              <span className="text-purple-500 ml-auto">HIS预填 {autoFillCount} 项</span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}
                  className="flex items-center gap-1 flex-shrink-0">
            <RotateCcw size={12} /> 重置
          </Button>
          <button
            onClick={handleSave}
            className={cn(
              'flex-1 text-xs py-1.5 rounded flex items-center justify-center gap-1.5 font-medium transition-all',
              savedToHIS
                ? 'bg-green-50 text-success border border-green-200'
                : 'bg-primary text-white hover:bg-primary/90'
            )}
          >
            {savedToHIS
              ? <><CheckCircle2 size={12} /> 已记录至病历</>
              : <><ClipboardList size={12} /> 记录至病历</>}
          </button>
        </div>

      </div>
    </div>
  )
}

/* ── 题目组件（选项按钮风格）──────────────────────────────── */
function QuestionItem({ question, index, selected, isAutoFilled, onChange }) {
  const opts = question.options || []
  const answered = selected != null

  return (
    <div className={cn(
      'rounded border border-border overflow-hidden bg-white',
      isAutoFilled ? 'border-l-2 border-l-primary' : answered ? 'border-l-2 border-l-gray-300' : ''
    )}>
      {/* 题目头 */}
      <div className="px-2.5 py-2 border-b border-border bg-gray-50 flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-gray-800 flex-1">
          <span className="text-gray-400 mr-1">{index + 1}.</span>
          {question.text}
        </p>
        {isAutoFilled && (
          <span className="inline-flex items-center gap-0.5 text-2xs text-primary
                           px-1 py-0.5 rounded-sm flex-shrink-0">
            <Sparkles size={9} />HIS预填
          </span>
        )}
      </div>

      {/* 选项 */}
      <div className={cn(
        'p-1.5 bg-white',
        opts.length <= 2 ? 'flex gap-1' : 'grid grid-cols-2 gap-1'
      )}>
        {opts.map(opt => (
          <button
            key={opt.label}
            onClick={() => onChange(selected === opt.label ? undefined : opt.label)}
            className={cn(
              'text-2xs px-2 py-1.5 rounded border text-left transition-colors flex items-center justify-between gap-1',
              opts.length <= 2 ? 'flex-1' : '',
              selected === opt.label
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-border hover:bg-primary-50 hover:border-primary'
            )}
          >
            <span>{opt.label}</span>
            <span className={cn(
              'font-semibold flex-shrink-0',
              selected === opt.label ? 'text-white/80' : 'text-gray-400'
            )}>
              {opt.score > 0 ? `+${opt.score}` : opt.score === 0 ? '' : opt.score}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── 结果卡片 ─────────────────────────────────────────────── */
function ResultCard({ rule, score, pendingCount }) {
  const color = levelToColor(rule.level)
  const cfg   = COLOR_MAP[color] || COLOR_MAP.success

  return (
    <div className={cn('rounded border border-border bg-white p-3 space-y-2', cfg.accent)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className={cfg.text} />
          <span className="text-sm font-bold text-gray-800">实时评估结果</span>
        </div>
        {pendingCount > 0 && (
          <span className="text-2xs text-amber-500 bg-amber-50 border border-amber-100
                           px-1.5 py-0.5 rounded">
            还有 {pendingCount} 项未填
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className={cn('text-sm font-bold px-2 py-0.5 rounded', cfg.badge)}>
            {rule.level}
          </span>
          {rule.recommendation && (
            <p className="text-xs text-gray-700 mt-1">{rule.recommendation}</p>
          )}
        </div>
        <div className="text-right">
          <p className={cn('text-3xl font-bold', cfg.text)}>{score}</p>
          <p className="text-2xs text-gray-400">{pendingCount > 0 ? '参考分' : '总分'}</p>
        </div>
      </div>

      {rule.interpretation && rule.interpretation !== rule.level && (
        <p className="text-xs text-gray-600 border-t border-inherit pt-2">{rule.interpretation}</p>
      )}

      <p className="text-2xs text-gray-400">
        本评分仅供临床参考，具体诊疗决策请结合患者实际情况综合判断。
      </p>
    </div>
  )
}
