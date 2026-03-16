import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Search } from 'lucide-react'
import { literatureApi } from '@/api'
import { KnowledgeCard } from '@/components/common/KnowledgeCard'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function CasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  const [inputQ, setInputQ] = useState(q)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    literatureApi.listCases({ q, page, pageSize: 20 })
      .then(data => {
        setItems(data.items || [])
        setTotal(data.total || 0)
        setTotalPages(data.total_pages || 1)
      })
      .catch(() => {
        setItems([])
        setTotal(0)
        setTotalPages(1)
      })
      .finally(() => setLoading(false))
  }, [q, page])

  useEffect(() => {
    setInputQ(q)
  }, [q])

  const handleSearch = () => {
    const params = new URLSearchParams()
    const trimmed = inputQ.trim()
    if (trimmed) params.set('q', trimmed)
    setSearchParams(params)
  }

  const handlePageChange = (p) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (p > 1) params.set('page', p)
    setSearchParams(params)
    window.scrollTo(0, 0)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-fuchsia-100 flex items-center justify-center">
          <FileText size={16} className="text-fuchsia-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">案例文献库</h1>
          <p className="text-sm text-gray-500">病例报告、病例系列与典型案例</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 focus-within:border-primary transition-colors">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            value={inputQ}
            onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索病例标题、摘要、期刊..."
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
        共 <span className="font-medium text-gray-800">{total}</span> 篇案例文献
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState type="empty" message="暂无案例文献数据" />
      ) : (
        <>
          <div className="space-y-3">
            {items.map(item => (
              <KnowledgeCard key={item.id} item={{ ...item, name: item.title }} type="case" />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
        </>
      )}
    </div>
  )
}
