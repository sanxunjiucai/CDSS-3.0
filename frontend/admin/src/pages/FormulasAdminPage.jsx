import { useState, useCallback } from 'react'
import { Calculator, Plus, Search, Pencil, Trash2, AlertCircle, Eye } from 'lucide-react'
import { formulaApi } from '@/api'
import { useListPage }   from '@/hooks/useListPage'
import { PageHeader }    from '@/components/common/PageHeader'
import { DataTable }     from '@/components/common/DataTable'
import { Pagination }    from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal }         from '@/components/common/Modal'
import { FormField, TextInput, TextArea, SelectInput } from '@/components/common/FormField'

const CATEGORIES = ['身体测量','肾功能','心功能','代谢评估','营养评估','其他']
const CAT_OPTIONS = CATEGORIES.map(c => ({ value: c, label: c }))

const EMPTY_FORM = {
  name: '', category: '', department: '',
  description: '', formula_expr: '',
  parameters_json: '[]',
  interpretation_rules_json: '[]',
}

const PARAM_TEMPLATE = JSON.stringify([
  { name: 'weight', label: '体重', unit: 'kg', type: 'number', placeholder: '请输入体重' }
], null, 2)

const RULES_TEMPLATE = JSON.stringify([
  { condition: 'value < 18.5', label: '偏瘦', level: 'warning' }
], null, 2)

function jsonValid(str) {
  try { JSON.parse(str); return true } catch { return false }
}

