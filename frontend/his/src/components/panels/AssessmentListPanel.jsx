import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ChevronRight, Sparkles, Loader2, Search } from 'lucide-react'
import { usePatientStore } from '@/stores/patient'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

// 按量表名称关键词匹配患者诊断
const RELEVANCE_KEYWORDS = {
  'CHA₂DS₂-VASc': ['心房颤动', '房颤'],
  'HAS-BLED':     ['心房颤动', '房颤'],
  'CURB-65':      ['肺炎', '社区获得性肺炎'],
  'Wells DVT':    ['深静脉血栓', 'DVT'],
  'Wells PE':     ['肺栓塞', 'PE'],
  'qSOFA':        ['脓毒症', '感染性休克', '脓毒血症'],
  'SOFA':         ['脓毒症', '感染性休克', '脓毒血症'],
  'GCS':          ['意识障碍', '昏迷', '脑梗', '脑出血'],
  'Child-Pugh':   ['肝硬化', '肝功能', '肝炎'],
  'NRS-2002':     ['营养不良', '营养风险'],
  'Braden':       ['压疮', '长期卧床', '褥疮'],
  'Morse':        ['跌倒'],
  'NRS':          ['疼痛', '癌症', '肿瘤'],
}

function isRelevant(assessmentName, diagnosisNames) {
  if (!diagnosisNames?.length) return false
  for (const [key, keywords] of Object.entries(RELEVANCE_KEYWORDS)) {
    if (!assessmentName.includes(key)) continue
    return diagnosisNames.some(dn => keywords.some(kw => dn.includes(kw) || kw.includes(dn)))
  }
  return false
}

const DEPT_COLOR = {
  '心血管':    'bg-gray-100 text-red-600 border-gray-200',
  '感染/呼吸': 'bg-gray-100 text-blue-600 border-gray-200',
  '血栓/凝血': 'bg-gray-100 text-purple-600 border-gray-200',
  '感染/脓毒症': 'bg-gray-100 text-orange-600 border-gray-200',
  '神经系统':  'bg-gray-100 text-indigo-600 border-gray-200',
  '护理评估':  'bg-gray-100 text-pink-600 border-gray-200',
  '营养评估':  'bg-gray-100 text-green-600 border-gray-200',
  '症状评估':  'bg-gray-100 text-amber-600 border-gray-200',
  '肝病':      'bg-gray-100 text-yellow-700 border-gray-200',
}

export function AssessmentListPanel() {
  const navigate = useNavigate()
  const patient  = usePatientStore(s => s.context)
  const diagnoses = patient?.diagnosis_names || []

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [query,   setQuery]   = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/assessments?page_size=50`)
      .then(r => r.json())
      .then(json => setItems(json.data?.items || []))
      .catch(() => setError('量表服务暂时不可用'))
      .finally(() => setLoading(false))
  }, [])

  // 客户端搜索过滤
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q) ||
      (a.department || '').toLowerCase().includes(q)
    )
  }, [items, query])

  const recommended = filtered.filter(a => isRelevant(a.name, diagnoses))
  const others      = filtered.filter(a => !isRelevant(a.name, diagnoses))

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">量表评估</h2>
        <p className="text-2xs text-gray-400">
          {loading ? '加载中…'
            : error ? error
            : recommended.length > 0
              ? `根据当前诊断推荐 ${recommended.length} 个量表`
              : '选择量表开始评估，患者信息将自动预填'}
        </p>
      </div>

      {/* 搜索区 */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-border">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索量表名称或科室…"
          icon={<Search size={13} />}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">加载中…</span>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <ShieldCheck size={24} className="opacity-30" />
            <p className="text-xs">未找到相关量表</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {recommended.length > 0 && (
              <section>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={11} className="text-primary" />
                  <span className="text-2xs font-medium text-primary">与当前诊断相关</span>
                </div>
                <div className="space-y-2">
                  {recommended.map(a => (
                    <AssessmentItem
                      key={a.id} item={a} recommended
                      onClick={() => navigate(`/assessment/${a.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              {recommended.length > 0 && (
                <p className="text-2xs font-medium text-gray-400 mb-2">其他量表</p>
              )}
              <div className="space-y-2">
                {others.map(a => (
                  <AssessmentItem
                    key={a.id} item={a} recommended={false}
                    onClick={() => navigate(`/assessment/${a.id}`)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function AssessmentItem({ item, recommended, onClick }) {
  const deptColor = DEPT_COLOR[item.department] || 'bg-gray-50 text-gray-500 border-gray-200'
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded border text-left',
        'bg-white hover:bg-gray-50 transition-colors group',
        recommended ? 'border-primary-200' : 'border-border'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        recommended ? 'bg-primary-50' : 'bg-gray-100'
      )}>
        <ShieldCheck size={15} className={recommended ? 'text-primary' : 'text-gray-400'} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-xs font-semibold text-gray-800">{item.name}</span>
          {item.department && (
            <span className={cn('text-2xs px-1 py-0.5 rounded-sm border flex-shrink-0', deptColor)}>
              {item.department}
            </span>
          )}
          {recommended && (
            <span className="text-2xs bg-primary-50 text-primary border border-primary-200
                             px-1 py-0.5 rounded-sm flex-shrink-0">推荐</span>
          )}
        </div>
        {item.description && (
          <p className="text-2xs text-gray-400 truncate">{item.description}</p>
        )}
        <p className="text-2xs text-gray-300 mt-0.5">{item.question_count} 个问题</p>
      </div>

      <ChevronRight size={13} className="text-gray-300 group-hover:text-primary
                                          flex-shrink-0 transition-colors" />
    </button>
  )
}
