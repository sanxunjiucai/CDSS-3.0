import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, Newspaper, FileText } from 'lucide-react'
import { literatureAdminApi } from '@/api'
import { useListPage } from '@/hooks/useListPage'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'

const TABS = [
  { key: 'literature', label: '动态文献' },
  { key: 'case', label: '案例文献' },
]

function formatTime(value) {
  if (!value) return '—'
  return new Date(value * 1000).toLocaleString('zh-CN')
}

export function LiteratureAdminPage() {
  const [tab, setTab] = useState('literature')
  const [stats, setStats] = useState(null)
  const [reloading, setReloading] = useState(false)

  const fetchFn = useCallback((params) => {
    if (tab === 'case') return literatureAdminApi.listCases(params)
    return literatureAdminApi.listLiterature(params)
  }, [tab])

  const {
    items,
    total,
    totalPages,
    page,
    inputQ,
    loading,
    setInputQ,
    handleSearch,
    handlePageChange,
    reload,
  } = useListPage(fetchFn)

  const loadStats = useCallback(() => {
    literatureAdminApi.stats().then(setStats).catch(() => setStats(null))
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    reload()
  }, [tab, reload])

  const handleReload = async () => {
    setReloading(true)
    try {
      await literatureAdminApi.reload()
      reload()
      loadStats()
    } finally {
      setReloading(false)
    }
  }

  const fileInfo = tab === 'case' ? stats?.case_file : stats?.dynamic_file

  const columns = useMemo(() => ([
    {
      key: 'title',
      title: '标题',
      render: (v) => <span className="font-medium text-gray-900 line-clamp-2">{v || '—'}</span>,
    },
    { key: 'department', title: '科室', width: '130px' },
    { key: 'journal', title: '期刊', width: '180px' },
    { key: 'publish_year', title: '年份', width: '80px' },
    {
      key: 'published_at',
      title: '发布日期',
      width: '120px',
      render: (v) => (v ? String(v).slice(0, 10) : '—'),
    },
  ]), [])

  return (
    <div>
      <PageHeader
        icon={tab === 'case' ? FileText : Newspaper}
        color={tab === 'case' ? 'purple' : 'indigo'}
        title="文献库管理"
        description={`当前分类共 ${total} 条`}
        action={(
          <button
            onClick={handleReload}
            disabled={reloading}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-60 transition-colors"
          >
            <RefreshCw size={14} className={reloading ? 'animate-spin' : ''} />
            {reloading ? '刷新中...' : '刷新文献缓存'}
          </button>
        )}
      />

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">动态文献总数</p>
          <p className="text-2xl font-bold text-gray-900">{(stats?.literature_count || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">案例文献总数</p>
          <p className="text-2xl font-bold text-gray-900">{(stats?.case_count || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">当前数据文件</p>
          <p className="text-sm text-gray-700 truncate">{fileInfo?.path || '—'}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">文件更新时间</p>
          <p className="text-sm text-gray-700">{formatTime(fileInfo?.updated_at)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          {TABS.map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                tab === item.key
                  ? 'bg-primary-50 border-primary text-primary'
                  : 'bg-white border-border text-gray-600 hover:border-primary/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[280px] flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 focus-within:border-primary transition-colors">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              value={inputQ}
              onChange={e => setInputQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="搜索标题、期刊、摘要..."
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
      </div>

      <DataTable columns={columns} rows={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
    </div>
  )
}
