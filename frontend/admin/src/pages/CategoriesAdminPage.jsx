import { useEffect, useState } from 'react'
import { FolderTree, Plus, Pencil, Trash2, Tag, BookOpen, Info, Check } from 'lucide-react'
import { PageHeader }    from '@/components/common/PageHeader'
import { Modal }         from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormField, TextInput } from '@/components/common/FormField'
import { configApi } from '@/api'

// ─── 默认科室分类数据 ──────────────────────────────────────────────────────────

const DEFAULT_DEPARTMENTS = [
  { id: 'd1',  name: '内科',     color: 'blue',   scope: ['疾病', '药品', '指南', '文献'] },
  { id: 'd2',  name: '外科',     color: 'green',  scope: ['疾病', '药品', '指南'] },
  { id: 'd3',  name: '妇产科',   color: 'pink',   scope: ['疾病', '药品', '指南', '文献'] },
  { id: 'd4',  name: '儿科',     color: 'yellow', scope: ['疾病', '药品', '指南', '文献'] },
  { id: 'd5',  name: '神经科',   color: 'purple', scope: ['疾病', '药品', '指南'] },
  { id: 'd6',  name: '心血管科', color: 'red',    scope: ['疾病', '药品', '指南', '文献'] },
  { id: 'd7',  name: '呼吸科',   color: 'cyan',   scope: ['疾病', '药品', '指南', '文献'] },
  { id: 'd8',  name: '消化科',   color: 'orange', scope: ['疾病', '药品', '指南'] },
  { id: 'd9',  name: '内分泌科', color: 'teal',   scope: ['疾病', '药品', '指南', '文献'] },
  { id: 'd10', name: '肿瘤科',   color: 'red',    scope: ['疾病', '药品', '指南', '文献'] },
  { id: 'd11', name: '感染科',   color: 'green',  scope: ['疾病', '药品', '指南', '文献'] },
  { id: 'd12', name: '肾内科',   color: 'blue',   scope: ['疾病', '药品', '指南'] },
  { id: 'd13', name: '风湿免疫科', color: 'purple', scope: ['疾病', '药品', '指南'] },
  { id: 'd14', name: '皮肤科',   color: 'pink',   scope: ['疾病', '药品', '指南'] },
  { id: 'd15', name: '急诊科',   color: 'red',    scope: ['疾病', '指南', '文献'] },
  { id: 'd16', name: '骨科',     color: 'brown',  scope: ['疾病', '药品', '指南'] },
  { id: 'd17', name: '眼科',     color: 'cyan',   scope: ['疾病', '指南'] },
  { id: 'd18', name: '精神科',   color: 'purple', scope: ['疾病', '药品', '指南'] },
  { id: 'd19', name: '血液科',   color: 'red',    scope: ['疾病', '药品', '指南', '文献'] },
  { id: 'd20', name: '重症医学', color: 'orange', scope: ['疾病', '指南', '文献'] },
  { id: 'd21', name: '综合',     color: 'gray',   scope: ['疾病', '药品', '检验', '指南', '文献'] },
]

const DEFAULT_PC_NAV = [
  { key: 'home', label: '工作台', path: '/', enabled: true },
  { key: 'diseases', label: '疾病库', path: '/diseases', enabled: true },
  { key: 'drugs', label: '药品库', path: '/drugs', enabled: true },
  { key: 'exams', label: '检验检查', path: '/exams', enabled: true },
  { key: 'guidelines', label: '临床指南', path: '/guidelines', enabled: true },
  { key: 'treatments', label: '治疗方案', path: '/treatments', enabled: true },
  { key: 'formulas', label: '医学公式', path: '/formulas', enabled: true },
  { key: 'assessments', label: '评估量表', path: '/assessments', enabled: true },
]
const COLOR_OPTIONS = [
  { value: 'blue',   label: '蓝色' },
  { value: 'green',  label: '绿色' },
  { value: 'red',    label: '红色' },
  { value: 'purple', label: '紫色' },
  { value: 'pink',   label: '粉色' },
  { value: 'yellow', label: '黄色' },
  { value: 'orange', label: '橙色' },
  { value: 'cyan',   label: '青色' },
  { value: 'teal',   label: '青绿' },
  { value: 'gray',   label: '灰色' },
]
const SCOPE_OPTIONS = ['疾病', '药品', '检验', '指南', '文献', '公式', '量表']

