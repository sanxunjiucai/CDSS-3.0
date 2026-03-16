/**
 * SearchPanel — 内联搜索结果页
 * 从 URL 读取 q 和 type，调用后端 /api/v1/search，结果在侧边栏内展示。
 * 点击结果导航到 /knowledge/:type/:id（KnowledgeDetail）
 */
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Loader2, ChevronRight, FlaskConical, Pill, BookOpen, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

// type → 中文标签 + 图标
const TYPE_META = {
  disease:   { label: '疾病',   Icon: Stethoscope, color: 'text-blue-500',   bg: 'bg-blue-50'   },
  drug:      { label: '药品',   Icon: Pill,         color: 'text-green-500',  bg: 'bg-green-50'  },
  exam:      { label: '检验',   Icon: FlaskConical, color: 'text-orange-500', bg: 'bg-orange-50' },
  guideline: { label: '指南',   Icon: BookOpen,     color: 'text-purple-500', bg: 'bg-purple-50' },
}

// 搜索类型选项（与 HISLayout 的 KNOWLEDGE_TYPES 对应）
const FILTER_TABS = [
  { key: null,        label: '全部'   },
  { key: 'disease',  label: '疾病'   },
  { key: 'drug',     label: '药品'   },
  { key: 'exam',     label: '检验'   },
  { key: 'guideline',label: '指南'   },
]

export function SearchPanel() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const q    = searchParams.get('q') || ''
  const type = searchParams.get('type') || null   // null = 全部

  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [total,    setTotal]    = useState(0)
  const [facets,   setFacets]   = useState({})
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ q, page: 1, page_size: 20 })
    if (type) params.set('type', type)

    fetch(`${API_BASE}/search?${params}`)
      .then(r => r.json())
      .then(json => {
        const data = json.data || {}
        setResults(data.items || [])
        setTotal(data.total || 0)
        setFacets(data.facets || {})
      })
      .catch(() => setError('搜索服务暂时不可用'))
      .finally(() => setLoading(false))
  }, [q, type])

  // 切换 type 过滤时更新 URL
  const switchType = (newType) => {
    const params = new URLSearchParams({ q })
    if (newType) params.set('type', newType)
    navigate(`/search?${params}`)
  }

  const handleItemClick = (item) => {
    navigate(`/knowledge/${item.type}/${item.id}`)
  }

  return (
    <div className="flex flex-col h-full">

      {/* 页头 */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <div className="flex items-center gap-1.5">
          <Search size={13} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-800 truncate">
            {q ? `"${q}"` : '搜索'}
          </span>
          {!loading && total > 0 && (
            <span className="text-2xs text-gray-400 flex-shrink-0">共 {total} 条</span>
          )}
        </div>
      </div>

      {/* 类型过滤 Tab */}
      <div className="flex-shrink-0 flex gap-1 px-3 py-2 border-b border-border overflow-x-auto">
        {FILTER_TABS.map(tab => {
          const count = tab.key ? (facets[tab.key] ?? 0) : total
          const active = type === tab.key
          return (
            <button
              key={tab.key ?? 'all'}
              onClick={() => switchType(tab.key)}
              className={cn(
                'text-2xs px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors flex-shrink-0',
                active
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-border hover:border-primary hover:text-primary'
              )}
            >
              {tab.label}
              {!loading && count > 0 && (
                <span className={cn('ml-1', active ? 'text-white/70' : 'text-gray-400')}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 结果区 */}
      <div className="flex-1 overflow-y-auto">

        {/* 加载中 */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">搜索中…</span>
          </div>
        )}

        {/* 错误 */}
        {error && !loading && (
          <div className="text-center py-12 text-xs text-danger">{error}</div>
        )}

        {/* 无结果 */}
        {!loading && !error && results.length === 0 && q && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
            <Search size={28} className="opacity-30" />
            <p className="text-xs">未找到"{q}"相关内容</p>
            <p className="text-2xs text-gray-300">尝试更换关键词或选择其他类型</p>
          </div>
        )}

        {/* 结果列表 */}
        {!loading && !error && results.length > 0 && (
          <div className="divide-y divide-border">
            {results.map(item => (
              <SearchResultItem
                key={`${item.type}-${item.id}`}
                item={item}
                keyword={q}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── 单条结果 ────────────────────────────────────────────────── */
function SearchResultItem({ item, keyword, onClick }) {
  const meta = TYPE_META[item.type] || TYPE_META.disease
  const Icon = meta.Icon

  // 高亮关键词
  const highlight = (text) => {
    if (!keyword || !text) return text
    const idx = text.indexOf(keyword)
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-100 text-yellow-800 rounded-sm px-0.5 not-italic">
          {text.slice(idx, idx + keyword.length)}
        </mark>
        {text.slice(idx + keyword.length)}
      </>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left
                 hover:bg-gray-50 transition-colors group"
    >
      {/* 类型图标 */}
      <div className={cn(
        'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5',
        meta.bg
      )}>
        <Icon size={13} className={meta.color} />
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-medium text-gray-800 truncate">
            {highlight(item.name)}
          </span>
          <span className={cn(
            'text-2xs px-1 py-px rounded flex-shrink-0',
            meta.bg, meta.color
          )}>
            {meta.label}
          </span>
        </div>
        {item.snippet && (
          <p className="text-2xs text-gray-400 line-clamp-2 leading-relaxed">
            {highlight(item.snippet)}
          </p>
        )}
        {item.department && (
          <p className="text-2xs text-gray-300 mt-0.5">{item.department}</p>
        )}
      </div>

      <ChevronRight size={12} className="text-gray-300 group-hover:text-primary
                                          flex-shrink-0 transition-colors mt-1" />
    </button>
  )
}
