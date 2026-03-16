import { useState, useCallback } from 'react'
import { Activity, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { diseaseApi } from '@/api'
import { useListPage } from '@/hooks/useListPage'
import { PageHeader }    from '@/components/common/PageHeader'
import { DataTable }     from '@/components/common/DataTable'
import { Pagination }    from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal }         from '@/components/common/Modal'
import { FormField, TextInput, TextArea, SelectInput } from '@/components/common/FormField'
import { StatusBadge }   from '@/components/common/StatusBadge'

// ─── 选项常量 ─────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  '内科','外科','妇产科','儿科','神经科','心血管科','呼吸科','消化科',
  '内分泌科','肿瘤科','感染科','肾内科','风湿免疫科','皮肤科','急诊科',
]
const SYSTEMS = [
  '循环系统','呼吸系统','消化系统','泌尿系统','神经系统','内分泌系统',
  '运动系统','免疫系统','血液系统','生殖系统','皮肤','五官',
]
const DISEASE_TYPES = [
  '感染性疾病','慢性疾病','急症','肿瘤','遗传性疾病','免疫性疾病',
  '代谢性疾病','中毒','创伤','其他',
]

const toOpts = (arr) => arr.map(v => ({ value: v, label: v }))

// ─── 空表单 ───────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  icd_code: '',
  department: '',
  system: '',
  disease_type: '',
  specialty: '',
  overview: '',
  definition: '',
  etiology: '',
  pathogenesis: '',
  symptoms: '',
  diagnosis_criteria: '',
  differential_diagnosis: '',
  complications: '',
  treatment: '',
  prognosis: '',
  prevention: '',
  follow_up: '',
  source: '',
  version_no: '',
}

// ─── 表单分节 ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  { label: '基本信息', key: 'basic' },
  { label: '知识内容', key: 'content' },
  { label: '治疗与管理', key: 'treatment' },
  { label: '来源信息', key: 'source' },
]

