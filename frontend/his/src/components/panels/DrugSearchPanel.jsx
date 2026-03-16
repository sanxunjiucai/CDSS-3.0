import { useState, useEffect, useCallback } from 'react'
import { Search, AlertTriangle, ChevronRight, Pill, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

// 后端实际存在的分类
const CATEGORIES = ['全部', '药理学', '抗生素', '抗病毒药', '西药', '中成药']

// 常用药快捷搜索词
const COMMON_SEARCHES = ['阿司匹林', '氯吡格雷', '阿托伐他汀', '美托洛尔', '二甲双胍', '呋塞米', '氨氯地平']

export function DrugSearchPanel() {
  const navigate  = useNavigate()
  const patient   = usePatientStore(s => s.context)

  const [query,    setQuery]    = useState('')
  const [category, setCategory] = useState('全部')
  const [drugs,    setDrugs]    = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const allergies   = patient?.allergies || []
  const currentMeds = patient?.current_medications || []

  // 判断药品名是否与患者过敏交叉
  const isAllergyRisk = (drugName) =>
    allergies.some(a =>
      drugName.includes(a) || a.includes(drugName) ||
      // 青霉素类交叉
      (a.includes('青霉素') && (drugName.includes('青霉素') || drugName.includes('阿莫西林') || drugName.includes('氨苄')))
    )

  const fetchDrugs = useCallback(async (q, cat) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: 1, page_size: 30 })
      if (q.trim())       params.set('q', q.trim())
      if (cat !== '全部') params.set('category', cat)

      const res  = await fetch(`${API_BASE}/drugs?${params}`)
      const json = await res.json()
      setDrugs(json.data?.items || [])
      setTotal(json.data?.total || 0)
    } catch {
      setError('药品服务暂时不可用')
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载 + 分类切换时立即请求
  useEffect(() => {
    fetchDrugs(query, category)
  }, [category]) // eslint-disable-line

  // 搜索框回车
  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchDrugs(query, category)
  }

  // 快捷词点击
  const handleQuick = (word) => {
    setQuery(word)
    setCategory('全部')
    fetchDrugs(word, '全部')
  }

  const goDetail = (drug) => navigate(`/knowledge/drug/${drug.id}`)

  return (
    <div className="flex flex-col h-full">
      {/* 页头 */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">药品查询</h2>
        <p className="text-2xs text-gray-400">
          {total > 0 ? `共 ${total} 条` : '搜索药品说明、禁忌、用法用量'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 搜索区 */}
        <div className="px-3 pt-3 pb-2 space-y-2">
          <div className="flex gap-1.5">
            <Input
              className="flex-1"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="搜索药品名称、适应症…"
              icon={<Search size={13} />}
            />
            <button
              onClick={() => fetchDrugs(query, category)}
              className="px-3 py-1.5 rounded border border-primary text-primary text-xs
                         hover:bg-primary hover:text-white transition-colors flex-shrink-0"
            >
              搜索
            </button>
          </div>

          {/* 常用药快捷标签 */}
          <div className="flex gap-1 flex-wrap">
            {COMMON_SEARCHES.map(w => (
              <button
                key={w}
                onClick={() => handleQuick(w)}
                className="text-2xs px-2 py-1 rounded border border-border bg-white
                           text-gray-500 hover:border-primary hover:text-primary transition-colors"
              >
                {w}
              </button>
            ))}
          </div>

          {/* 分类筛选 */}
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'text-2xs px-2.5 py-1 rounded-full border transition-colors',
                  category === c
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-500 border-border hover:border-primary hover:text-primary'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 当前用药 */}
        {currentMeds.length > 0 && (
          <div className="px-3 pb-2">
            <p className="text-2xs font-medium text-gray-500 mb-1">患者当前用药</p>
            <div className="flex flex-wrap gap-1">
              {currentMeds.map(m => (
                <span
                  key={m}
                  className="text-2xs bg-primary-50 text-primary border border-primary-200 px-1.5 py-0.5 rounded-sm"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 结果区 */}
        <div className="px-3 pb-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs">加载中…</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8 text-xs text-danger">{error}</div>
          )}

          {!loading && !error && drugs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
              <Pill size={24} className="opacity-30" />
              <p className="text-xs">未找到相关药品</p>
            </div>
          )}

          {!loading && !error && drugs.length > 0 && (
            <div className="space-y-1.5">
              {drugs.map(drug => {
                const allergyRisk = isAllergyRisk(drug.name)
                return (
                  <button
                    key={drug.id}
                    onClick={() => goDetail(drug)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded border text-left',
                      'bg-white hover:bg-gray-50 transition-colors group',
                      allergyRisk ? 'border-red-300 bg-red-50' : 'border-border'
                    )}
                  >
                    {/* 图标 */}
                    <div className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
                      allergyRisk ? 'bg-red-100' : 'bg-primary-50'
                    )}>
                      {allergyRisk
                        ? <AlertTriangle size={13} className="text-danger" />
                        : <Pill size={13} className="text-primary" />
                      }
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn(
                          'text-xs font-medium truncate',
                          allergyRisk ? 'text-danger' : 'text-gray-800'
                        )}>
                          {drug.name}
                        </span>
                        {allergyRisk && (
                          <span className="text-2xs bg-red-100 text-danger border border-red-200
                                           px-1 py-px rounded-sm flex-shrink-0">过敏风险</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {drug.trade_name && (
                          <span className="text-2xs text-gray-400 truncate">{drug.trade_name}</span>
                        )}
                        {drug.category && (
                          <span className="text-2xs bg-gray-100 text-gray-500 px-1 py-px rounded-sm flex-shrink-0">
                            {drug.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={12} className="text-gray-300 group-hover:text-primary
                                                        flex-shrink-0 transition-colors" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
