import { useState, useCallback } from 'react'
import { Cpu, Plus, Search, Pencil, Trash2, Send, ToggleLeft, ToggleRight, Eye } from 'lucide-react'
import { auditRuleApi } from '@/api'
import { useListPage } from '@/hooks/useListPage'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { StatusBadge } from '@/components/common/StatusBadge'
import { FormField, TextInput, TextArea, SelectInput } from '@/components/common/FormField'

const LEVEL_OPTIONS = [
  { value: 'info', label: '提示' },
  { value: 'warning', label: '警告' },
  { value: 'danger', label: '危险' },
  { value: 'block', label: '阻止' },
]

const RULE_TYPE_OPTIONS = [
  { value: 'diagnosis_suggest', label: '辅助诊断' },
  { value: 'exam_recommend', label: '检查推荐' },
  { value: 'medication_warning', label: '用药警告' },
  { value: 'drug_interaction', label: '药物相互作用' },
  { value: 'allergy_check', label: '过敏检查' },
  { value: 'risk_alert', label: '风险预警' },
  { value: 'pathway_reminder', label: '路径提醒' },
  { value: 'followup_reminder', label: '随访提醒' },
]

const TRIGGER_SCENE_OPTIONS = [
  { value: 'outpatient', label: '门诊' },
  { value: 'inpatient', label: '住院' },
  { value: 'emergency', label: '急诊' },
  { value: 'prescribing', label: '开药时' },
  { value: 'diagnosis_entry', label: '录入诊断时' },
  { value: 'lab_review', label: '查看检验时' },
  { value: 'exam_order', label: '开检查时' },
]

const SCENARIO_OPTIONS = [
  { value: 'diagnosis_consistency', label: '诊断一致性审核' },
  { value: 'medication_safety', label: '用药安全审核' },
  { value: 'exam_appropriateness', label: '检查合理性审核' },
]
const ENABLED_OPTIONS = [
  { value: 'true', label: '启用' },
  { value: 'false', label: '停用' },
]
const CONDITION_TEMPLATES = [
  {
    key: 'dx_drug',
    label: '诊断+用药',
    value: {
      all: [{ op: 'contains_any', field: 'diagnoses', values: ['心肌梗死'] }],
      any: [{ op: 'contains_any', field: 'drug_names', values: ['布洛芬'] }],
      not: [],
    },
  },
  {
    key: 'allergy_drug',
    label: '过敏+用药',
    value: {
      all: [{ op: 'contains_any', field: 'patient_allergies', values: ['青霉素'] }],
      any: [{ op: 'contains_any', field: 'drug_names', values: ['阿莫西林'] }],
      not: [],
    },
  },
  {
    key: 'dx_exam_missing',
    label: '诊断+检查缺失',
    value: {
      all: [{ op: 'contains_any', field: 'diagnoses', values: ['心肌梗死'] }],
      any: [{ op: 'not_contains_any', field: 'exam_names', values: ['心电图'] }],
      not: [],
    },
  },
]
const VISUAL_GROUPS = [
  { key: 'all', label: '必须满足（all）' },
  { key: 'any', label: '满足其一（any）' },
  { key: 'not', label: '必须不满足（not）' },
]
const VISUAL_OP_OPTIONS = [
  { value: 'contains_any', label: '包含任意' },
  { value: 'contains_all', label: '包含全部' },
  { value: 'not_contains_any', label: '不包含任意' },
  { value: 'equals', label: '等于' },
  { value: 'in', label: '属于集合' },
  { value: 'lab_is_abnormal', label: '检验是否异常' },
  { value: 'lab_value_ge', label: '检验值>=' },
  { value: 'lab_value_le', label: '检验值<=' },
  { value: 'lab_ratio_ge', label: '检验比值>=' },
]
const VISUAL_FIELD_OPTIONS = [
  { value: 'diagnoses', label: '诊断' },
  { value: 'drug_names', label: '用药' },
  { value: 'exam_names', label: '检查' },
  { value: 'patient_allergies', label: '过敏史' },
  { value: 'lab_item_names', label: '检验项目名' },
  { value: 'lab_item_codes', label: '检验项目编码' },
  { value: 'patient_gender', label: '性别' },
  { value: 'patient_age', label: '年龄' },
]
const VISUAL_OP_SET = new Set(VISUAL_OP_OPTIONS.map(i => i.value))
const VISUAL_FIELD_SET = new Set(VISUAL_FIELD_OPTIONS.map(i => i.value))
const LIST_OP_SET = new Set(['contains_any', 'contains_all', 'not_contains_any', 'in'])
const SINGLE_OP_SET = new Set(['equals'])
const LAB_OP_SET = new Set(['lab_is_abnormal', 'lab_value_ge', 'lab_value_le', 'lab_ratio_ge'])

