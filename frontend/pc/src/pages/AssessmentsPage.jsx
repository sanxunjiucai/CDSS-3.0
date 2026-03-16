import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Search, ChevronRight } from 'lucide-react'
import { assessmentApi } from '@/api'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { TagBadge } from '@/components/common/TagBadge'

export function AssessmentsPage() {
  const navigate            = useNavigate()
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ]           = useState('')

  useEffect(() => {
    setLoading(true)
    assessmentApi.list({ pageSize: 50, q: q || undefined })
      .then(data => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [q])

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
          <ClipboardList size={16} className="text-pink-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">评估量表</h1>
          <p className="text-sm text-gray-500">CURB-65、Wells、GCS、APACHE II 等临床常用量表</p>
        </div>
      </div>

      {/* 搜索 */}
      <div className="flex items-center gap-2 bg-white border border-border rounded-lg
                      px-3 py-2 focus-within:border-primary transition-colors max-w-[480px] mb-6">
        <Search size={14} className="text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="搜索量表名称..."
          className="flex-1 text-sm outline-none placeholder-gray-400"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState type="empty" message="暂未录入量表数据" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => navigate(`/assessments/${item.id}`)}
              className="bg-white border border-border rounded-md p-4 cursor-pointer
                         hover:shadow-card-hover hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1.5">{item.name}</h3>
                  {item.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>
                  )}
                  {item.category && <TagBadge color="default">{item.category}</TagBadge>}
                </div>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
              </div>
              <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {item.question_count || 0} 题
                </span>
                <span className="text-xs text-primary">开始评估 →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
