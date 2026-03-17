import { useState, useCallback } from 'react'
import {
  Cpu,
  Plus,
  Search,
  Pencil,
  Trash2,
  Send,
  ToggleLeft,
  ToggleRight,
  Eye,
  FlaskConical,
} from 'lucide-react'
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
  { value: 'error', label: '高危' },
]
const SCENARIO_OPTIONS = [
  { value: 'diagnosis_consistency', label: '诊断一致性审核' },
  { value: 'medication_safety', label: '用药安全审核' },
  { value: 'exam_appropriateness', label: '检查合理性审核' },
]
const CATEGORY_OPTIONS = [
  { value: 'assist_input', label: '辅助输入' },
  { value: 'diagnosis', label: '诊断建议' },
  { value: 'exam', label: '检查建议' },
  { value: 'lab', label: '检验建议' },
  { value: 'treatment', label: '治疗建议' },
  { value: 'medication', label: '用药审核' },
  { value: 'risk', label: '高危提醒' },
  { value: 'block', label: '强拦截' },
  { value: 'writeback', label: '回填规则' },
]
const MODULE_OPTIONS = [
  { value: 'smart_assistant', label: '智能辅助' },
  { value: 'assist_input', label: '辅助输入' },
  { value: 'diagnosis', label: '辅助诊断' },
  { value: 'exam_recommend', label: '检查检验建议' },
  { value: 'treatment', label: '治疗建议' },
  { value: 'medication', label: '用药审核' },
  { value: 'risk', label: '风险预警' },
  { value: 'his_writeback', label: 'HIS回填' },
]
const CLINICAL_SCENE_OPTIONS = [
  { value: 'outpatient', label: '门诊' },
  { value: 'inpatient', label: '住院' },
  { value: 'emergency', label: '急诊' },
  { value: 'physical_exam', label: '体检' },
  { value: 'common', label: '通用' },
]
const TRIGGER_TIMING_OPTIONS = [
  { value: 'patient_loaded', label: '患者信息加载后' },
  { value: 'chief_complaint_saved', label: '主诉录入后' },
  { value: 'diagnosis_changed', label: '诊断变更后' },
  { value: 'exam_order_before', label: '检查申请前' },
  { value: 'lab_order_before', label: '检验申请前' },
  { value: 'prescription_before', label: '处方开立前' },
  { value: 'order_submit_before', label: '医嘱提交前' },
  { value: 'record_save_before', label: '病历保存前' },
  { value: 'manual', label: '手动触发' },
]
const ACTION_TYPE_OPTIONS = [
  { value: 'notice', label: '仅提示' },
  { value: 'confirm_warning', label: '警告确认' },
  { value: 'hard_block', label: '强拦截' },
  { value: 'recommend_dx', label: '推荐补充诊断' },
  { value: 'recommend_exam', label: '推荐检查项目' },
  { value: 'recommend_lab', label: '推荐检验项目' },
  { value: 'recommend_treatment', label: '推荐治疗方案' },
  { value: 'writeback', label: '写回HIS字段' },
]
const WRITEBACK_TARGET_OPTIONS = [
  { value: '', label: '无' },
  { value: 'chief_complaint', label: '主诉' },
  { value: 'present_illness', label: '现病史' },
  { value: 'history_illness', label: '既往史' },
  { value: 'primary_diagnosis', label: '初步诊断' },
  { value: 'confirmed_diagnosis', label: '确诊诊断' },
  { value: 'exam_order', label: '检查申请' },
  { value: 'lab_order', label: '检验申请' },
  { value: 'order', label: '医嘱' },
  { value: 'prescription', label: '处方' },
  { value: 'risk_flag', label: '风险标记' },
]
const SOURCE_TYPE_OPTIONS = [
  { value: 'guideline', label: '临床指南' },
  { value: 'consensus', label: '专家共识' },
  { value: 'drug_insert', label: '药品说明书' },
  { value: 'hospital_policy', label: '医院制度' },
  { value: 'clinical_pathway', label: '临床路径' },
  { value: 'custom', label: '项目自定义' },
]
const ENABLED_OPTIONS = [
  { value: 'true', label: '启用' },
  { value: 'false', label: '停用' },
]
const TAB_ITEMS = [
  { key: 'basic', label: '基本信息' },
  { key: 'trigger', label: '触发配置' },
  { key: 'condition', label: '条件配置' },
  { key: 'action', label: '输出动作' },
  { key: 'governance', label: '依据治理' },
  { key: 'test', label: '测试发布' },
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

const EMPTY_FORM = {
  name: '',
  code: 'CUSTOM_RULE',
  scenario: 'diagnosis_consistency',
  level: 'warning',
  category: 'risk',
  module_name: 'risk',
  clinical_scene: 'common',
  rule_type: 'risk_alert',
  trigger_scene: 'diagnosis_entry',
  trigger_timing: 'diagnosis_changed',
  priority_level: 10,
  action_type: 'confirm_warning',
  writeback_target: '',
  message: '',
  suggestion: '',
  source_type: 'guideline',
  source_name: '',
  maintainer: '',
  enabled: true,
  condition_json: JSON.stringify({
    all: [{ op: 'contains_any', field: 'diagnoses', values: ['心肌梗死'] }],
    any: [{ op: 'contains_any', field: 'drug_names', values: ['布洛芬'] }],
    not: [],
  }, null, 2),
}

const EMPTY_TEST_FORM = {
  diagnoses_text: '',
  drug_names_text: '',
  exam_names_text: '',
  patient_allergies_text: '',
  patient_gender: '',
  patient_age: '',
  lab_results_json: '[]',
}

function jsonValid(str) {
  try { JSON.parse(str); return true } catch { return false }
}

function parseListText(v) {
  return String(v || '').split(/[，,\n]/).map(s => s.trim()).filter(Boolean)
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
    out[key] = items.map((item) => {
      if (LAB_OP_SET.has(item.op)) {
        const item_code = String(item.itemCode || '').trim()
        const valueText = String(item.valueText || '').trim()
        if (!item_code || !valueText) return null
        if (item.op === 'lab_is_abnormal') return { op: item.op, item_code, value: parseAbnormalBool(valueText) }
        return { op: item.op, item_code, value: valueText }
      }
      if (SINGLE_OP_SET.has(item.op)) {
        const value = String(item.valueText || '').trim()
        if (!value) return null
        return { op: item.op, field: item.field, value }
      }
      const values = String(item.valuesText || '').split(/[，,]/).map(s => s.trim()).filter(Boolean)
      if (!values.length) return null
      return { op: item.op, field: item.field, values }
    }).filter(Boolean)
  })
  return out
}