function makeVisualItem(field = 'diagnoses', op = 'contains_any', valuesText = '', valueText = '', itemCode = '') {
  return { field, op, valuesText, valueText, itemCode }
}

function conditionToVisual(condition) {
  const source = condition && typeof condition === 'object' ? condition : {}
  let unsupported = 0
  const visual = { all: [], any: [], not: [] }
  VISUAL_GROUPS.forEach(({ key }) => {
    const items = Array.isArray(source[key]) ? source[key] : []
    visual[key] = items.flatMap((item) => {
      if (!(item && typeof item === 'object' && VISUAL_OP_SET.has(item.op))) {
        unsupported += 1
        return []
      }
      if (LAB_OP_SET.has(item.op)) {
        const itemCode = String(item.item_code || '')
        const valueText = item.value === undefined || item.value === null ? '' : String(item.value)
        if (!itemCode) {
          unsupported += 1
          return []
        }
        return [makeVisualItem('diagnoses', item.op, '', valueText, itemCode)]
      }
      if (!(item.field && VISUAL_FIELD_SET.has(item.field))) {
        unsupported += 1
        return []
      }
      if (LIST_OP_SET.has(item.op) && Array.isArray(item.values)) {
        return [makeVisualItem(item.field, item.op, item.values.join('，'), '', '')]
      }
      if (SINGLE_OP_SET.has(item.op) && item.value !== undefined) {
        return [makeVisualItem(item.field, item.op, '', String(item.value), '')]
      }
      unsupported += 1
      return []
    })
  })
  return { visual, unsupported }
}

function parseAbnormalBool(text) {
  const val = String(text || '').trim().toLowerCase()
  if (['false', '0', 'no', 'n', '否', '正常'].includes(val)) return false
  return true
}

function visualToCondition(visual) {
  const target = visual && typeof visual === 'object' ? visual : {}
  const out = { all: [], any: [], not: [] }
  VISUAL_GROUPS.forEach(({ key }) => {
    const items = Array.isArray(target[key]) ? target[key] : []
    out[key] = items
      .map((item) => {
        if (LAB_OP_SET.has(item.op)) {
          const item_code = String(item.itemCode || '').trim()
          const valueText = String(item.valueText || '').trim()
          if (!item_code || !valueText) return null
          if (item.op === 'lab_is_abnormal') {
            return { op: item.op, item_code, value: parseAbnormalBool(valueText) }
          }
          return { op: item.op, item_code, value: valueText }
        }
        if (SINGLE_OP_SET.has(item.op)) {
          const value = String(item.valueText || '').trim()
          if (!value) return null
          return { op: item.op, field: item.field, value }
        }
        const values = String(item.valuesText || '')
          .split(/[，,]/)
          .map(s => s.trim())
          .filter(Boolean)
        if (!values.length) return null
        return { op: item.op, field: item.field, values }
      })
      .filter(Boolean)
  })
  return out
}

const EMPTY_FORM = {
  name: '',
  scenario: 'diagnosis_consistency',
  level: 'warning',
  code: 'CUSTOM_RULE',
  message: '',
  suggestion: '',
  rule_type: 'diagnosis_suggest',
  trigger_scene: 'diagnosis_entry',
  condition_json: JSON.stringify({
    all: [{ op: 'contains_any', field: 'diagnoses', values: ['心肌梗死'] }],
    any: [{ op: 'contains_any', field: 'drug_names', values: ['布洛芬'] }],
    not: [],
  }, null, 2),
  enabled: true,
}

