import { useState, useEffect, useCallback } from 'react'
import { Search, ExternalLink, BookOpen, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

// 后端 guideline 实际存在的科室
const DEPARTMENTS = ['全部', '心血管科', '内分泌科', '呼吸内科', '神经科', '肾内科', '消化科', '急诊科', '肝病科']

export function GuidelinePanel() {
  const patient = usePatientStore(s => s.context)

  const [query,      setQuery]      = useState('')
  const [department, setDepartment] = useState('全部')
  const [guidelines, setGuidelines] = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  const patientDiagnoses = patient?.diagnosis_names || []

  // 判断指南是否与当前患者相关（disease_tags 与诊断名交叉）
  const isRelevant = (g) => {
    const tags = g.disease_tags || []
    return patientDiagnoses.some(dn =>
      tags.some(t => t.includes(dn) || dn.includes(t))
    )
  }

  const fetchGuidelines = useCallback(async (q, dept) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: 1, page_size: 50 })
      if (q.trim())         params.set('q', q.trim())
      if (dept !== '全部')  params.set('department', dept)

      const res  = await fetch(`${API_BASE}/guidelines?${params}`)
      const json = await res.json()
      setGuidelines(json.data?.items || [])
      setTotal(json.data?.total || 0)
    } catch {
      setError('指南服务暂时不可用')
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载 + 科室切换立即请求
  useEffect(() => {
    fetchGuidelines(query, department)
  }, [department]) // eslint-disable-line

  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchGuidelines(query, department)
  }

  const relevant = guidelines.filter(isRelevant)
  const others   = guidelines.filter(g => !isRelevant(g))

  return (
    <div className="flex flex-col h-full">
      {/* 页头 */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">临床指南</h2>
        <p className="text-2xs text-gray-400">
          {total > 0 ? `共 ${total} 条，点击在 PC 端查看全文` : '浏览与搜索诊疗指南'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 搜索区 */}
        <div className="px-3 pt-3 pb-2 space-y-2">
          <div className="flex gap-1.5">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="搜索指南名称、关键词…"
              icon={<Search size={13} />}
              className="flex-1"
            />
            <button
              onClick={() => fetchGuidelines(query, department)}
              className="px-3 py-1.5 rounded border border-primary text-primary text-xs
                         hover:bg-primary hover:text-white transition-colors flex-shrink-0"
            >
              搜索
            </button>
          </div>

          {/* 科室筛选 */}
          <div className="flex gap-1 flex-wrap">
            {DEPARTMENTS.map(d => (
              <button
                key={d}
                onClick={() => setDepartment(d)}
                className={cn(
                  'text-2xs px-2.5 py-1 rounded-full border transition-colors',
                  department === d
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-500 border-border hover:border-primary hover:text-primary'
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 结果区 */}
        <div className="px-3 pb-3 space-y-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs">加载中…</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8 text-xs text-danger">{error}</div>
          )}

          {!loading && !error && guidelines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
              <BookOpen size={24} className="opacity-30" />
              <p className="text-xs">未找到相关指南</p>
            </div>
          )}

          {!loading && !error && guidelines.length > 0 && (
            <>
              {/* 患者相关指南 */}
              {relevant.length > 0 && !query.trim() && (
                <section>
                  <p className="text-2xs font-medium text-gray-500 mb-1.5">
                    📋 与当前患者相关（{relevant.length}）
                  </p>
                  <div className="space-y-2">
                    {relevant.map(g => (
                      <GuidelineItem key={g.id} guideline={g} highlighted />
                    ))}
                  </div>
                  <div className="border-t border-dashed border-gray-200 my-3" />
                </section>
              )}

              {/* 全部/搜索结果 */}
              <section>
                {!query.trim() && relevant.length > 0 && (
                  <p className="text-2xs font-medium text-gray-500 mb-1.5">全部指南</p>
                )}
                {query.trim() && (
                  <p className="text-2xs font-medium text-gray-500 mb-1.5">
                    搜索"{query}"，共 {guidelines.length} 条
                  </p>
                )}
                <div className="space-y-2">
                  {(query.trim() ? guidelines : others).map(g => (
                    <GuidelineItem key={g.id} guideline={g} />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function GuidelineItem({ guideline: g, highlighted = false }) {
  const tags = g.disease_tags || []

  return (
    <div className={cn(
      'rounded border bg-white overflow-hidden transition-colors hover:border-primary/50',
      highlighted ? 'border-primary-200' : 'border-border'
    )}>
      <div className="flex items-start gap-2 px-2.5 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 leading-snug">{g.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-2xs text-gray-400 truncate max-w-[120px]">{g.organization}</span>
            {g.publish_year && (
              <>
                <span className="text-gray-300 text-2xs">·</span>
                <span className="text-2xs text-gray-400">{g.publish_year}</span>
              </>
            )}
            {g.department && (
              <span className="text-2xs bg-gray-100 text-gray-500 px-1 py-px rounded-sm">
                {g.department}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => window.open(`/pc/#/guidelines/${g.id}`, '_blank')}
          className="text-gray-300 hover:text-primary flex-shrink-0 transition-colors mt-0.5"
          title="在PC端查看全文"
        >
          <ExternalLink size={12} />
        </button>
      </div>

      {/* 疾病标签 */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1 px-2.5 pb-2 flex-wrap">
          {tags.slice(0, 4).map(t => (
            <span key={t} className="text-2xs bg-gray-100 text-gray-500 px-1 py-0.5 rounded-sm">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
