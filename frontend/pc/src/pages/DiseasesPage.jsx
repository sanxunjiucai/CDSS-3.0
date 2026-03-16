import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { diseaseApi } from '@/api'
import { KnowledgeCard } from '@/components/common/KnowledgeCard'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const DEPARTMENTS = [
  '内科', '外科', '妇产科', '儿科', '神经科',
  '心血管科', '呼吸科', '消化科', '内分泌科', '肿瘤科',
  '感染科', '肾内科', '风湿免疫科', '皮肤科', '眼科',
  '耳鼻喉科', '口腔科', '骨科', '泌尿科', '急诊科',
]

export function DiseasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dept = searchParams.get('department') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const q    = searchParams.get('q') || ''

  const [items, setItems]         = useState([])
  const [total, setTotal]         = useState(0)
  const [totalPages, setPages]    = useState(0)
  const [loading, setLoading]     = useState(false)
  const [inputQ, setInputQ]       = useState(q)

  useEffect(() => {
    setLoading(true)
    diseaseApi.list({ department: dept || undefined, page, pageSize: 20, q: q || undefined })
      .then(data => {
        setItems(data.items || [])
        setTotal(data.total || 0)
        setPages(data.total_pages || 0)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [dept, page, q])

  const setDept = (d) => {
    const p = new URLSearchParams()
    if (d) p.set('department', d)
    if (inputQ) p.set('q', inputQ)
    setSearchParams(p)
  }

  const handleSearch = () => {
    const p = new URLSearchParams()
    if (dept) p.set('department', dept)
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
      {/* 页面标题 */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Activity size={16} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">疾病知识库</h1>
          <p className="text-sm text-gray-500">疾病概述、病因、诊断标准、治疗方案、预后</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左侧科室筛选 */}
        <aside className="w-[160px] flex-shrink-0">
          <div className="bg-white border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border text-sm font-medium text-gray-700">
              科室分类
            </div>
            <button
              onClick={() => setDept('')}
              className={cn(
                'w-full text-left px-3 py-2 text-sm transition-colors',
                'hover:bg-primary-50 hover:text-primary',
                !dept ? 'bg-primary-50 text-primary font-medium border-l-2 border-primary' : 'text-gray-600'
              )}
            >
              全部科室
            </button>
            {DEPARTMENTS.map(d => (
              <button
                key={d}
                onClick={() => setDept(d)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  'hover:bg-primary-50 hover:text-primary',
                  dept === d ? 'bg-primary-50 text-primary font-medium border-l-2 border-primary' : 'text-gray-600'
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </aside>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0">
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
                placeholder="搜索疾病名称、ICD编码..."
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

          {/* 结果统计 */}
          <p className="text-sm text-gray-500 mb-3">
            {dept ? `${dept} · ` : ''}共 <span className="font-medium text-gray-800">{total}</span> 条疾病
          </p>

          {/* 列表 */}
          {loading ? (
            <LoadingSpinner />
          ) : items.length === 0 ? (
            <EmptyState type="empty" message="该分类暂未录入疾病数据" />
          ) : (
            <>
              <div className="space-y-3">
                {items.map(item => (
                  <KnowledgeCard key={item.id} item={item} type="disease" />
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
