import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pill, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { drugApi } from '@/api'
import { KnowledgeCard } from '@/components/common/KnowledgeCard'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const CATEGORIES = [
  '抗菌药物', '心血管药物', '呼吸系统药物', '消化系统药物',
  '神经系统药物', '内分泌代谢药物', '抗肿瘤药物', '免疫调节药',
  '镇痛药物', '中成药', '生物制品', '其他',
]

export function DrugsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const cat  = searchParams.get('category') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const q    = searchParams.get('q') || ''

  const [items, setItems]       = useState([])
  const [total, setTotal]       = useState(0)
  const [totalPages, setPages]  = useState(0)
  const [loading, setLoading]   = useState(false)
  const [inputQ, setInputQ]     = useState(q)

  useEffect(() => {
    setLoading(true)
    drugApi.list({ category: cat || undefined, page, pageSize: 20, q: q || undefined })
      .then(data => {
        setItems(data.items || [])
        setTotal(data.total || 0)
        setPages(data.total_pages || 0)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [cat, page, q])

  const setCat = (c) => {
    const p = new URLSearchParams()
    if (c) p.set('category', c)
    if (inputQ) p.set('q', inputQ)
    setSearchParams(p)
  }

  const handleSearch = () => {
    const p = new URLSearchParams()
    if (cat) p.set('category', cat)
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
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
          <Pill size={16} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">药品库</h1>
          <p className="text-sm text-gray-500">药品说明书、适应症、用法用量、禁忌、不良反应</p>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="w-[160px] flex-shrink-0">
          <div className="bg-white border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border text-sm font-medium text-gray-700">
              药品分类
            </div>
            <button
              onClick={() => setCat('')}
              className={cn(
                'w-full text-left px-3 py-2 text-sm transition-colors hover:bg-primary-50 hover:text-primary',
                !cat ? 'bg-primary-50 text-primary font-medium border-l-2 border-primary' : 'text-gray-600'
              )}
            >
              全部药品
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors hover:bg-primary-50 hover:text-primary',
                  cat === c ? 'bg-primary-50 text-primary font-medium border-l-2 border-primary' : 'text-gray-600'
                )}
              >
                {c}
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
                placeholder="搜索药品通用名、商品名..."
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
            共 <span className="font-medium text-gray-800">{total}</span> 条药品
          </p>

          {loading ? (
            <LoadingSpinner />
          ) : items.length === 0 ? (
            <EmptyState type="empty" message="该分类暂未录入药品数据" />
          ) : (
            <>
              <div className="space-y-3">
                {items.map(item => (
                  <KnowledgeCard key={item.id} item={item} type="drug" />
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
