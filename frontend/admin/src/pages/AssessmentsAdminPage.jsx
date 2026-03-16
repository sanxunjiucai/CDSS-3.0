import { useState, useCallback } from 'react'
import { ClipboardList, Plus, Search, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { assessmentApi } from '@/api'
import { useListPage }   from '@/hooks/useListPage'
import { PageHeader }    from '@/components/common/PageHeader'
import { DataTable }     from '@/components/common/DataTable'
import { Pagination }    from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal }         from '@/components/common/Modal'
import { FormField, TextInput, TextArea, SelectInput } from '@/components/common/FormField'

const DEPARTMENTS = [
  '精神科','神经科','心理科','内科','外科','老年科','急诊科','康复科','其他',
]
const DEPT_OPTIONS = DEPARTMENTS.map(d => ({ value: d, label: d }))

const EMPTY_FORM = {
  name: '', department: '', description: '',
  questions_json: '[]',
  scoring_rules_json: '[]',
}

const Q_TEMPLATE = JSON.stringify([
  {
    id: 'q1',
    text: '在过去两周内，您感到心情低落或绝望？',
    type: 'single',
    options: [
      { value: 0, label: '从不' },
      { value: 1, label: '有几天' },
      { value: 2, label: '超过一半时间' },
      { value: 3, label: '几乎每天' },
    ],
  },
], null, 2)

const RULES_TEMPLATE = JSON.stringify([
  { min: 0, max: 4, label: '无症状', level: 'normal' },
  { min: 5, max: 9, label: '轻度', level: 'warning' },
  { min: 10, max: 27, label: '中重度', level: 'danger' },
], null, 2)

function jsonValid(str) {
  try { JSON.parse(str); return true } catch { return false }
}

export function AssessmentsAdminPage() {
  const fetchFn = useCallback((p) => assessmentApi.list(p), [])
  const { items, total, totalPages, page, inputQ, loading,
          setInputQ, handleSearch, handlePageChange, reload } = useListPage(fetchFn)

  const [modal, setModal]     = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState({})
  const [delTarget, setDelTarget] = useState(null)
  const [deleting, setDeleting]   = useState(false)

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormErr({})
    setEditRow(null)
    setModal('create')
  }

  const openEdit = async (row) => {
    // 获取详情（含 questions）
    let detail = row
    try {
      detail = await assessmentApi.detail(row.id)
    } catch { /* 降级用列表数据 */ }
    setForm({
      name:               detail.name || '',
      department:         detail.department || '',
      description:        detail.description || '',
      questions_json:     JSON.stringify(detail.questions || [], null, 2),
      scoring_rules_json: JSON.stringify(detail.scoring_rules || [], null, 2),
    })
    setFormErr({})
    setEditRow(row)
    setModal('edit')
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = '量表名称不能为空'
    if (!jsonValid(form.questions_json)) err.questions_json = 'JSON 格式错误'
    if (!jsonValid(form.scoring_rules_json)) err.scoring_rules_json = 'JSON 格式错误'
    return err
  }

  const handleSave = async () => {
    const err = validate()
    if (Object.keys(err).length) { setFormErr(err); return }
    setSaving(true)
    try {
      const payload = {
        name:          form.name.trim(),
        department:    form.department || null,
        description:   form.description || null,
        questions:     JSON.parse(form.questions_json),
        scoring_rules: JSON.parse(form.scoring_rules_json),
      }
      if (modal === 'create') {
        await assessmentApi.create(payload)
      } else {
        await assessmentApi.update(editRow.id, payload)
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
      await assessmentApi.remove(delTarget.id)
      setDelTarget(null)
      reload()
    } catch {
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'name',       title: '量表名称', render: (v) => (
      <span className="font-medium text-gray-900">{v}</span>
    )},
    { key: 'department', title: '科室',    render: (v) => v || '—' },
    { key: 'question_count', title: '题目数', render: (v) => (
      <span className="inline-flex items-center justify-center w-7 h-7 bg-primary-50
                       text-primary text-xs rounded-full font-medium">
        {v || 0}
      </span>
    )},
    { key: 'description', title: '说明', render: (v) => (
      <span className="text-gray-500 text-xs line-clamp-2">
        {v || '—'}
      </span>
    )},
    { key: 'actions', title: '操作', render: (_, row) => (
      <div className="flex items-center gap-2">
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
        icon={ClipboardList}
        color="indigo"
        title="量表管理"
        description={`共 ${total} 个量表`}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white
                       text-sm rounded-md hover:bg-primary-600 transition-colors">
            <Plus size={14} />
            新增量表
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
          placeholder="搜索量表名称..."
          className="flex-1 text-sm outline-none placeholder-gray-400"
        />
      </div>

      <DataTable columns={columns} rows={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      {/* 新增/编辑弹窗 */}
      {modal && (
        <Modal
          title={modal === 'create' ? '新增量表' : '编辑量表'}
          onClose={() => setModal(null)}
          width="max-w-3xl"
          footer={
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
          }
        >
          {formErr._api && (
            <div className="flex items-center gap-2 mb-3 p-2.5 bg-red-50 border border-red-200 rounded text-sm text-danger">
              <AlertCircle size={14} />
              {formErr._api}
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="量表名称" required error={formErr.name}>
                <TextInput value={form.name} onChange={e => setF('name', e.target.value)} placeholder="如：PHQ-9 抑郁症筛查量表" />
              </FormField>
              <FormField label="适用科室">
                <SelectInput value={form.department} onChange={e => setF('department', e.target.value)}
                  options={DEPT_OPTIONS} placeholder="请选择科室" />
              </FormField>
            </div>
            <FormField label="量表说明">
              <TextArea value={form.description} onChange={e => setF('description', e.target.value)} rows={2}
                placeholder="量表的用途、适用范围等说明" />
            </FormField>
            <FormField label="题目配置（JSON）" error={formErr.questions_json}
              hint="每个题目需包含 id、text、type(single/multi)、options([{value, label}]) 字段">
              <textarea
                value={form.questions_json}
                onChange={e => setF('questions_json', e.target.value)}
                rows={10}
                className="w-full text-xs font-mono border border-border rounded px-3 py-2
                           outline-none focus:border-primary transition-colors resize-y"
                placeholder={Q_TEMPLATE}
              />
            </FormField>
            <FormField label="评分规则（JSON）" error={formErr.scoring_rules_json}
              hint="每条规则包含 min、max、label、level(normal/warning/danger) 字段">
              <textarea
                value={form.scoring_rules_json}
                onChange={e => setF('scoring_rules_json', e.target.value)}
                rows={5}
                className="w-full text-xs font-mono border border-border rounded px-3 py-2
                           outline-none focus:border-primary transition-colors resize-y"
                placeholder={RULES_TEMPLATE}
              />
            </FormField>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!delTarget}
        title="确认删除"
        message={`确定要删除量表「${delTarget?.name}」吗？此操作不可撤销。`}
        confirmText="删除"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  )
}
