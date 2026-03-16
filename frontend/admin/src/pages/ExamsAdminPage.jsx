import { useState, useCallback } from 'react'
import { FlaskConical, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { examApi } from '@/api'
import { useListPage }   from '@/hooks/useListPage'
import { PageHeader }    from '@/components/common/PageHeader'
import { DataTable }     from '@/components/common/DataTable'
import { Pagination }    from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal }         from '@/components/common/Modal'
import { FormField, TextInput, TextArea, SelectInput } from '@/components/common/FormField'

const TYPE_OPTIONS = [
  '血液检验','尿液检验','生化检验','免疫检验','微生物检验',
  '影像检查','功能检查','内镜检查','病理检查',
].map(v => ({ value: v, label: v }))

const EMPTY_FORM = {
  name: '', name_en: '', type: '', specimen: '',
  reference_range: '', clinical_significance: '', preparation: '',
}

export function ExamsAdminPage() {
  const fetchFn = useCallback((p) => examApi.list(p), [])
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
      name: row.name || '', name_en: row.name_en || '', type: row.type || '',
      specimen: row.specimen || '', reference_range: row.reference_range || '',
      clinical_significance: row.clinical_significance || '', preparation: row.preparation || '',
    })
    setFormErr({}); setEditRow(row); setModal('edit')
  }

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = '检验项目名称不能为空'
    return err
  }

  const handleSave = async () => {
    const err = validate()
    if (Object.keys(err).length) { setFormErr(err); return }
    setSaving(true)
    try {
      if (modal === 'create') { await examApi.create(form) }
      else { await examApi.update(editRow.id, form) }
      setModal(null); reload()
    } catch (e) { alert(e?.response?.data?.detail || '操作失败') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await examApi.remove(delTarget.id); setDelTarget(null); reload() }
    catch (e) { alert(e?.response?.data?.detail || '删除失败') }
    finally { setDeleting(false) }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const columns = [
    { key: 'name', title: '项目名称', width: '180px',
      render: (v, row) => (
        <div>
          <div className="font-medium text-gray-900">{v}</div>
          {row.name_en && <div className="text-xs text-gray-400">{row.name_en}</div>}
        </div>
      )
    },
    { key: 'type',     title: '检验类型',   width: '110px' },
    { key: 'specimen', title: '标本类型',   width: '100px' },
    { key: 'reference_range', title: '参考范围',
      render: (v) => <span className="text-sm line-clamp-2">{v || '—'}</span>
    },
    { key: 'clinical_significance', title: '临床意义',
      render: (v) => <span className="text-gray-500 text-sm line-clamp-2">{v || '—'}</span>
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
        icon={FlaskConical} color="purple"
        title="检验库管理"
        description={`共 ${total} 条检验记录`}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm
                       rounded-lg hover:bg-primary-600 transition-colors">
            <Plus size={15} />新增检验项目
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 max-w-sm flex items-center gap-2 bg-white border border-border rounded-lg
                        px-3 py-2 focus-within:border-primary transition-colors">
          <Search size={14} className="text-gray-400" />
          <input type="text" value={inputQ} onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索检验项目..." className="flex-1 text-sm outline-none placeholder-gray-400" />
        </div>
        <button onClick={handleSearch}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 transition-colors">
          搜索
        </button>
      </div>

      <DataTable columns={columns} rows={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      <ConfirmDialog open={!!delTarget} title="确认删除检验项目"
        description={`即将删除「${delTarget?.name}」，此操作不可恢复。`}
        onConfirm={handleDelete} onCancel={() => setDelTarget(null)} loading={deleting} />

      <Modal open={!!modal} title={modal === 'create' ? '新增检验项目' : '编辑检验项目'}
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
        <div className="grid grid-cols-2 gap-x-4">
          <FormField label="项目名称" required error={formErr.name}>
            <TextInput value={form.name} onChange={set('name')} placeholder="如：空腹血糖" />
          </FormField>
          <FormField label="英文简称">
            <TextInput value={form.name_en} onChange={set('name_en')} placeholder="如：FBG" />
          </FormField>
          <FormField label="检验类型">
            <SelectInput value={form.type} onChange={set('type')}
              options={TYPE_OPTIONS} placeholder="请选择类型" />
          </FormField>
          <FormField label="标本类型">
            <TextInput value={form.specimen} onChange={set('specimen')} placeholder="如：静脉血、尿液" />
          </FormField>
        </div>
        <FormField label="参考范围">
          <TextArea value={form.reference_range} onChange={set('reference_range')}
            placeholder="正常参考范围（可按性别/年龄分段）..." rows={3} />
        </FormField>
        <FormField label="临床意义">
          <TextArea value={form.clinical_significance} onChange={set('clinical_significance')}
            placeholder="升高/降低的临床意义..." rows={3} />
        </FormField>
        <FormField label="检查前准备">
          <TextArea value={form.preparation} onChange={set('preparation')}
            placeholder="采集前注意事项、禁食要求等..." rows={2} />
        </FormField>
      </Modal>
    </div>
  )
}
