import { useState, useCallback } from 'react'
import { Pill, Plus, Search, Pencil, Trash2, Eye } from 'lucide-react'
import { drugApi } from '@/api'
import { useListPage }   from '@/hooks/useListPage'
import { PageHeader }    from '@/components/common/PageHeader'
import { DataTable }     from '@/components/common/DataTable'
import { Pagination }    from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal }         from '@/components/common/Modal'
import { FormField, TextInput, TextArea, SelectInput } from '@/components/common/FormField'

const CATEGORY_OPTIONS = [
  '抗感染药','心血管系统药','呼吸系统药','消化系统药','神经系统药',
  '内分泌系统药','抗肿瘤药','免疫调节药','血液系统药','泌尿系统药',
  '骨骼肌肉系统药','皮肤科用药','眼科用药','耳鼻喉科用药','妇产科用药',
].map(v => ({ value: v, label: v }))

const EMPTY_FORM = {
  name: '', name_en: '', generic_name: '', category: '',
  indications: '', dosage: '', contraindications: '', interactions: '', adverse_effects: '',
}

export function DrugsAdminPage() {
  const fetchFn = useCallback((p) => drugApi.list(p), [])
  const { items, total, totalPages, page, inputQ, loading,
          setInputQ, handleSearch, handlePageChange, reload } = useListPage(fetchFn)

  const [modal, setModal]     = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState({})
  const [delTarget, setDelTarget] = useState(null)
  const [deleting, setDeleting]   = useState(false)

  const openView = async (row) => {
    setEditRow(row); setModal('view')
  }
  const openCreate = () => { setForm(EMPTY_FORM); setFormErr({}); setEditRow(null); setModal('create') }
  const openEdit   = (row) => {
    setForm({
      name: row.name || '', name_en: row.name_en || '', generic_name: row.generic_name || '',
      category: row.category || '', indications: row.indications || '',
      dosage: row.dosage || '', contraindications: row.contraindications || '',
      interactions: row.interactions || '', adverse_effects: row.adverse_effects || '',
    })
    setFormErr({}); setEditRow(row); setModal('edit')
  }

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = '药品名称不能为空'
    return err
  }

  const handleSave = async () => {
    const err = validate()
    if (Object.keys(err).length) { setFormErr(err); return }
    setSaving(true)
    try {
      if (modal === 'create') { await drugApi.create(form) }
      else { await drugApi.update(editRow.id, form) }
      setModal(null); reload()
    } catch (e) { alert(e?.response?.data?.detail || '操作失败') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await drugApi.remove(delTarget.id); setDelTarget(null); reload() }
    catch (e) { alert(e?.response?.data?.detail || '删除失败') }
    finally { setDeleting(false) }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const columns = [
    { key: 'name', title: '药品名称', width: '180px',
      render: (v, row) => (
        <div>
          <div className="font-medium text-gray-900">{v}</div>
          {row.generic_name && <div className="text-xs text-gray-400">{row.generic_name}</div>}
        </div>
      )
    },
    { key: 'category',   title: '药品分类',   width: '120px' },
    { key: 'indications', title: '适应症',
      render: (v) => <span className="text-gray-500 text-sm line-clamp-2">{v || '—'}</span>
    },
    { key: 'dosage', title: '用法用量', width: '150px',
      render: (v) => <span className="text-sm line-clamp-1">{v || '—'}</span>
    },
    { key: '_actions', title: '操作', width: '120px',
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
      )
    },
  ]

  return (
    <div>
      <PageHeader
        icon={Pill} color="green"
        title="药品库管理"
        description={`共 ${total} 条药品记录`}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm
                       rounded-lg hover:bg-primary-600 transition-colors">
            <Plus size={15} />新增药品
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 max-w-sm flex items-center gap-2 bg-white border border-border rounded-lg
                        px-3 py-2 focus-within:border-primary transition-colors">
          <Search size={14} className="text-gray-400" />
          <input type="text" value={inputQ} onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索药品名称..." className="flex-1 text-sm outline-none placeholder-gray-400" />
        </div>
        <button onClick={handleSearch}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 transition-colors">
          搜索
        </button>
      </div>

      <DataTable columns={columns} rows={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      <ConfirmDialog open={!!delTarget} title="确认删除药品"
        description={`即将删除「${delTarget?.name}」，此操作不可恢复。`}
        onConfirm={handleDelete} onCancel={() => setDelTarget(null)} loading={deleting} />

      <Modal open={!!modal} title={modal === 'create' ? '新增药品' : modal === 'view' ? '查看药品' : '编辑药品'}
        onClose={() => setModal(null)} width={640}
        footer={modal === 'view' ? (
          <button onClick={() => setModal(null)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">关闭</button>
        ) : (
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
        )}
      >
        {modal === 'view' ? (
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500">药品名称:</span> <span className="ml-2 font-medium">{editRow?.name}</span></div>
            <div><span className="text-gray-500">通用名:</span> <span className="ml-2">{editRow?.generic_name || '—'}</span></div>
            <div><span className="text-gray-500">分类:</span> <span className="ml-2">{editRow?.category || '—'}</span></div>
            <div><span className="text-gray-500">适应症:</span> <div className="mt-1 text-gray-700 whitespace-pre-wrap">{editRow?.indications || '—'}</div></div>
            <div><span className="text-gray-500">用法用量:</span> <div className="mt-1 text-gray-700 whitespace-pre-wrap">{editRow?.dosage || '—'}</div></div>
            <div><span className="text-gray-500">禁忌症:</span> <div className="mt-1 text-gray-700 whitespace-pre-wrap">{editRow?.contraindications || '—'}</div></div>
          </div>
        ) : (
        <>
        <div className="grid grid-cols-2 gap-x-4">
          <FormField label="药品名称" required error={formErr.name}>
            <TextInput value={form.name} onChange={set('name')} placeholder="如：二甲双胍" />
          </FormField>
          <FormField label="通用名">
            <TextInput value={form.generic_name} onChange={set('generic_name')} placeholder="INN通用名" />
          </FormField>
          <FormField label="英文名">
            <TextInput value={form.name_en} onChange={set('name_en')} placeholder="如：Metformin" />
          </FormField>
          <FormField label="药品分类">
            <SelectInput value={form.category} onChange={set('category')}
              options={CATEGORY_OPTIONS} placeholder="请选择分类" />
          </FormField>
        </div>
        <FormField label="适应症">
          <TextArea value={form.indications} onChange={set('indications')} placeholder="适应症说明..." rows={3} />
        </FormField>
        <FormField label="用法用量">
          <TextArea value={form.dosage} onChange={set('dosage')} placeholder="剂量与用法..." rows={2} />
        </FormField>
        <FormField label="禁忌证">
          <TextArea value={form.contraindications} onChange={set('contraindications')} placeholder="禁忌与慎用情况..." rows={2} />
        </FormField>
        <FormField label="药物相互作用">
          <TextArea value={form.interactions} onChange={set('interactions')} placeholder="与其他药物相互作用..." rows={2} />
        </FormField>
        <FormField label="不良反应">
          <TextArea value={form.adverse_effects} onChange={set('adverse_effects')} placeholder="常见不良反应..." rows={2} />
        </FormField>
        </>
        )}
      </Modal>
    </div>
  )
}
