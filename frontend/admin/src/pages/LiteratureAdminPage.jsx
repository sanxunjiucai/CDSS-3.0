import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, Newspaper, FileText, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { literatureAdminApi } from '@/api'
import { useListPage } from '@/hooks/useListPage'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, TextInput, TextArea } from '@/components/common/FormField'

const TABS = [
  { key: 'literature', label: '动态文献' },
  { key: 'case', label: '案例文献' },
]

const EMPTY_FORM = {
  pmid: '', title: '', type: 'literature', department: '', journal: '',
  publish_year: '', published_at: '', authors: '', keywords: '', abstract: '',
  source_url: '', pmc_url: '', doi: '',
}

function formatTime(value) {
  if (!value) return '—'
  return new Date(value * 1000).toLocaleString('zh-CN')
}

export function LiteratureAdminPage() {
  const [tab, setTab] = useState('literature')
  const [stats, setStats] = useState(null)
  const [reloading, setReloading] = useState(false)
  const [modal, setModal] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  const openCreate = () => { setForm({ ...EMPTY_FORM, type: tab }); setEditRow(null); setModal('create') }
  const openView = async (row) => {
    setEditRow(row)
    setModal('view')
  }
  const openEdit = (row) => {
    setForm({
      pmid: row.id || '', title: row.title || '', type: row.type || tab,
      department: row.department || '', journal: row.journal || '',
      publish_year: row.publish_year || '', published_at: row.published_at || '',
      authors: row.authors?.join?.(', ') || '', keywords: row.keywords?.join?.(', ') || '',
      abstract: row.abstract || '', source_url: row.source_url || '',
      pmc_url: row.pmc_url || '', doi: row.doi || '',
    })
    setEditRow(row); setModal('edit')
  }

  const handleSave = async () => {
    if (!form.pmid.trim() || !form.title.trim()) { alert('PMID和标题不能为空'); return }
    setSaving(true)
    try {
      const data = { ...form, publish_year: form.publish_year ? parseInt(form.publish_year) : null }
      if (modal === 'create') await literatureAdminApi.create(data)
      else await literatureAdminApi.update(editRow.id, data)
      setModal(null); reload()
    } catch (e) { alert(e?.response?.data?.detail || '操作失败') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await literatureAdminApi.remove(delTarget.id); setDelTarget(null); reload() }
    catch (e) { alert(e?.response?.data?.detail || '删除失败') }
    finally { setDeleting(false) }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

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
    {
      key: '_actions',
      title: '操作',
      width: '120px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openView(row)}
            className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Eye size={14} />
          </button>
          <button onClick={() => openEdit(row)}
            className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => setDelTarget(row)}
            className="p-1.5 rounded text-gray-400 hover:text-danger hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
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
          <div className="flex items-center gap-2">
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 transition-colors">
              <Plus size={14} />
              新增文献
            </button>
            <button onClick={handleReload} disabled={reloading}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-60 transition-colors">
              <RefreshCw size={14} className={reloading ? 'animate-spin' : ''} />
              {reloading ? '刷新中...' : '刷新缓存'}
            </button>
          </div>
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

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? '新增文献' : modal === 'view' ? '查看文献' : '编辑文献'}>
        {modal === 'view' ? (
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500">PMID:</span> <span className="ml-2">{editRow?.id}</span></div>
            <div><span className="text-gray-500">标题:</span> <span className="ml-2">{editRow?.title}</span></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">科室:</span> <span className="ml-2">{editRow?.department || '—'}</span></div>
              <div><span className="text-gray-500">期刊:</span> <span className="ml-2">{editRow?.journal || '—'}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">年份:</span> <span className="ml-2">{editRow?.publish_year || '—'}</span></div>
              <div><span className="text-gray-500">发布日期:</span> <span className="ml-2">{editRow?.published_at || '—'}</span></div>
            </div>
            <div><span className="text-gray-500">作者:</span> <span className="ml-2">{editRow?.authors?.join?.(', ') || '—'}</span></div>
            <div><span className="text-gray-500">关键词:</span> <span className="ml-2">{editRow?.keywords?.join?.(', ') || '—'}</span></div>
            <div><span className="text-gray-500">摘要:</span> <div className="mt-1 text-gray-700">{editRow?.abstract || '—'}</div></div>
            <div><span className="text-gray-500">来源:</span> <a href={editRow?.source_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">{editRow?.source_url || '—'}</a></div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">关闭</button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
          <FormField label="PMID" required>
            <TextInput value={form.pmid} onChange={set('pmid')} disabled={modal === 'edit'} />
          </FormField>
          <FormField label="标题" required>
            <TextInput value={form.title} onChange={set('title')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="科室">
              <TextInput value={form.department} onChange={set('department')} />
            </FormField>
            <FormField label="期刊">
              <TextInput value={form.journal} onChange={set('journal')} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="年份">
              <TextInput value={form.publish_year} onChange={set('publish_year')} type="number" />
            </FormField>
            <FormField label="发布日期">
              <TextInput value={form.published_at} onChange={set('published_at')} placeholder="YYYY-MM-DD" />
            </FormField>
          </div>
          <FormField label="作者">
            <TextInput value={form.authors} onChange={set('authors')} placeholder="多个作者用逗号分隔" />
          </FormField>
          <FormField label="关键词">
            <TextInput value={form.keywords} onChange={set('keywords')} placeholder="多个关键词用逗号分隔" />
          </FormField>
          <FormField label="摘要">
            <TextArea value={form.abstract} onChange={set('abstract')} rows={4} />
          </FormField>
          <FormField label="来源URL">
            <TextInput value={form.source_url} onChange={set('source_url')} />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-60">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除文献"${delTarget?.title}"吗？`}
        loading={deleting}
      />
    </div>
  )
}
