import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, Circle, AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

// Mock 量表数据（后续对接 /v1/assessments/{id}）
const ASSESSMENTS = {
  1: {
    id: 1,
    name: 'CURB-65 评分',
    description: '用于社区获得性肺炎（CAP）严重程度分层，指导住院决策',
    questions: [
      {
        id: 'confusion',
        text: '意识障碍（新发）',
        hint: '定向力、记忆力、注意力下降',
        score: 1,
      },
      {
        id: 'urea',
        text: '血尿素氮 > 7 mmol/L',
        hint: '（BUN > 19 mg/dL）',
        score: 1,
      },
      {
        id: 'rr',
        text: '呼吸频率 ≥ 30 次/min',
        hint: '',
        score: 1,
      },
      {
        id: 'bp',
        text: '低血压（收缩压 < 90 或舒张压 ≤ 60 mmHg）',
        hint: '',
        score: 1,
      },
      {
        id: 'age',
        text: '年龄 ≥ 65 岁',
        hint: '',
        score: 1,
      },
    ],
    scoring: [
      { range: [0, 1], level: '低危', color: 'success', action: '门诊治疗', icon: '✓' },
      { range: [2, 2], level: '中危', color: 'warning', action: '住院或密切随访', icon: '!' },
      { range: [3, 5], level: '高危', color: 'danger', action: '住院，考虑ICU', icon: '!!' },
    ],
  },
  2: {
    id: 2,
    name: 'GRACE 评分',
    description: '急性冠脉综合征院内和6个月死亡风险预测',
    questions: [
      {
        id: 'age_pts',
        text: '年龄（岁）',
        type: 'select',
        options: [
          { label: '< 30', score: 0 },
          { label: '30–39', score: 8 },
          { label: '40–49', score: 25 },
          { label: '50–59', score: 41 },
          { label: '60–69', score: 58 },
          { label: '70–79', score: 75 },
          { label: '≥ 80', score: 91 },
        ],
      },
      {
        id: 'hr',
        text: '心率（次/min）',
        type: 'select',
        options: [
          { label: '< 50', score: 0 },
          { label: '50–69', score: 3 },
          { label: '70–89', score: 9 },
          { label: '90–109', score: 15 },
          { label: '110–149', score: 24 },
          { label: '150–199', score: 38 },
          { label: '≥ 200', score: 46 },
        ],
      },
      {
        id: 'sbp',
        text: '收缩压（mmHg）',
        type: 'select',
        options: [
          { label: '< 80', score: 58 },
          { label: '80–99', score: 53 },
          { label: '100–119', score: 43 },
          { label: '120–139', score: 34 },
          { label: '140–159', score: 24 },
          { label: '160–199', score: 10 },
          { label: '≥ 200', score: 0 },
        ],
      },
      {
        id: 'killip',
        text: 'Killip 分级',
        type: 'select',
        options: [
          { label: 'I 级（无心衰）', score: 0 },
          { label: 'II 级（轻度心衰）', score: 20 },
          { label: 'III 级（急性肺水肿）', score: 39 },
          { label: 'IV 级（心源性休克）', score: 59 },
        ],
      },
      {
        id: 'arrest',
        text: '院内心跳骤停',
        type: 'checkbox',
        score: 39,
      },
      {
        id: 'troponin',
        text: '心肌酶升高',
        type: 'checkbox',
        score: 14,
      },
      {
        id: 'stdev',
        text: 'ST段偏移',
        type: 'checkbox',
        score: 28,
      },
    ],
    scoring: [
      { range: [0, 108],  level: '低危',  color: 'success', action: '院内死亡率<1%', icon: '✓' },
      { range: [109, 140], level: '中危', color: 'warning', action: '院内死亡率1–3%', icon: '!' },
      { range: [141, 999], level: '高危', color: 'danger',  action: '院内死亡率>3%', icon: '!!' },
    ],
  },
}

const COLOR_MAP = {
  success: { bg: 'bg-green-50', text: 'text-success', border: 'border-green-200', badge: 'bg-green-100 text-success' },
  warning: { bg: 'bg-orange-50', text: 'text-warning', border: 'border-orange-200', badge: 'bg-orange-100 text-warning' },
  danger:  { bg: 'bg-red-50',    text: 'text-danger',  border: 'border-red-200',    badge: 'bg-red-100 text-danger' },
}

