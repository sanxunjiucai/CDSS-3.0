import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { BookOpen, Search, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { guidelineApi } from '@/api'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { TagBadge } from '@/components/common/TagBadge'

export function GuidelinesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const page  = parseInt(searchParams.get('page') || '1', 10)
  const q     = searchParams.get('q') || ''

  const [items, setItems]       = useState([])
  const [total, setTotal]       = useState(0)
  const [totalPages, setPages]  = useState(0)
  const [loading, setLoading]   = useState(false)
  const [inputQ, setInputQ]     = useState(q)

  useEffect(() => {
    setLoading(true)
    guidelineApi.list({ page, pageSize: 20, q: q || undefined })
      .then(data => {
        setItems(data.items || [])
        setTotal(data.total || 0)
        setPages(data.total_pages || 0)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [page, q])

  const handleSearch = () => {
    const p = new URLSearchParams()
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
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
          <BookOpen size={16} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">临床指南库</h1>
          <p className="text-sm text-gray-500">权威临床指南、诊疗规范、专家共识</p>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-border rounded-lg
                        px-3 py-2 focus-within:border-primary transition-colors">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            value={inputQ}
            onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索指南名称、关键词..."
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
        共 <span className="font-medium text-gray-800">{total}</span> 篇临床指南
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState type="empty" message="暂未录入临床指南数据" />
      ) : (
        <>
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/guidelines/${item.id}`)}
                className="bg-white border border-border rounded-md p-4 cursor-pointer
                           hover:shadow-card-hover hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 mb-1.5">{item.title || item.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.department    && <TagBadge color="purple">{item.department}</TagBadge>}
                      {item.publish_year  && <TagBadge color="default">{item.publish_year}年</TagBadge>}
                      {item.organization  && <span className="text-xs text-gray-400 truncate max-w-[240px]">{item.organization}</span>}
                    </div>
                    {item.summary && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{item.summary}</p>
                    )}
                  </div>
                  {item.file_url && (
                    <button
                      onClick={e => { e.stopPropagation(); window.open(item.file_url, '_blank') }}
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-primary
                                 bg-primary-50 px-2.5 py-1.5 rounded hover:bg-primary-100 transition-colors"
                    >
                      <Download size={12} />
                      下载
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
        </>
      )}
    </div>
  )
}