export function DiseasesAdminPage() {
  const fetchFn = useCallback((p) => diseaseApi.list(p), [])
  const { items, total, totalPages, page, inputQ, loading,
          setInputQ, handleSearch, handlePageChange, reload } = useListPage(fetchFn)

  const [modal, setModal]     = useState(null)   // null | 'create' | 'edit'
  const [activeTab, setActiveTab] = useState('basic')
  const [editRow, setEditRow] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState({})

  const [delTarget, setDelTarget] = useState(null)
  const [deleting, setDeleting]   = useState(false)

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormErr({})
    setActiveTab('basic')
    setEditRow(null)
    setModal('create')
  }

  const openEdit = (row) => {
    setForm({
      name:                 row.name                 || '',
      icd_code:             row.icd_code             || '',
      department:           row.department           || '',
      system:               row.system               || '',
      disease_type:         row.disease_type         || '',
      specialty:            row.specialty            || '',
      overview:             row.overview             || '',
      definition:           row.definition           || '',
      etiology:             row.etiology             || '',
      pathogenesis:         row.pathogenesis         || '',
      symptoms:             row.symptoms             || '',
      diagnosis_criteria:   row.diagnosis_criteria   || '',
      differential_diagnosis: row.differential_diagnosis || '',
      complications:        row.complications        || '',
      treatment:            row.treatment            || '',
      prognosis:            row.prognosis            || '',
      prevention:           row.prevention           || '',
      follow_up:            row.follow_up            || '',
      source:               row.source               || '',
      version_no:           row.version_no           || '',
    })
    setFormErr({})
    setActiveTab('basic')
    setEditRow(row)
    setModal('edit')
  }

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = '疾病名称不能为空'
    return err
  }

  const handleSave = async () => {
    const err = validate()
    if (Object.keys(err).length) { setFormErr(err); setActiveTab('basic'); return }
    setSaving(true)
    try {
      // 过滤空字符串 → undefined，避免覆盖已有内容为空
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
      )
      if (modal === 'create') {
        await diseaseApi.create(payload)
      } else {
        await diseaseApi.update(editRow.id, payload)
      }
      setModal(null)
      reload()
    } catch (e) {
      alert(e?.response?.data?.detail || '操作失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await diseaseApi.remove(delTarget.id)
      setDelTarget(null)
      reload()
    } catch (e) {
      alert(e?.response?.data?.detail || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // ─── 表格列 ───────────────────────────────────────────────────────────────

  const columns = [
    { key: 'name', title: '疾病名称', width: '200px',
      render: (v, row) => (
        <div>
          <div className="font-medium text-gray-900 line-clamp-1">{v}</div>
          {row.disease_type && <div className="text-xs text-gray-400">{row.disease_type}</div>}
        </div>
      )
    },
    { key: 'icd_code',   title: 'ICD编码',  width: '90px' },
    { key: 'department', title: '科室',      width: '90px' },
    { key: 'system',     title: '系统',      width: '90px' },
    { key: 'overview',   title: '概述',
      render: (v) => <span className="text-gray-500 text-sm line-clamp-2">{v || '—'}</span>
    },
    { key: 'is_published', title: '状态', width: '70px',
      render: (v) => <StatusBadge status={v !== false ? 'active' : 'inactive'} />
    },
    { key: '_actions', title: '操作', width: '100px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
            title="编辑"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDelTarget(row)}
            className="p-1.5 rounded text-gray-400 hover:text-danger hover:bg-red-50 transition-colors"
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    },
  ]

  // ─── 弹窗内各分节内容 ─────────────────────────────────────────────────────

  const renderBasic = () => (
    <>
      <div className="grid grid-cols-2 gap-x-4">
        <FormField label="疾病名称" required error={formErr.name} className="col-span-2">
          <TextInput value={form.name} onChange={set('name')} placeholder="如：2型糖尿病" />
        </FormField>
        <FormField label="ICD-10编码">
          <TextInput value={form.icd_code} onChange={set('icd_code')} placeholder="如：E11" />
        </FormField>
        <FormField label="疾病类型">
          <SelectInput value={form.disease_type} onChange={set('disease_type')}
            options={toOpts(DISEASE_TYPES)} placeholder="请选择疾病类型" />
        </FormField>
        <FormField label="所属科室">
          <SelectInput value={form.department} onChange={set('department')}
            options={toOpts(DEPARTMENTS)} placeholder="请选择科室" />
        </FormField>
        <FormField label="细化专科">
          <TextInput value={form.specialty} onChange={set('specialty')} placeholder="如：心血管内科" />
        </FormField>
        <FormField label="器官系统" className="col-span-2">
          <SelectInput value={form.system} onChange={set('system')}
            options={toOpts(SYSTEMS)} placeholder="请选择器官系统" />
        </FormField>
      </div>
      <FormField label="疾病概述">
        <TextArea value={form.overview} onChange={set('overview')} placeholder="简要描述疾病概况..." rows={3} />
      </FormField>
      <FormField label="定义">
        <TextArea value={form.definition} onChange={set('definition')} placeholder="疾病定义..." rows={2} />
      </FormField>
    </>
  )

  const renderContent = () => (
    <>
      <FormField label="病因">
        <TextArea value={form.etiology} onChange={set('etiology')} placeholder="病因与危险因素..." rows={3} />
      </FormField>
      <FormField label="发病机制">
        <TextArea value={form.pathogenesis} onChange={set('pathogenesis')} placeholder="发病机制..." rows={3} />
      </FormField>
      <FormField label="临床表现">
        <TextArea value={form.symptoms} onChange={set('symptoms')} placeholder="主要症状与体征..." rows={3} />
      </FormField>
      <FormField label="诊断标准">
        <TextArea value={form.diagnosis_criteria} onChange={set('diagnosis_criteria')} placeholder="诊断标准与依据..." rows={3} />
      </FormField>
      <FormField label="鉴别诊断">
        <TextArea value={form.differential_diagnosis} onChange={set('differential_diagnosis')} placeholder="需鉴别的疾病..." rows={2} />
      </FormField>
      <FormField label="并发症">
        <TextArea value={form.complications} onChange={set('complications')} placeholder="常见并发症..." rows={2} />
      </FormField>
    </>
  )

  const renderTreatment = () => (
    <>
      <FormField label="治疗概述">
        <TextArea value={form.treatment} onChange={set('treatment')} placeholder="治疗原则与方案概述..." rows={4} />
      </FormField>
      <FormField label="预防">
        <TextArea value={form.prevention} onChange={set('prevention')} placeholder="预防措施..." rows={2} />
      </FormField>
      <FormField label="预后">
        <TextArea value={form.prognosis} onChange={set('prognosis')} placeholder="预后说明..." rows={2} />
      </FormField>
      <FormField label="随访建议">
        <TextArea value={form.follow_up} onChange={set('follow_up')} placeholder="随访周期、复查项目建议..." rows={2} />
      </FormField>
    </>
  )

  const renderSource = () => (
    <div className="grid grid-cols-2 gap-x-4">
      <FormField label="数据来源" className="col-span-2">
        <TextInput value={form.source} onChange={set('source')} placeholder="如：MSD诊疗手册、第X版内科学" />
      </FormField>
      <FormField label="版本号">
        <TextInput value={form.version_no} onChange={set('version_no')} placeholder="如：v2.0" />
      </FormField>
    </div>
  )

  const tabContent = {
    basic:     renderBasic,
    content:   renderContent,
    treatment: renderTreatment,
    source:    renderSource,
  }

  // ─── 渲染 ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        icon={Activity} color="blue"
        title="疾病库管理"
        description={`共 ${total} 条疾病记录`}
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm
                       rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus size={15} />
            新增疾病
          </button>
        }
      />

      {/* 搜索栏 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 max-w-sm flex items-center gap-2 bg-white border border-border rounded-lg
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

      <DataTable columns={columns} rows={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!delTarget}
        title="确认删除疾病"
        description={`即将删除「${delTarget?.name}」，此操作不可恢复。`}
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
        loading={deleting}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        open={!!modal}
        title={modal === 'create' ? '新增疾病' : `编辑疾病 — ${editRow?.name || ''}`}
        onClose={() => setModal(null)}
        width={720}
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              className="px-4 py-2 text-sm text-gray-600 border border-border rounded-lg
                         hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-primary rounded-lg
                         hover:bg-primary-600 disabled:opacity-60 flex items-center gap-1.5 transition-colors"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        {/* 分节 Tab */}
        <div className="flex border-b border-border mb-5 -mt-1">
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
                ${activeTab === s.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        {tabContent[activeTab]?.()}
      </Modal>
    </div>
  )
}
