import { useState, useCallback } from 'react'
import { BookOpen, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { guidelineApi } from '@/api'
import { useListPage }   from '@/hooks/useListPage'
import { PageHeader }    from '@/components/common/PageHeader'
import { DataTable }     from '@/components/common/DataTable'
import { Pagination }    from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal }         from '@/components/common/Modal'
import { FormField, TextInput, TextArea } from '@/components/common/FormField'

const EMPTY_FORM = {
  title: '', organization: '', department: '', published_at: '', summary: '', source_url: '',
}

export function GuidelinesAdminPage() {
  const fetchFn = useCallback((p) => guidelineApi.list(p), [])
  const { items, total, totalPages, page, inputQ, loading,
          setInputQ, handleSearch, handlePageChange, reload } = useListPage(fetchFn)

  const [modal, setModal]     = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState({})
  const [delTarget, setDelTarget] = useState(null)
  const [deleting, setDeleting]   = useState(false)

  const openCreate = () => { setForm(EMPTY_FORM); setFormErr({}); setEditRow(null); setModal('create') }
  const openEdit   = (row) => {
    setForm({
      title: row.title || '', organization: row.organization || '',
      department: row.department || '', published_at: row.published_at?.slice(0, 10) || '',
      summary: row.summary || '', source_url: row.source_url || '',
    })
    setFormErr({}); setEditRow(row); setModal('edit')
  }

  const validate = () => {
    const err = {}
    if (!form.title.trim()) err.title = '指南标题不能为空'
    return err
  }

  const handleSave = async () => {
    const err = validate()
    if (Object.keys(err).length) { setFormErr(err); return }
    setSaving(true)
    try {
      if (modal === 'create') { await guidelineApi.create(form) }
      else { await guidelineApi.update(editRow.id, form) }
      setModal(null); reload()
    } catch (e) { alert(e?.response?.data?.detail || '操作失败') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await guidelineApi.remove(delTarget.id); setDelTarget(null); reload() }
    catch (e) { alert(e?.response?.data?.detail || '删除失败') }
    finally { setDeleting(false) }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const columns = [
    { key: 'title', title: '指南标题',
      render: (v) => <span className="font-medium text-gray-900 line-clamp-2">{v}</span>
    },
    { key: 'organization', title: '发布机构',  width: '140px' },
    { key: 'department',   title: '科室分类',  width: '100px' },
    { key: 'published_at', title: '发布日期',  width: '110px',
      render: (v) => v ? v.slice(0, 10) : '—'
    },
    { key: '_actions', title: '操作', width: '100px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)}
            className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => setDelTarget(row)}
            className="p-1.5 rounded text-gray-400 hover:text-danger hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      )
    },
  ]

  return (
    <div>
      <PageHeader
        icon={BookOpen} color="orange"
        title="指南库管理"
        description={`共 ${total} 条临床指南`}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm
                       rounded-lg hover:bg-primary-600 transition-colors">
            <Plus size={15} />新增指南
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 max-w-sm flex items-center gap-2 bg-white border border-border rounded-lg
                        px-3 py-2 focus-within:border-primary transition-colors">
          <Search size={14} className="text-gray-400" />
          <input type="text" value={inputQ} onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索指南标题..." className="flex-1 text-sm outline-none placeholder-gray-400" />
        </div>
        <button onClick={handleSearch}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 transition-colors">
          搜索
        </button>
      </div>

      <DataTable columns={columns} rows={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      <ConfirmDialog open={!!delTarget} title="确认删除指南"
        description={`即将删除「${delTarget?.title}」，此操作不可恢复。`}
        onConfirm={handleDelete} onCancel={() => setDelTarget(null)} loading={deleting} />

      <Modal open={!!modal} title={modal === 'create' ? '新增临床指南' : '编辑临床指南'}
        onClose={() => setModal(null)} width={600}
        footer={
          <>
            <button onClick={() => setModal(null)}
              className="px-4 py-2 text-sm text-gray-600 border border-border rounded-lg hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-600 disabled:opacity-60 flex items-center gap-1.5 transition-colors">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <FormField label="指南标题" required error={formErr.title}>
          <TextInput value={form.title} onChange={set('title')} placeholder="如：2型糖尿病基层诊疗指南（2022）" />
        </FormField>
        <div className="grid grid-cols-2 gap-x-4">
          <FormField label="发布机构">
            <TextInput value={form.organization} onChange={set('organization')} placeholder="如：中华医学会" />
          </FormField>
          <FormField label="科室分类">
            <TextInput value={form.department} onChange={set('department')} placeholder="如：内分泌科" />
          </FormField>
          <FormField label="发布日期">
            <TextInput type="date" value={form.published_at} onChange={set('published_at')} />
          </FormField>
          <FormField label="来源链接">
            <TextInput value={form.source_url} onChange={set('source_url')} placeholder="https://..." />
          </FormField>
        </div>
        <FormField label="指南摘要">
          <TextArea value={form.summary} onChange={set('summary')} placeholder="指南核心要点..." rows={4} />
        </FormField>
      </Modal>
    </div>
  )
}
