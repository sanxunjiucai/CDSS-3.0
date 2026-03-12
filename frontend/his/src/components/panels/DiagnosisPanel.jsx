import { useState, useEffect } from 'react'
import { Search, Loader2, ExternalLink, AlertCircle, Mic } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePatientStore } from '@/stores/patient'
import { useRecordingStore } from '@/stores/recording'
import { cn } from '@/lib/utils'

// Mock 辅助诊断结果（后续对接 /v1/diagnosis/suggest）
const mockDiagnosis = (symptoms) => {
  if (!symptoms.trim()) return []
  return [
    {
      disease_id: 1,
      disease_name: '急性ST段抬高型心肌梗死',
      icd_code: 'I21.0',
      match_score: 0.92,
      matched_symptoms: ['胸痛', '胸闷', '放射痛'],
      warning: '危急值：请立即行12导联心电图及心肌酶谱',
    },
    {
      disease_id: 2,
      disease_name: '不稳定型心绞痛',
      icd_code: 'I20.0',
      match_score: 0.75,
      matched_symptoms: ['胸痛', '胸闷'],
      warning: null,
    },
    {
      disease_id: 3,
      disease_name: '主动脉夹层',
      icd_code: 'I71.0',
      match_score: 0.58,
      matched_symptoms: ['胸痛', '放射痛'],
      warning: '需排除：胸痛伴撕裂感需警惕',
    },
    {
      disease_id: 4,
      disease_name: '肺栓塞',
      icd_code: 'I26.9',
      match_score: 0.45,
      matched_symptoms: ['胸闷'],
      warning: null,
    },
  ]
}

const COMMON_SYMPTOMS = [
  '胸痛', '胸闷', '呼吸困难', '发热', '头痛', '腹痛',
  '恶心呕吐', '心悸', '咳嗽', '水肿', '晕厥', '乏力',
]