export function AuditRulesAdminPage() {
  const fetchFn = useCallback((p) => auditRuleApi.list(p), [])
  const { items, total, totalPages, page, inputQ, loading, setInputQ, handleSearch, handlePageChange, reload } = useListPage(fetchFn)
  const [modal, setModal] = useState(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [editRow, setEditRow] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [testForm, setTestForm] = useState(EMPTY_TEST_FORM)
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [formErr, setFormErr] = useState({})
  const [saving, setSaving] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [publishingId, setPublishingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [templateKey, setTemplateKey] = useState('dx_drug')
  const [actionErr, setActionErr] = useState('')
  const [visualCondition, setVisualCondition] = useState(() => conditionToVisual(JSON.parse(EMPTY_FORM.condition_json)).visual)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setTF = (k, v) => setTestForm(f => ({ ...f, [k]: v }))

  const openCreate = () => {
    setModal('create')
    setActiveTab('basic')
    setEditRow(null)
    setForm(EMPTY_FORM)
    setTestForm(EMPTY_TEST_FORM)
    setTestResult(null)
    setFormErr({})
    setActionErr('')
    setTemplateKey('dx_drug')
    setVisualCondition(conditionToVisual(JSON.parse(EMPTY_FORM.condition_json)).visual)
  }

  const openEdit = (row) => {
    const condition = row.condition || {}
    setModal('edit')
    setActiveTab('basic')
    setEditRow(row)
    setForm({
      name: row.name || '',
      code: row.code || 'CUSTOM_RULE',
      scenario: row.scenario || 'diagnosis_consistency',
      level: row.level || 'warning',
      category: row.category || 'risk',
      module_name: row.module_name || 'risk',
      clinical_scene: row.clinical_scene || 'common',
      rule_type: row.rule_type || 'risk_alert',
      trigger_scene: row.trigger_scene || 'diagnosis_entry',
      trigger_timing: row.trigger_timing || 'diagnosis_changed',
      priority_level: row.priority_level ?? 10,
      action_type: row.action_type || 'confirm_warning',
      writeback_target: row.writeback_target || '',
      message: row.message || '',
      suggestion: row.suggestion || '',
      source_type: row.source_type || 'guideline',
      source_name: row.source_name || '',
      maintainer: row.maintainer || '',
      enabled: row.enabled !== false,
      condition_json: JSON.stringify(condition, null, 2),
    })
    setVisualCondition(conditionToVisual(condition).visual)
    setTestForm(EMPTY_TEST_FORM)
    setTestResult(null)
    setFormErr({})
    setActionErr('')
  }

  const openView = (row) => {
    setEditRow(row)
    setModal('view')
  }

  const applyTemplate = () => {
    const target = CONDITION_TEMPLATES.find(i => i.key === templateKey) || CONDITION_TEMPLATES[0]
    const json = JSON.stringify(target.value, null, 2)
    setF('condition_json', json)
    setVisualCondition(conditionToVisual(target.value).visual)
  }

  const syncVisualFromJson = () => {
    if (!jsonValid(form.condition_json)) {
      setActionErr('JSON 格式错误，无法载入图形化条件')
      return
    }
    const { visual, unsupported } = conditionToVisual(JSON.parse(form.condition_json))
    setVisualCondition(visual)
    setActionErr(unsupported > 0 ? `已忽略 ${unsupported} 条暂不支持图形化的条件` : '')
  }

  const syncJsonFromVisual = () => {
    setF('condition_json', JSON.stringify(visualToCondition(visualCondition), null, 2))
    setActionErr('')
  }

  const addVisualItem = (groupKey) => setVisualCondition(prev => ({ ...prev, [groupKey]: [...(prev[groupKey] || []), makeVisualItem()] }))
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
    if (!form.code.trim()) err.code = '规则编码不能为空'
    if (!form.message.trim()) err.message = '输出内容不能为空'
    if (!form.action_type) err.action_type = '动作类型不能为空'
    if (!jsonValid(form.condition_json)) err.condition_json = '条件 JSON 格式错误'
    return err
  }

  const handleSave = async () => {
    setActionErr('')
    const err = validate()
    if (Object.keys(err).length) {
      setFormErr(err)
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        scenario: form.scenario,
        level: form.level,
        category: form.category || null,
        module_name: form.module_name || null,
        clinical_scene: form.clinical_scene || null,
        rule_type: form.rule_type || null,
        trigger_scene: form.trigger_scene || null,
        trigger_timing: form.trigger_timing || null,
        priority_level: Number(form.priority_level) || 0,
        action_type: form.action_type || null,
        writeback_target: form.writeback_target || null,
        message: form.message.trim(),
        suggestion: form.suggestion.trim() || null,
        source_type: form.source_type || null,
        source_name: form.source_name.trim() || null,
        maintainer: form.maintainer.trim() || null,
        enabled: form.enabled,
        condition: JSON.parse(form.condition_json),
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

  const handleTest = async () => {
    if (!jsonValid(form.condition_json)) {
      setActionErr('条件 JSON 不合法，无法测试')
      return
    }
    if (!jsonValid(testForm.lab_results_json)) {
      setActionErr('测试数据中的检验结果 JSON 不合法')
      return
    }
    setActionErr('')
    setTesting(true)
    try {
      const res = await auditRuleApi.test({
        condition: JSON.parse(form.condition_json),
        diagnoses: parseListText(testForm.diagnoses_text),
        drug_names: parseListText(testForm.drug_names_text),
        exam_names: parseListText(testForm.exam_names_text),
        patient_allergies: parseListText(testForm.patient_allergies_text),
        patient_gender: testForm.patient_gender || null,
        patient_age: testForm.patient_age === '' ? null : Number(testForm.patient_age),
        lab_results: JSON.parse(testForm.lab_results_json),
      })
      setTestResult(res)
    } catch (e) {
      setActionErr(getApiErrorMessage(e, '测试失败，请检查测试输入'))
    } finally {
      setTesting(false)
    }
  }

  const columns = [
    { key: 'name', title: '规则名称', render: (v) => <span className="font-medium text-gray-900">{v}</span> },
    { key: 'code', title: '规则编码', width: '130px' },
    { key: 'category', title: '规则分类', width: '110px', render: (v) => CATEGORY_OPTIONS.find(i => i.value === v)?.label || '—' },
    { key: 'clinical_scene', title: '适用场景', width: '92px', render: (v) => CLINICAL_SCENE_OPTIONS.find(i => i.value === v)?.label || '—' },
    { key: 'trigger_timing', title: '触发时机', width: '120px', render: (v) => TRIGGER_TIMING_OPTIONS.find(i => i.value === v)?.label || '—' },
    { key: 'priority_level', title: '优先级', width: '70px', render: (v) => v ?? 0 },
    { key: 'version', title: '版本', width: '70px', render: (v) => v ?? 1 },
    { key: 'is_published', title: '发布', width: '80px', render: (v) => <StatusBadge status={v ? 'published' : 'draft'} /> },
    { key: 'enabled', title: '启用', width: '80px', render: (v) => <StatusBadge status={v ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      title: '操作',
      width: '170px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openView(row)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="查看"><Eye size={14} /></button>
          <button onClick={() => openEdit(row)} className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors" title="编辑"><Pencil size={14} /></button>
          <button onClick={() => handleToggle(row)} disabled={togglingId === row.id} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50" title={row.enabled ? '停用' : '启用'}>
            {row.enabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          </button>
          <button onClick={() => handlePublish(row)} disabled={publishingId === row.id} className="p-1.5 rounded text-gray-400 hover:text-success hover:bg-green-50 transition-colors disabled:opacity-50" title="发布"><Send size={14} /></button>
          <button onClick={() => setDelTarget(row)} className="p-1.5 rounded text-gray-400 hover:text-danger hover:bg-red-50 transition-colors" title="删除"><Trash2 size={14} /></button>
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
        action={<button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"><Plus size={15} />新增规则</button>}
      />
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 max-w-sm flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2 focus-within:border-primary transition-colors">
          <Search size={14} className="text-gray-400" />
          <input type="text" value={inputQ} onChange={e => setInputQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="搜索规则名称/编码..." className="flex-1 text-sm outline-none placeholder-gray-400" />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 transition-colors">搜索</button>
      </div>
      {actionErr && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-danger">{actionErr}</div>}
      <DataTable columns={columns} rows={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
      <ConfirmDialog open={!!delTarget} title="确认删除规则" description={`即将删除规则「${delTarget?.name}」，此操作不可恢复。`} onConfirm={handleDelete} onCancel={() => setDelTarget(null)} loading={deleting} />
      <Modal
        open={modal === 'create' || modal === 'edit' || modal === 'view'}
        title={modal === 'create' ? '新增规则' : modal === 'view' ? '查看规则' : '编辑规则'}
        onClose={() => setModal(null)}
        width={980}
        bodyMinHeight={modal === 'view' ? undefined : 560}
        footer={modal === 'view'
          ? <button onClick={() => setModal(null)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">关闭</button>
          : <>
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-border rounded-lg hover:bg-gray-50 transition-colors">取消</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-600 disabled:opacity-60 transition-colors">{saving ? '保存中...' : '保存'}</button>
          </>}
      >
        {modal === 'view' ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">规则名称:</span> <span className="ml-2 font-medium">{editRow?.name}</span></div>
            <div><span className="text-gray-500">规则编码:</span> <span className="ml-2">{editRow?.code || '—'}</span></div>
            <div><span className="text-gray-500">规则分类:</span> <span className="ml-2">{CATEGORY_OPTIONS.find(o => o.value === editRow?.category)?.label || '—'}</span></div>
            <div><span className="text-gray-500">模块归属:</span> <span className="ml-2">{MODULE_OPTIONS.find(o => o.value === editRow?.module_name)?.label || '—'}</span></div>
            <div><span className="text-gray-500">适用场景:</span> <span className="ml-2">{CLINICAL_SCENE_OPTIONS.find(o => o.value === editRow?.clinical_scene)?.label || '—'}</span></div>
            <div><span className="text-gray-500">触发时机:</span> <span className="ml-2">{TRIGGER_TIMING_OPTIONS.find(o => o.value === editRow?.trigger_timing)?.label || '—'}</span></div>
            <div><span className="text-gray-500">动作类型:</span> <span className="ml-2">{ACTION_TYPE_OPTIONS.find(o => o.value === editRow?.action_type)?.label || '—'}</span></div>
            <div><span className="text-gray-500">写回目标:</span> <span className="ml-2">{WRITEBACK_TARGET_OPTIONS.find(o => o.value === (editRow?.writeback_target || ''))?.label || '—'}</span></div>
            <div><span className="text-gray-500">维护人:</span> <span className="ml-2">{editRow?.maintainer || '—'}</span></div>
            <div><span className="text-gray-500">来源:</span> <span className="ml-2">{editRow?.source_name || '—'}</span></div>
            <div><span className="text-gray-500">启用:</span> <span className="ml-2"><StatusBadge status={editRow?.enabled ? 'active' : 'inactive'} /></span></div>
            <div><span className="text-gray-500">发布:</span> <span className="ml-2"><StatusBadge status={editRow?.is_published ? 'published' : 'draft'} /></span></div>
            <div className="col-span-2"><span className="text-gray-500">输出内容:</span><div className="mt-1">{editRow?.message || '—'}</div></div>
            <div className="col-span-2"><span className="text-gray-500">建议:</span><div className="mt-1">{editRow?.suggestion || '—'}</div></div>
            <div className="col-span-2"><span className="text-gray-500">条件表达式:</span><pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">{JSON.stringify(editRow?.condition || {}, null, 2)}</pre></div>
          </div>
        ) : (
          <div>
            {formErr._api && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-danger">{formErr._api}</div>}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              {TAB_ITEMS.map(t => (
                <button key={t.key} type="button" onClick={() => setActiveTab(t.key)} className={`px-3 h-8 rounded text-xs border transition-colors ${activeTab === t.key ? 'border-primary text-primary bg-primary-50' : 'border-border text-gray-600 hover:bg-gray-50'}`}>{t.label}</button>
              ))}
            </div>

            {activeTab === 'basic' && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="规则名称" required error={formErr.name}><TextInput value={form.name} onChange={e => setF('name', e.target.value)} /></FormField>
                <FormField label="规则编码" required error={formErr.code}><TextInput value={form.code} onChange={e => setF('code', e.target.value)} /></FormField>
                <FormField label="规则分类"><SelectInput value={form.category} onChange={e => setF('category', e.target.value)} options={CATEGORY_OPTIONS} /></FormField>
                <FormField label="模块归属"><SelectInput value={form.module_name} onChange={e => setF('module_name', e.target.value)} options={MODULE_OPTIONS} /></FormField>
                <FormField label="适用场景"><SelectInput value={form.clinical_scene} onChange={e => setF('clinical_scene', e.target.value)} options={CLINICAL_SCENE_OPTIONS} /></FormField>
                <FormField label="审核场景"><SelectInput value={form.scenario} onChange={e => setF('scenario', e.target.value)} options={SCENARIO_OPTIONS} /></FormField>
                <FormField label="严重级别"><SelectInput value={form.level} onChange={e => setF('level', e.target.value)} options={LEVEL_OPTIONS} /></FormField>
                <FormField label="执行优先级"><TextInput type="number" value={String(form.priority_level)} onChange={e => setF('priority_level', e.target.value)} /></FormField>
                <FormField label="启用状态"><SelectInput value={String(form.enabled)} onChange={e => setF('enabled', e.target.value === 'true')} options={ENABLED_OPTIONS} /></FormField>
                <div />
              </div>
            )}

            {activeTab === 'trigger' && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="触发事件"><TextInput value={form.trigger_scene} onChange={e => setF('trigger_scene', e.target.value)} placeholder="如 diagnosis_entry" /></FormField>
                <FormField label="触发时机"><SelectInput value={form.trigger_timing} onChange={e => setF('trigger_timing', e.target.value)} options={TRIGGER_TIMING_OPTIONS} /></FormField>
                <FormField label="规则类型"><TextInput value={form.rule_type} onChange={e => setF('rule_type', e.target.value)} /></FormField>
              </div>
            )}

            {activeTab === 'condition' && (
              <FormField label="条件表达式（图形化 + JSON）" required error={formErr.condition_json}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <select value={templateKey} onChange={e => setTemplateKey(e.target.value)} className="h-8 px-2 border border-border rounded text-xs bg-white">{CONDITION_TEMPLATES.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
                  <button type="button" onClick={applyTemplate} className="px-2.5 h-8 text-xs border border-border rounded hover:bg-gray-50 transition-colors">模板</button>
                  <button type="button" onClick={syncVisualFromJson} className="px-2.5 h-8 text-xs border border-border rounded hover:bg-gray-50 transition-colors">JSON→图形</button>
                  <button type="button" onClick={syncJsonFromVisual} className="px-2.5 h-8 text-xs border border-border rounded hover:bg-gray-50 transition-colors">图形→JSON</button>
                </div>
                <div className="mb-3 p-3 border border-border rounded bg-gray-50/60">
                  {VISUAL_GROUPS.map(({ key, label }) => (
                    <div key={key} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-xs font-medium text-gray-600">{label}</div>
                        <button type="button" onClick={() => addVisualItem(key)} className="h-7 px-2 text-xs border border-border rounded hover:bg-white transition-colors">添加条件</button>
                      </div>
                      {(visualCondition[key] || []).map((item, idx) => (
                        <div key={`${key}-${idx}`} className="flex items-center gap-2 mb-2 last:mb-0">
                          <select value={item.op} onChange={e => updateVisualItem(key, idx, 'op', e.target.value)} className="h-8 px-2 border border-border rounded text-xs bg-white min-w-[108px]">{VISUAL_OP_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
                          {!LAB_OP_SET.has(item.op) && <select value={item.field} onChange={e => updateVisualItem(key, idx, 'field', e.target.value)} className="h-8 px-2 border border-border rounded text-xs bg-white min-w-[96px]">{VISUAL_FIELD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>}
                          {LAB_OP_SET.has(item.op)
                            ? <>
                              <input value={item.itemCode || ''} onChange={e => updateVisualItem(key, idx, 'itemCode', e.target.value)} className="h-8 px-2 border border-border rounded text-xs bg-white min-w-[120px]" placeholder="检验项编码" />
                              <input value={item.valueText || ''} onChange={e => updateVisualItem(key, idx, 'valueText', e.target.value)} className="flex-1 h-8 px-2 border border-border rounded text-xs bg-white" placeholder="阈值或true/false" />
                            </>
                            : SINGLE_OP_SET.has(item.op)
                              ? <input value={item.valueText || ''} onChange={e => updateVisualItem(key, idx, 'valueText', e.target.value)} className="flex-1 h-8 px-2 border border-border rounded text-xs bg-white" placeholder="单值" />
                              : <input value={item.valuesText} onChange={e => updateVisualItem(key, idx, 'valuesText', e.target.value)} className="flex-1 h-8 px-2 border border-border rounded text-xs bg-white" placeholder="逗号分隔多值" />
                          }
                          <button type="button" onClick={() => removeVisualItem(key, idx)} className="h-8 px-2 text-xs border border-border rounded hover:bg-white transition-colors">删除</button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <textarea value={form.condition_json} onChange={e => setF('condition_json', e.target.value)} rows={10} className="w-full text-xs font-mono border border-border rounded px-3 py-2 outline-none focus:border-primary transition-colors resize-y" />
              </FormField>
            )}

            {activeTab === 'action' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="动作类型" required error={formErr.action_type}><SelectInput value={form.action_type} onChange={e => setF('action_type', e.target.value)} options={ACTION_TYPE_OPTIONS} /></FormField>
                  <FormField label="写回目标"><SelectInput value={form.writeback_target} onChange={e => setF('writeback_target', e.target.value)} options={WRITEBACK_TARGET_OPTIONS} /></FormField>
                </div>
                <FormField label="输出内容" required error={formErr.message}><TextArea value={form.message} onChange={e => setF('message', e.target.value)} rows={3} /></FormField>
                <FormField label="建议内容"><TextArea value={form.suggestion} onChange={e => setF('suggestion', e.target.value)} rows={4} /></FormField>
              </div>
            )}

            {activeTab === 'governance' && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="规则来源类型"><SelectInput value={form.source_type} onChange={e => setF('source_type', e.target.value)} options={SOURCE_TYPE_OPTIONS} /></FormField>
                <FormField label="规则来源名称"><TextInput value={form.source_name} onChange={e => setF('source_name', e.target.value)} placeholder="如：ESC 2025 急性冠脉综合征指南" /></FormField>
                <FormField label="维护人"><TextInput value={form.maintainer} onChange={e => setF('maintainer', e.target.value)} /></FormField>
                <div className="text-xs text-gray-500 flex items-center">当前版本 {editRow?.version || 1}，发布状态 {editRow?.is_published ? '已发布' : '草稿'}</div>
              </div>
            )}

            {activeTab === 'test' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="诊断列表"><TextArea value={testForm.diagnoses_text} onChange={e => setTF('diagnoses_text', e.target.value)} rows={2} placeholder="逗号或换行分隔" /></FormField>
                  <FormField label="用药列表"><TextArea value={testForm.drug_names_text} onChange={e => setTF('drug_names_text', e.target.value)} rows={2} placeholder="逗号或换行分隔" /></FormField>
                  <FormField label="检查列表"><TextArea value={testForm.exam_names_text} onChange={e => setTF('exam_names_text', e.target.value)} rows={2} placeholder="逗号或换行分隔" /></FormField>
                  <FormField label="过敏史"><TextArea value={testForm.patient_allergies_text} onChange={e => setTF('patient_allergies_text', e.target.value)} rows={2} placeholder="逗号或换行分隔" /></FormField>
                  <FormField label="患者性别"><TextInput value={testForm.patient_gender} onChange={e => setTF('patient_gender', e.target.value)} placeholder="男/女" /></FormField>
                  <FormField label="患者年龄"><TextInput type="number" value={testForm.patient_age} onChange={e => setTF('patient_age', e.target.value)} /></FormField>
                </div>
                <FormField label="检验结果 JSON"><textarea value={testForm.lab_results_json} onChange={e => setTF('lab_results_json', e.target.value)} rows={5} className="w-full text-xs font-mono border border-border rounded px-3 py-2 outline-none focus:border-primary transition-colors resize-y" /></FormField>
                <button type="button" onClick={handleTest} disabled={testing} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-primary text-white hover:bg-primary-600 disabled:opacity-60"><FlaskConical size={14} />{testing ? '测试中...' : '测试规则命中'}</button>
                {testResult && (
                  <div className={`rounded border p-3 text-sm ${testResult.matched ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="font-medium">{testResult.matched ? '命中规则' : '未命中规则'}</div>
                    <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