export function AssessmentPanel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const patient = usePatientStore(s => s.context)

  const assessment = ASSESSMENTS[id]
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  if (!assessment) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <p className="text-xs">量表不存在</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>返回</Button>
      </div>
    )
  }

  const totalScore = assessment.questions.reduce((sum, q) => {
    if (q.type === 'select') {
      const opt = q.options?.find(o => o.label === answers[q.id])
      return sum + (opt?.score ?? 0)
    }
    return sum + (answers[q.id] ? (q.score ?? 0) : 0)
  }, 0)

  const resultLevel = assessment.scoring.find(
    s => totalScore >= s.range[0] && totalScore <= s.range[1]
  )

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount >= assessment.questions.length

  const handleReset = () => {
    setAnswers({})
    setSubmitted(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 页头 */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 p-0.5">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">{assessment.name}</h2>
            <p className="text-2xs text-gray-400">{assessment.description}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 患者信息提示 */}
        {patient && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-patient-bg border border-primary-200 text-2xs">
            <span className="text-gray-600">患者：</span>
            <span className="font-medium text-gray-800">{patient.name}</span>
            <span className="text-gray-500">{patient.age}岁 {patient.gender === 'male' ? '男' : '女'}</span>
          </div>
        )}

        {/* 题目列表 */}
        <div className="space-y-2">
          {assessment.questions.map((q, i) => (
            <QuestionItem
              key={q.id}
              question={q}
              index={i}
              value={answers[q.id]}
              onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
            />
          ))}
        </div>

        {/* 实时得分 */}
        <div className="rounded border border-border bg-gray-50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">当前得分</span>
            <span className="text-lg font-bold text-primary">{totalScore}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, (totalScore / (assessment.scoring.at(-1)?.range[1] || 5)) * 100)}%`
              }}
            />
          </div>
          <p className="text-2xs text-gray-400 mt-1">
            已回答 {answeredCount}/{assessment.questions.length} 项
          </p>
        </div>

        {/* 结果 */}
        {submitted && resultLevel && (
          <ResultCard result={resultLevel} score={totalScore} />
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-1"
          >
            <RotateCcw size={12} /> 重置
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => setSubmitted(true)}
            disabled={!allAnswered}
          >
            {allAnswered ? '提交评分' : `还需回答 ${assessment.questions.length - answeredCount} 题`}
          </Button>
        </div>
      </div>
    </div>
  )
}

function QuestionItem({ question, index, value, onChange }) {
  if (question.type === 'select') {
    return (
      <div className="rounded border border-border bg-white overflow-hidden">
        <div className="px-2.5 py-2 bg-gray-50 border-b border-border">
          <p className="text-xs font-medium text-gray-800">
            <span className="text-primary mr-1">{index + 1}.</span>
            {question.text}
          </p>
          {question.hint && (
            <p className="text-2xs text-gray-400 mt-0.5">{question.hint}</p>
          )}
        </div>
        <div className="p-1.5 grid grid-cols-2 gap-1">
          {question.options?.map(opt => (
            <button
              key={opt.label}
              onClick={() => onChange(opt.label)}
              className={cn(
                'text-2xs px-2 py-1.5 rounded border text-left transition-colors',
                value === opt.label
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-border hover:bg-primary-50 hover:border-primary'
              )}
            >
              {opt.label}
              <span className={cn(
                'ml-1 font-medium',
                value === opt.label ? 'text-white/80' : 'text-gray-400'
              )}>
                +{opt.score}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // checkbox 类型
  const checked = !!value
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded border transition-colors text-left',
        checked
          ? 'bg-primary-50 border-primary text-primary'
          : 'bg-white border-border text-gray-700 hover:bg-gray-50'
      )}
    >
      {checked
        ? <CheckCircle2 size={15} className="text-primary flex-shrink-0" />
        : <Circle size={15} className="text-gray-300 flex-shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">
          <span className="text-gray-400 mr-1">{index + 1}.</span>
          {question.text}
        </p>
        {question.hint && (
          <p className="text-2xs text-gray-400">{question.hint}</p>
        )}
      </div>
      <span className={cn(
        'text-2xs font-bold flex-shrink-0',
        checked ? 'text-primary' : 'text-gray-400'
      )}>
        +{question.score}
      </span>
    </button>
  )
}

function ResultCard({ result, score }) {
  const cfg = COLOR_MAP[result.color] || COLOR_MAP.success

  return (
    <div className={cn('rounded border p-3 space-y-2', cfg.border, cfg.bg)}>
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className={cfg.text} />
        <span className="text-sm font-bold text-gray-800">评估结果</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className={cn(
            'text-sm font-bold px-2 py-0.5 rounded', cfg.badge
          )}>
            {result.level}
          </span>
          <p className="text-xs text-gray-700 mt-1">{result.action}</p>
        </div>
        <div className="text-right">
          <p className={cn('text-3xl font-bold', cfg.text)}>{score}</p>
          <p className="text-2xs text-gray-400">总分</p>
        </div>
      </div>

      <p className="text-2xs text-gray-500 border-t border-inherit pt-2">
        本评分结果仅供临床参考，具体诊疗决策请结合患者实际情况综合判断。
      </p>
    </div>
  )
}
