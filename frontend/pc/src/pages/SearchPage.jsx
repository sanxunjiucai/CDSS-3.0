import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Filter } from 'lucide-react'
import { cn, TYPE_LABELS, TYPE_COLORS } from '@/lib/utils'
import { searchApi } from '@/api'
import { KnowledgeCard } from '@/components/common/KnowledgeCard'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const TYPE_FILTERS = [
  { value: '',           label: '全部' },
  { value: 'disease',    label: '疾病',     count: null },
  { value: 'drug',       label: '药品',     count: null },
  { value: 'exam',       label: '检验检查', count: null },
  { value: 'guideline',  label: '临床指南', count: null },
  { value: 'formula',    label: '医学公式', count: null },
  { value: 'assessment', label: '量表',     count: null },
  { value: 'literature', label: '动态文献', count: null },
  { value: 'case',       label: '案例文献', count: null },
]

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const q    = searchParams.get('q') || ''
  const type = searchParams.get('type') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  const [results, setResults]   = useState([])
  const [total, setTotal]       = useState(0)
  const [totalPages, setPages]  = useState(0)
  const [counts, setCounts]     = useState({})
  const [loading, setLoading]   = useState(false)

  const [inputQ, setInputQ] = useState(q)

  const doSearch = useCallback(async () => {
    if (!q.trim()) return
    setLoading(true)
    try {
      const data = await searchApi.search(q, { type, page, pageSize: 20 })
      // 兼容后端返回格式：{ items, total, page, total_pages, counts }
      setResults(data.items || [])
      setTotal(data.total || 0)
      setPages(data.total_pages || 1)
      if (data.facets) setCounts(data.facets)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [q, type, page])

  useEffect(() => {
    setInputQ(q)
    doSearch()
  }, [doSearch, q])

  const handleSearch = () => {
    const trimmed = inputQ.trim()
    if (!trimmed) return
    const params = new URLSearchParams({ q: trimmed })
    if (type) params.set('type', type)
    setSearchParams(params)
  }

  const handleTypeChange = (newType) => {
    const params = new URLSearchParams({ q })
    if (newType) params.set('type', newType)
    setSearchParams(params)
  }

  const handlePageChange = (p) => {
    const params = new URLSearchParams({ q })
    if (type) params.set('type', type)
    if (p > 1) params.set('page', p)
    setSearchParams(params)
    window.scrollTo(0, 0)
  }

  return (
    <div>
      {/* 搜索框 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 bg-white border border-border rounded-lg
                        px-3 py-2 focus-within:border-primary transition-colors max-w-[720px]">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={inputQ}
            onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索知识内容..."
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary-600 transition-colors"
          >
            搜索
          </button>
        </div>
        {q && (
          <p className="text-sm text-gray-500 mt-2">
            搜索 "<span className="text-primary font-medium">{q}</span>" 共找到
            <span className="font-medium text-gray-800 mx-1">{total}</span> 条结果
          </p>
        )}
      </div>

      <div className="flex gap-6">
        {/* 左侧类型过滤 */}
        <aside className="w-[160px] flex-shrink-0">
          <div className="bg-white border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Filter size={13} />
              按类型筛选
            </div>
            {TYPE_FILTERS.map(tf => {
              const count = counts[tf.value] || (tf.value === '' ? total : null)
              return (
                <button
                  key={tf.value}
                  onClick={() => handleTypeChange(tf.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                    'hover:bg-primary-50 hover:text-primary',
                    tf.value === type
                      ? 'bg-primary-50 text-primary font-medium border-l-2 border-primary'
                      : 'text-gray-600'
                  )}
                >
                  <span>{tf.label}</span>
                  {count != null && (
                    <span className="text-xs text-gray-400">{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* 右侧结果列表 */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <LoadingSpinner />
          ) : results.length === 0 ? (
            <EmptyState type="search" message={q ? `未找到与"${q}"相关的内容` : '请输入关键词搜索'} />
          ) : (
            <>
              <div className="space-y-3">
                {results.map(item => (
                  <KnowledgeCard
                    key={`${item.type || type}-${item.id}`}
                    item={item}
                    type={item.type || type || 'disease'}
                  />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