function jsonValid(str) {
  try { JSON.parse(str); return true } catch { return false }
}

function getApiErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data.message === 'string' && data.message.trim()) return data.message
  if (typeof data.msg === 'string' && data.msg.trim()) return data.msg
  if (typeof data.detail === 'string' && data.detail.trim()) return data.detail
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const first = data.detail[0]
    if (typeof first === 'string') return first
    if (first?.msg) return first.msg
  }
  return fallback
}

export function AuditRulesAdminPage() {
  const fetchFn = useCallback((p) => auditRuleApi.list(p), [])
  const { items, total, totalPages, page, inputQ, loading,
    setInputQ, handleSearch, handlePageChange, reload } = useListPage(fetchFn)

  const [modal, setModal] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState({})
  const [saving, setSaving] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [publishingId, setPublishingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [templateKey, setTemplateKey] = useState('dx_drug')
  const [actionErr, setActionErr] = useState('')
  const [visualCondition, setVisualCondition] = useState(() => {
    const parsed = JSON.parse(EMPTY_FORM.condition_json)
    return conditionToVisual(parsed).visual
  })

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openView = (row) => {
    setEditRow(row)
    setModal('view')
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormErr({})
    setEditRow(null)
    setTemplateKey('dx_drug')
    setVisualCondition(conditionToVisual(JSON.parse(EMPTY_FORM.condition_json)).visual)
    setModal('create')
  }

  const openEdit = (row) => {
    setForm({
      name: row.name || '',
      scenario: row.scenario || 'diagnosis_consistency',
      level: row.level || 'warning',
      code: row.code || 'CUSTOM_RULE',
      message: row.message || '',
      suggestion: row.suggestion || '',
      rule_type: row.rule_type || 'diagnosis_suggest',
      trigger_scene: row.trigger_scene || 'diagnosis_entry',
      condition_json: JSON.stringify(row.condition || {}, null, 2),
      enabled: row.enabled !== false,
    })
    setFormErr({})
    setEditRow(row)
    setTemplateKey('dx_drug')
    setVisualCondition(conditionToVisual(row.condition || {}).visual)
    setModal('edit')
  }

  const applyTemplate = () => {
    const target = CONDITION_TEMPLATES.find(i => i.key === templateKey) || CONDITION_TEMPLATES[0]
    setF('condition_json', JSON.stringify(target.value, null, 2))
    setVisualCondition(conditionToVisual(target.value).visual)
  }

  const formatConditionJson = () => {
    if (!jsonValid(form.condition_json)) return
    setF('condition_json', JSON.stringify(JSON.parse(form.condition_json), null, 2))
  }

  const syncVisualFromJson = () => {
    if (!jsonValid(form.condition_json)) {
      setActionErr('JSON 格式错误，无法载入可视化编辑器')
      return
    }
    const { visual, unsupported } = conditionToVisual(JSON.parse(form.condition_json))
    setVisualCondition(visual)
    if (unsupported > 0) setActionErr(`已忽略 ${unsupported} 条暂不支持可视化的条件`)
    else setActionErr('')
  }

  const syncJsonFromVisual = () => {
    setActionErr('')
    setF('condition_json', JSON.stringify(visualToCondition(visualCondition), null, 2))
  }

  const addVisualItem = (groupKey) => {
    setVisualCondition(prev => ({ ...prev, [groupKey]: [...(prev[groupKey] || []), makeVisualItem()] }))
  }

  const updateVisualItem = (groupKey, index, field, value) => {
    setVisualCondition((prev) => {
      const items = [...(prev[groupKey] || [])]
      items[index] = { ...items[index], [field]: value }
      return { ...prev, [groupKey]: items }
    })
  }

  const removeVisualItem = (groupKey, index) => {
    setVisualCondition((prev) => {
      const items = [...(prev[groupKey] || [])]
      items.splice(index, 1)
      return { ...prev, [groupKey]: items }
    })
  }

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = '规则名称不能为空'
    if (!form.message.trim()) err.message = '提示语不能为空'
    if (!jsonValid(form.condition_json)) err.condition_json = '条件 JSON 格式错误'
    return err
  }

  const handleSave = async () => {
    setActionErr('')
    const err = validate()
    if (Object.keys(err).length) { setFormErr(err); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        scenario: form.scenario,
        level: form.level,
        code: form.code.trim() || 'CUSTOM_RULE',
        message: form.message.trim(),
        suggestion: form.suggestion.trim() || null,
        rule_type: form.rule_type,
        trigger_scene: form.trigger_scene,
        condition: JSON.parse(form.condition_json),
        enabled: form.enabled,
      }
      if (modal === 'create') await auditRuleApi.create(payload)
      else await auditRuleApi.update(editRow.id, payload)
      setModal(null)
      reload()
    } catch (e) {
      setFormErr({ _api: getApiErrorMessage(e, '保存失败，请重试') })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setActionErr('')
    setDeleting(true)
    try {
      await auditRuleApi.remove(delTarget.id)
      setDelTarget(null)
      reload()
    } catch (e) {
      setActionErr(getApiErrorMessage(e, '删除失败，请重试'))
    } finally {
      setDeleting(false)
    }
  }

  const handlePublish = async (row) => {
    setActionErr('')
    setPublishingId(row.id)
    try {
      await auditRuleApi.publish(row.id)
      reload()
    } catch (e) {
      setActionErr(getApiErrorMessage(e, '发布失败，请检查规则配置'))
    } finally {
      setPublishingId(null)
    }
  }

  const handleToggle = async (row) => {
    setActionErr('')
    setTogglingId(row.id)
    try {
      await auditRuleApi.toggleEnabled(row.id, !row.enabled)
      reload()
    } catch (e) {
      setActionErr(getApiErrorMessage(e, '状态更新失败，请重试'))
    } finally {
      setTogglingId(null)
    }
  }

  const columns = [
    { key: 'name', title: '规则名称', render: (v) => <span className="font-medium text-gray-900">{v}</span> },
    { key: 'level', title: '级别', width: '110px', render: (v) => <StatusBadge status="" label={v || 'warning'} /> },
    { key: 'is_published', title: '发布状态', width: '110px', render: (v) => <StatusBadge status={v ? 'published' : 'draft'} /> },
    { key: 'enabled', title: '启用状态', width: '110px', render: (v) => <StatusBadge status={v ? 'active' : 'inactive'} /> },
    { key: 'updated_at', title: '更新时间', width: '130px', render: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : '—' },
    {
      key: 'actions',
      title: '操作',
      width: '170px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openView(row)}
            className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="查看"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
            title="编辑"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleToggle(row)}
            disabled={togglingId === row.id}
            className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
            title={row.enabled ? '停用' : '启用'}
          >
            {row.enabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          </button>
          <button
            onClick={() => handlePublish(row)}
            disabled={publishingId === row.id}
            className="p-1.5 rounded text-gray-400 hover:text-success hover:bg-green-50 transition-colors disabled:opacity-50"
            title="发布"
          >
            <Send size={14} />
          </button>
          <button
            onClick={() => setDelTarget(row)}
            className="p-1.5 rounded text-gray-400 hover:text-danger hover:bg-red-50 transition-colors"
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        icon={Cpu}
        color="purple"
        title="规则引擎管理"
        description={`共 ${total} 条规则`}
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus size={15} />新增规则
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 max-w-sm flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 focus-within:border-primary transition-colors">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            value={inputQ}
            onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索规则名称/编码..."
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
      {actionErr && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-danger">
          {actionErr}
        </div>
      )}

      <DataTable columns={columns} rows={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      <ConfirmDialog
        open={!!delTarget}
        title="确认删除规则"
        description={`即将删除规则「${delTarget?.name}」，此操作不可恢复。`}
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
        loading={deleting}
      />

      <Modal
        open={modal === 'create' || modal === 'edit' || modal === 'view'}
        title={modal === 'create' ? '新增规则' : modal === 'view' ? '查看规则' : '编辑规则'}
        onClose={() => setModal(null)}
        width={700}
        footer={
          modal === 'view' ? (
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">关闭</button>
          ) : (
          <>
            <button
              onClick={() => setModal(null)}
              className="px-4 py-2 text-sm text-gray-600 border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-600 disabled:opacity-60 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </>
          )
        }
      >
        {modal === 'view' ? (
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500">规则名称:</span> <span className="ml-2 font-medium">{editRow?.name}</span></div>
            <div><span className="text-gray-500">规则编码:</span> <span className="ml-2">{editRow?.code || '—'}</span></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">规则类型:</span> <span className="ml-2">{RULE_TYPE_OPTIONS.find(o => o.value === editRow?.rule_type)?.label || '—'}</span></div>
              <div><span className="text-gray-500">触发场景:</span> <span className="ml-2">{TRIGGER_SCENE_OPTIONS.find(o => o.value === editRow?.trigger_scene)?.label || '—'}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">适用场景:</span> <span className="ml-2">{editRow?.scenario || '—'}</span></div>
              <div><span className="text-gray-500">告警级别:</span> <span className="ml-2"><StatusBadge status="" label={editRow?.level || 'warning'} /></span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">启用状态:</span> <span className="ml-2"><StatusBadge status={editRow?.enabled ? 'active' : 'inactive'} /></span></div>
              <div><span className="text-gray-500">发布状态:</span> <span className="ml-2"><StatusBadge status={editRow?.is_published ? 'published' : 'draft'} /></span></div>
            </div>
            <div><span className="text-gray-500">提示语:</span> <div className="mt-1 text-gray-700">{editRow?.message || '—'}</div></div>
            <div><span className="text-gray-500">建议内容:</span> <div className="mt-1 text-gray-700">{editRow?.suggestion || '—'}</div></div>
            <div><span className="text-gray-500">条件表达式:</span> <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">{JSON.stringify(editRow?.condition || {}, null, 2)}</pre></div>
          </div>
        ) : (
        <>
        {formErr._api && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-danger">
            {formErr._api}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="规则名称" required error={formErr.name}>
            <TextInput value={form.name} onChange={e => setF('name', e.target.value)} placeholder="如：STEMI 禁用 NSAIDs" />
          </FormField>
          <FormField label="规则编码">
            <TextInput value={form.code} onChange={e => setF('code', e.target.value)} placeholder="如：DRUG_CONTRAINDICATED" />
          </FormField>
          <FormField label="规则类型">
            <SelectInput value={form.rule_type} onChange={e => setF('rule_type', e.target.value)} options={RULE_TYPE_OPTIONS} />
          </FormField>
          <FormField label="触发场景">
            <SelectInput value={form.trigger_scene} onChange={e => setF('trigger_scene', e.target.value)} options={TRIGGER_SCENE_OPTIONS} />
          </FormField>
          <FormField label="适用场景">
            <SelectInput value={form.scenario} onChange={e => setF('scenario', e.target.value)} options={SCENARIO_OPTIONS} />
          </FormField>
          <FormField label="告警级别">
            <SelectInput value={form.level} onChange={e => setF('level', e.target.value)} options={LEVEL_OPTIONS} />
          </FormField>
          <FormField label="启用状态">
            <SelectInput
              value={String(form.enabled)}
              onChange={e => setF('enabled', e.target.value === 'true')}
              options={ENABLED_OPTIONS}
            />
          </FormField>
        </div>
        <FormField label="提示语" required error={formErr.message}>
          <TextArea value={form.message} onChange={e => setF('message', e.target.value)} rows={2} />
        </FormField>
        <FormField label="建议内容">
          <TextArea value={form.suggestion} onChange={e => setF('suggestion', e.target.value)} rows={3} />
        </FormField>
        <FormField label="条件表达式（JSON）" required error={formErr.condition_json}>
          <div className="flex items-center gap-2 mb-2">
            <select
              value={templateKey}
              onChange={e => setTemplateKey(e.target.value)}
              className="h-8 px-2 border border-border rounded text-xs bg-white"
            >
              {CONDITION_TEMPLATES.map(item => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyTemplate}
              className="px-2.5 h-8 text-xs border border-border rounded hover:bg-gray-50 transition-colors"
            >
              使用模板
            </button>
            <button
              type="button"
              onClick={formatConditionJson}
              className="px-2.5 h-8 text-xs border border-border rounded hover:bg-gray-50 transition-colors"
            >
              格式化
            </button>
            <button
              type="button"
              onClick={syncVisualFromJson}
              className="px-2.5 h-8 text-xs border border-border rounded hover:bg-gray-50 transition-colors"
            >
              从JSON载入
            </button>
            <button
              type="button"
              onClick={syncJsonFromVisual}
              className="px-2.5 h-8 text-xs border border-border rounded hover:bg-gray-50 transition-colors"
            >
              写入JSON
            </button>
          </div>
          <div className="mb-3 p-3 border border-border rounded bg-gray-50/60">
            {VISUAL_GROUPS.map(({ key, label }) => (
              <div key={key} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-medium text-gray-600">{label}</div>
                  <button
                    type="button"
                    onClick={() => addVisualItem(key)}
                    className="h-7 px-2 text-xs border border-border rounded hover:bg-white transition-colors"
                  >
                    添加条件
                  </button>
                </div>
                {(visualCondition[key] || []).map((item, idx) => (
                  <div key={`${key}-${idx}`} className="flex items-center gap-2 mb-2 last:mb-0">
                    <select
                      value={item.op}
                      onChange={e => updateVisualItem(key, idx, 'op', e.target.value)}
                      className="h-8 px-2 border border-border rounded text-xs bg-white min-w-[108px]"
                    >
                      {VISUAL_OP_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {!LAB_OP_SET.has(item.op) && (
                      <select
                        value={item.field}
                        onChange={e => updateVisualItem(key, idx, 'field', e.target.value)}
                        className="h-8 px-2 border border-border rounded text-xs bg-white min-w-[96px]"
                      >
                        {VISUAL_FIELD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                    {LAB_OP_SET.has(item.op) ? (
                      <>
                        <input
                          value={item.itemCode || ''}
                          onChange={e => updateVisualItem(key, idx, 'itemCode', e.target.value)}
                          className="h-8 px-2 border border-border rounded text-xs bg-white min-w-[120px]"
                          placeholder="检验项编码，如：TNI"
                        />
                        <input
                          value={item.valueText || ''}
                          onChange={e => updateVisualItem(key, idx, 'valueText', e.target.value)}
                          className="flex-1 h-8 px-2 border border-border rounded text-xs bg-white"
                          placeholder={item.op === 'lab_is_abnormal' ? 'true/false' : '阈值，如：1.5'}
                        />
                      </>
                    ) : SINGLE_OP_SET.has(item.op) ? (
                      <input
                        value={item.valueText || ''}
                        onChange={e => updateVisualItem(key, idx, 'valueText', e.target.value)}
                        className="flex-1 h-8 px-2 border border-border rounded text-xs bg-white"
                        placeholder="单个值，如：男"
                      />
                    ) : (
                      <input
                        value={item.valuesText}
                        onChange={e => updateVisualItem(key, idx, 'valuesText', e.target.value)}
                        className="flex-1 h-8 px-2 border border-border rounded text-xs bg-white"
                        placeholder="值用逗号分隔，如：心肌梗死, 急性冠脉综合征"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeVisualItem(key, idx)}
                      className="h-8 px-2 text-xs border border-border rounded hover:bg-white transition-colors"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <textarea
            value={form.condition_json}
            onChange={e => setF('condition_json', e.target.value)}
            rows={10}
            className="w-full text-xs font-mono border border-border rounded px-3 py-2 outline-none focus:border-primary transition-colors resize-y"
          />
        </FormField>
        </>
        )}
      </Modal>
    </div>
  )
}