const COLOR_CLASS = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  green:  'bg-green-50 text-green-700 border-green-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  pink:   'bg-pink-50 text-pink-700 border-pink-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  cyan:   'bg-cyan-50 text-cyan-700 border-cyan-200',
  teal:   'bg-teal-50 text-teal-700 border-teal-200',
  gray:   'bg-gray-100 text-gray-600 border-gray-200',
  brown:  'bg-amber-50 text-amber-700 border-amber-200',
}

// ─── 知识库入口配置（只读总览）────────────────────────────────────────────────

const KB_ENTRIES = [
  { group: 'HIS嵌入端功能',
    items: [
      { label: '快捷搜索',   path: 'HIS侧边栏', desc: '患者上下文快速知识检索' },
      { label: '辅助诊断',   path: 'HIS侧边栏', desc: '基于症状/检验结果的诊断建议' },
      { label: '治疗方案',   path: 'HIS侧边栏', desc: '个性化治疗推荐' },
      { label: '检验推荐',   path: 'HIS侧边栏', desc: '智能检验项目推荐' },
      { label: '量表评估',   path: 'HIS侧边栏', desc: '床旁快捷量表评分' },
    ],
  },
]

// ─── 空表单 ───────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', color: 'blue', scope: [...SCOPE_OPTIONS] }

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export function CategoriesAdminPage() {
  const [tab, setTab]           = useState('departments')
  const [depts, setDepts]       = useState(DEFAULT_DEPARTMENTS)
  const [pcNav, setPcNav]       = useState(DEFAULT_PC_NAV)
  const [modal, setModal]       = useState(null)   // 'create' | 'edit'
  const [editRow, setEditRow]   = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [formErr, setFormErr]   = useState({})
  const [delTarget, setDelTarget] = useState(null)
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    configApi.bundle()
      .then((data) => {
        setDepts(Array.isArray(data?.departments) ? data.departments : DEFAULT_DEPARTMENTS)
        setPcNav(Array.isArray(data?.pc_nav) ? data.pc_nav : DEFAULT_PC_NAV)
      })
      .finally(() => setLoading(false))
  }, [])

  // 表单字段更新
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // 打开新建
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormErr({})
    setEditRow(null)
    setModal('create')
  }

  // 打开编辑
  const openEdit = (row) => {
    setForm({ name: row.name, color: row.color || 'blue', scope: row.scope || [] })
    setFormErr({})
    setEditRow(row)
    setModal('edit')
  }

  // 校验
  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = '请输入科室名称'
    if (depts.some(d => d.name === form.name.trim() && d.id !== editRow?.id))
      errs.name = '该科室名称已存在'
    return errs
  }

  // 保存（新建/编辑）
  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErr(errs); return }

    let next
    if (modal === 'create') {
      const newId = 'd' + Date.now()
      next = [...depts, { id: newId, name: form.name.trim(), color: form.color, scope: form.scope }]
    } else {
      next = depts.map(d => d.id === editRow.id
        ? { ...d, name: form.name.trim(), color: form.color, scope: form.scope }
        : d
      )
    }
    try {
      await configApi.saveBundle({ departments: next })
      setDepts(next)
      setModal(null)
      flashSaved()
    } catch {}
  }

  // 删除
  const handleDelete = async () => {
    const next = depts.filter(d => d.id !== delTarget.id)
    try {
      await configApi.saveBundle({ departments: next })
      setDepts(next)
      setDelTarget(null)
      flashSaved()
    } catch {}
  }

  // 短暂提示已保存
  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // scope 多选切换
  const toggleScope = (s) => {
    setField('scope', form.scope.includes(s)
      ? form.scope.filter(x => x !== s)
      : [...form.scope, s]
    )
  }

  const pcEntries = pcNav.map((item) => ({
    label: item.label,
    path: item.path,
    desc: item.label,
    enabled: item.enabled !== false,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        加载配置中...
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        icon={FolderTree} color="indigo"
        title="分类导航管理"
        description="管理科室分类标签，配置知识库入口导航"
      />

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {[
          { key: 'departments', icon: Tag,     label: '科室分类管理' },
          { key: 'overview',    icon: BookOpen, label: '知识库入口总览' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: 科室分类管理 ── */}
      {tab === 'departments' && (
        <div>
          {/* 操作栏 */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              共 <span className="font-semibold text-gray-800">{depts.length}</span> 个科室分类，
              供各知识库的科室下拉选项使用
            </p>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <Check size={12} /> 已保存
                </span>
              )}
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus size={14} /> 新增科室
              </button>
            </div>
          </div>

          {/* 科室卡片网格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {depts.map(dept => (
              <div
                key={dept.id}
                className="bg-white border border-border rounded-xl px-4 py-3 flex items-center justify-between group hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${COLOR_CLASS[dept.color] || COLOR_CLASS.gray}`}>
                    {dept.name}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(dept.scope || []).map(s => (
                      <span key={s} className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded px-1">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(dept)}
                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/8 rounded transition-colors"
                    title="编辑"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDelTarget(dept)}
                    className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/8 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 说明 */}
          <div className="flex items-start gap-2 mt-5 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <Info size={14} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              科室分类是各知识库（疾病、药品、指南、文献等）中"所属科室"下拉选项的数据来源。
              修改后在各知识库新增/编辑时即可生效。"适用范围"标签仅作说明用途。
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: 知识库入口总览 ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <Info size={14} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              以下为系统各端的知识库入口配置，当前结构由代码定义，此处为只读总览。
            </p>
          </div>

          {[{ group: 'PC端知识库', items: pcEntries }, ...KB_ENTRIES].map(group => (
            <div key={group.group} className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{group.group}</h3>
                <span className="text-xs text-gray-400">{group.items.length} 个入口</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">入口名称</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">路径</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">说明</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 w-20">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, idx) => (
                    <tr key={item.label}
                      className={`border-b border-border last:border-0 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                    >
                      <td className="px-5 py-3 font-medium text-gray-800">{item.label}</td>
                      <td className="px-5 py-3 text-gray-400 font-mono text-xs">{item.path}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{item.desc}</td>
                      <td className="px-5 py-3">
                        {item.enabled === false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-500 border border-gray-200">
                            未启用
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-50 text-success border border-green-100">
                            <Check size={10} /> 已启用
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ── 新建/编辑 Modal ── */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          open={true}
          title={modal === 'create' ? '新增科室分类' : '编辑科室分类'}
          onClose={() => setModal(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                保存
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* 科室名称 */}
            <FormField label="科室名称" required error={formErr.name}>
              <TextInput
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="如：神经外科、口腔科"
                className={formErr.name ? 'border-danger' : ''}
              />
            </FormField>

            {/* 颜色 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">标签颜色</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setField('color', opt.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                      COLOR_CLASS[opt.value] || COLOR_CLASS.gray
                    } ${form.color === opt.value ? 'ring-2 ring-offset-1 ring-primary' : 'opacity-60 hover:opacity-100'}`}
                  >
                    {form.color === opt.value && <Check size={10} />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 预览 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-gray-500">预览：</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${COLOR_CLASS[form.color] || COLOR_CLASS.gray}`}>
                {form.name || '科室名称'}
              </span>
            </div>

            {/* 适用范围 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-0.5">适用范围</label>
              <p className="text-xs text-gray-400 mb-2">该科室标签在哪些知识库中出现</p>
              <div className="flex flex-wrap gap-2">
                {SCOPE_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleScope(s)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs border transition-colors ${
                      form.scope.includes(s)
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {form.scope.includes(s) && <Check size={10} />}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 删除确认 ── */}
      {delTarget && (
        <ConfirmDialog
          title="删除科室分类"
          message={`确定删除「${delTarget.name}」科室分类？删除后该科室标签将从下拉选项中移除，已标记该科室的数据不受影响。`}
          confirmText="删除"
          confirmClass="bg-danger text-white hover:bg-danger/90"
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  )
}