export function FormulasAdminPage() {
  const fetchFn = useCallback((p) => formulaApi.list(p), [])
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
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormErr({})
    setEditRow(null)
    setModal('create')
  }

  const openEdit = (row) => {
    setForm({
      name:            row.name || '',
      category:        row.category || '',
      department:      row.department || '',
      description:     row.description || '',
      formula_expr:    row.formula_expr || '',
      parameters_json: JSON.stringify(row.parameters || [], null, 2),
      interpretation_rules_json: JSON.stringify(row.interpretation_rules || [], null, 2),
    })
    setFormErr({})
    setEditRow(row)
    setModal('edit')
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = '公式名称不能为空'
    if (!jsonValid(form.parameters_json)) err.parameters_json = 'JSON 格式错误'
    if (!jsonValid(form.interpretation_rules_json)) err.interpretation_rules_json = 'JSON 格式错误'
    return err
  }

  const handleSave = async () => {
    const err = validate()
    if (Object.keys(err).length) { setFormErr(err); return }
    setSaving(true)
    try {
      const payload = {
        name:         form.name.trim(),
        category:     form.category || null,
        department:   form.department || null,
        description:  form.description || null,
        formula_expr: form.formula_expr || null,
        parameters:   JSON.parse(form.parameters_json),
        interpretation_rules: JSON.parse(form.interpretation_rules_json),
      }
      if (modal === 'create') {
        await formulaApi.create(payload)
      } else {
        await formulaApi.update(editRow.id, payload)
      }
      setModal(null)
      reload()
    } catch (e) {
      setFormErr({ _api: e?.response?.data?.message || '保存失败，请重试' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await formulaApi.remove(delTarget.id)
      setDelTarget(null)
      reload()
    } catch {
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'name',        title: '公式名称', render: (v) => (
      <span className="font-medium text-gray-900">{v}</span>
    )},
    { key: 'category',    title: '分类',    render: (v) => v || '—' },
    { key: 'department',  title: '科室',    render: (v) => v || '—' },
    { key: 'formula_expr',title: '表达式',  render: (v) => (
      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">
        {v || '—'}
      </code>
    )},
    { key: 'parameters',  title: '参数数',  render: (v) => (v || []).length },
    { key: 'actions',     title: '操作',    render: (_, row) => (
      <div className="flex items-center gap-2">
        <button onClick={() => openView(row)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
          <Eye size={14} />
        </button>
        <button onClick={() => openEdit(row)}
          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={() => setDelTarget(row)}
          className="p-1.5 text-gray-400 hover:text-danger hover:bg-red-50 rounded transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader
        icon={Calculator}
        color="green"
        title="公式库管理"
        description={`共 ${total} 个公式`}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white
                       text-sm rounded-md hover:bg-primary-600 transition-colors">
            <Plus size={14} />
            新增公式
          </button>
        }
      />

      {/* 搜索 */}
      <div className="flex items-center gap-2 bg-white border border-border rounded-lg
                      px-3 py-2 focus-within:border-primary transition-colors max-w-[400px] mb-4">
        <Search size={14} className="text-gray-400" />
        <input
          value={inputQ} onChange={e => setInputQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="搜索公式名称..."
          className="flex-1 text-sm outline-none placeholder-gray-400"
        />
      </div>

      <DataTable columns={columns} rows={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      {/* 新增/编辑弹窗 */}
      {modal && (
        <Modal
          open={!!modal}
          title={modal === 'create' ? '新增公式' : modal === 'view' ? '查看公式' : '编辑公式'}
          onClose={() => setModal(null)}
          footer={modal === 'view' ? (
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">关闭</button>
          ) : (
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-gray-50">
                取消
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md
                           hover:bg-primary-600 disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          )}
        >
          {modal === 'view' ? (
            <div className="space-y-3 text-sm">
              <div><span className="text-gray-500">公式名称:</span> <span className="ml-2 font-medium">{editRow?.name}</span></div>
              <div><span className="text-gray-500">分类:</span> <span className="ml-2">{editRow?.category || '—'}</span></div>
              <div><span className="text-gray-500">描述:</span> <div className="mt-1 text-gray-700">{editRow?.description || '—'}</div></div>
              <div><span className="text-gray-500">公式:</span> <div className="mt-1 text-gray-700 font-mono">{editRow?.formula || '—'}</div></div>
            </div>
          ) : (
          <>
          {formErr._api && (
            <div className="flex items-center gap-2 mb-3 p-2.5 bg-red-50 border border-red-200 rounded text-sm text-danger">
              <AlertCircle size={14} />
              {formErr._api}
            </div>
          )}
          <div className="space-y-3">
            <FormField label="公式名称" required error={formErr.name}>
              <TextInput value={form.name} onChange={e => setF('name', e.target.value)} placeholder="如：BMI 体重指数" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="分类">
                <SelectInput value={form.category} onChange={e => setF('category', e.target.value)}
                  options={CAT_OPTIONS} placeholder="请选择分类" />
              </FormField>
              <FormField label="适用科室">
                <TextInput value={form.department} onChange={e => setF('department', e.target.value)} placeholder="如：内科" />
              </FormField>
            </div>
            <FormField label="说明描述">
              <TextArea value={form.description} onChange={e => setF('description', e.target.value)} rows={2} />
            </FormField>
            <FormField label="公式表达式">
              <TextInput value={form.formula_expr} onChange={e => setF('formula_expr', e.target.value)}
                placeholder="如：weight / (height/100)^2" />
            </FormField>
            <FormField label="参数配置（JSON）" error={formErr.parameters_json}
              hint={`示例：${PARAM_TEMPLATE.slice(0, 60)}...`}>
              <textarea
                value={form.parameters_json}
                onChange={e => setF('parameters_json', e.target.value)}
                rows={6}
                className="w-full text-xs font-mono border border-border rounded px-3 py-2
                           outline-none focus:border-primary transition-colors resize-y"
                placeholder={PARAM_TEMPLATE}
              />
            </FormField>
            <FormField label="解读规则（JSON）" error={formErr.interpretation_rules_json}
              hint="每条规则包含 condition、label、level(normal/warning/danger) 字段">
              <textarea
                value={form.interpretation_rules_json}
                onChange={e => setF('interpretation_rules_json', e.target.value)}
                rows={4}
                className="w-full text-xs font-mono border border-border rounded px-3 py-2
                           outline-none focus:border-primary transition-colors resize-y"
                placeholder={RULES_TEMPLATE}
              />
            </FormField>
          </div>
          </>
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={!!delTarget}
        title="确认删除"
        message={`确定要删除公式「${delTarget?.name}」吗？此操作不可撤销。`}
        confirmText="删除"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  )
}