export function DiagnosisPanel() {
  const navigate = useNavigate()
  const patient = usePatientStore(s => s.context)
  const { transcript, status: recStatus } = useRecordingStore()

  const [input, setInput] = useState(patient?.chief_complaint || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [usedTranscript, setUsedTranscript] = useState(false)

  // 录音转写文字变化时，提示用户同步到输入框
  const canSyncTranscript = transcript && transcript !== input && !usedTranscript

  const syncTranscript = () => {
    setInput(transcript)
    setUsedTranscript(true)
  }

  // 患者切换时重置
  useEffect(() => {
    setInput(patient?.chief_complaint || '')
    setResults([])
    setSearched(false)
    setUsedTranscript(false)
  }, [patient?.patient_id]) // eslint-disable-line

  const handleSearch = async () => {
    if (!input.trim()) return
    setLoading(true)
    setSearched(false)
    await new Promise(r => setTimeout(r, 600))
    setResults(mockDiagnosis(input))
    setLoading(false)
    setSearched(true)
  }

  const addSymptom = (s) => {
    setInput(prev => {
      const parts = prev.split(/[、，,\s]+/).filter(Boolean)
      if (parts.includes(s)) return prev
      return prev ? `${prev}、${s}` : s
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* 页头 */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">辅助诊断</h2>
        <p className="text-2xs text-gray-400">基于症状体征，智能推荐可能诊断</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 录音转写同步提示 */}
        {canSyncTranscript && (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded border border-primary-200
                          bg-primary-50">
            <Mic size={12} className="text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-2xs text-gray-600 truncate">
                <span className="font-medium text-primary">录音转写：</span>{transcript}
              </p>
            </div>
            <button
              onClick={syncTranscript}
              className="text-2xs text-white bg-primary hover:bg-primary-600
                         px-2 py-1 rounded flex-shrink-0 transition-colors"
            >
              填入
            </button>
          </div>
        )}

        {/* 症状输入 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">症状 / 主诉</label>
          <div className="flex gap-1.5">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="输入症状，如：胸痛、胸闷、气短"
              icon={<Search size={13} />}
              className="flex-1"
            />
            <Button onClick={handleSearch} size="sm" disabled={loading}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : '分析'}
            </Button>
          </div>

          {/* 常见症状快捷标签 */}
          <div className="flex flex-wrap gap-1">
            {COMMON_SYMPTOMS.map(s => (
              <button
                key={s}
                onClick={() => addSymptom(s)}
                className="text-2xs px-1.5 py-0.5 rounded-sm border border-border
                           bg-gray-50 text-gray-600 hover:bg-primary-50 hover:border-primary
                           hover:text-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 当前已有诊断 */}
        {patient?.diagnosis_names?.length > 0 && (
          <div className="rounded border border-border bg-patient-bg/50 px-2.5 py-2">
            <p className="text-2xs text-gray-500 mb-1.5">当前已有诊断</p>
            <div className="flex flex-wrap gap-1">
              {patient.diagnosis_names.map(d => (
                <Badge key={d} variant="blue">{d}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* 分析中 */}
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">正在分析中...</span>
          </div>
        )}

        {/* 无结果 */}
        {searched && !loading && results.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">未找到相关诊断建议</p>
        )}

        {/* 诊断结果 */}
        {searched && !loading && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-2xs text-gray-500">
              共找到 {results.length} 个可能诊断（按相关度排序）
            </p>
            {results.map((r, i) => (
              <DiagnosisResultCard
                key={r.disease_id}
                result={r}
                rank={i + 1}
                onDetail={() => navigate(`/knowledge/disease/${r.disease_id}`)}
              />
            ))}
          </div>
        )}

        {/* 未搜索提示 */}
        {!searched && !loading && (
          <div className="text-center py-6 text-gray-400">
            <Search size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">输入症状后点击"分析"获取诊断建议</p>
            {recStatus === 'recording' && (
              <p className="text-2xs text-primary mt-1">录音中，可点击上方"填入"同步转写内容</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DiagnosisResultCard({ result, rank, onDetail }) {
  const scoreColor = result.match_score >= 0.8
    ? 'text-danger'
    : result.match_score >= 0.6
      ? 'text-warning'
      : 'text-gray-500'

  const scoreBarColor = result.match_score >= 0.8
    ? 'bg-red-400'
    : result.match_score >= 0.6
      ? 'bg-orange-400'
      : 'bg-gray-300'

  return (
    <div className="rounded border border-border bg-white overflow-hidden">
      {/* 标题行 */}
      <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50">
        <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center
                          text-2xs font-bold text-gray-600 flex-shrink-0">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-800 truncate">
              {result.disease_name}
            </span>
            <span className="text-2xs text-gray-400 flex-shrink-0">{result.icd_code}</span>
          </div>
        </div>

        {/* 相关度 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={cn('h-full rounded-full', scoreBarColor)}
              style={{ width: `${result.match_score * 100}%` }}
            />
          </div>
          <span className={cn('text-2xs font-medium', scoreColor)}>
            {Math.round(result.match_score * 100)}%
          </span>
        </div>
      </div>

      {/* 内容 */}
      <div className="px-2.5 py-2 space-y-1.5">
        {result.warning && (
          <div className="flex items-start gap-1.5 bg-red-50 rounded px-2 py-1.5 border border-red-100">
            <AlertCircle size={11} className="text-danger mt-0.5 flex-shrink-0" />
            <span className="text-2xs text-danger">{result.warning}</span>
          </div>
        )}

        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-2xs text-gray-400">匹配症状：</span>
          {result.matched_symptoms.map(s => (
            <span
              key={s}
              className="text-2xs bg-primary-50 text-primary border border-primary-200
                         px-1 py-0.5 rounded-sm"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onDetail}
            className="flex items-center gap-0.5 text-2xs text-primary hover:underline"
          >
            查看疾病详情 <ExternalLink size={10} />
          </button>
        </div>
      </div>
    </div>
  )
}
