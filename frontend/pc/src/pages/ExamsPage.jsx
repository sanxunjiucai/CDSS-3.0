import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FlaskConical, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { examApi } from '@/api'
import { KnowledgeCard } from '@/components/common/KnowledgeCard'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const EXAM_TYPES = [
  { value: '',     label: '全部' },
  { value: 'lab',  label: '检验（化验）' },
  { value: 'exam', label: '检查（影像/功能）' },
]

export function ExamsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const type = searchParams.get('type') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const q    = searchParams.get('q') || ''

  const [items, setItems]       = useState([])
  const [total, setTotal]       = useState(0)
  const [totalPages, setPages]  = useState(0)
  const [loading, setLoading]   = useState(false)
  const [inputQ, setInputQ]     = useState(q)

  useEffect(() => {
    setLoading(true)
    examApi.list({ type: type || undefined, page, pageSize: 20, q: q || undefined })
      .then(data => {
        setItems(data.items || [])
        setTotal(data.total || 0)
        setPages(data.total_pages || 0)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [type, page, q])

  const setType = (t) => {
    const p = new URLSearchParams()
    if (t) p.set('type', t)
    if (inputQ) p.set('q', inputQ)
    setSearchParams(p)
  }

  const handleSearch = () => {
    const p = new URLSearchParams()
    if (type) p.set('type', type)
    if (inputQ.trim()) p.set('q', inputQ.trim())
    setSearchParams(p)
  }

  const handlePageChange = (p) => {
    const params = new URLSearchParams(searchParams)
    if (p > 1) params.set('page', p)
    else params.delete('page')
    setSearchParams(params)
    window.scrollTo(0, 0)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
          <FlaskConical size={16} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">检验检查知识库</h1>
          <p className="text-sm text-gray-500">检验项目说明、参考范围、临床意义、检查前准备</p>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="w-[160px] flex-shrink-0">
          <div className="bg-white border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border text-sm font-medium text-gray-700">
              项目类型
            </div>
            {EXAM_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors hover:bg-primary-50 hover:text-primary',
                  type === t.value ? 'bg-primary-50 text-primary font-medium border-l-2 border-primary' : 'text-gray-600'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-white border border-border rounded-lg
                            px-3 py-2 focus-within:border-primary transition-colors">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                value={inputQ}
                onChange={e => setInputQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="搜索检验项目名称、编码..."
                className="flex-1 text-sm outline-none placeholder-gray-400"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"
            >
              搜索
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-3">
            共 <span className="font-medium text-gray-800">{total}</span> 个检验检查项目
          </p>

          {loading ? (
            <LoadingSpinner />
          ) : items.length === 0 ? (
            <EmptyState type="empty" message="该分类暂未录入数据" />
          ) : (
            <>
              <div className="space-y-3">
                {items.map(item => (
                  <KnowledgeCard key={item.id} item={item} type="exam" />
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
