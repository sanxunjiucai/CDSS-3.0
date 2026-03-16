import { useState, useCallback } from 'react'
import { Users, Plus, Search, Pencil, Trash2, KeyRound } from 'lucide-react'
import { userApi } from '@/api'
import { useListPage }   from '@/hooks/useListPage'
import { PageHeader }    from '@/components/common/PageHeader'
import { DataTable }     from '@/components/common/DataTable'
import { Pagination }    from '@/components/common/Pagination'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal }         from '@/components/common/Modal'
import { StatusBadge }   from '@/components/common/StatusBadge'
import { FormField, TextInput, SelectInput } from '@/components/common/FormField'

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'user',  label: '普通用户' },
]

const EMPTY_FORM = { username: '', password: '', display_name: '', role: 'user' }

export function UsersAdminPage() {
  const fetchFn = useCallback((p) => userApi.list(p), [])
  const { items, total, totalPages, page, inputQ, loading,
          setInputQ, handleSearch, handlePageChange, reload } = useListPage(fetchFn)

  const [modal, setModal]     = useState(null)   // null | 'create' | 'edit' | 'reset'
  const [editRow, setEditRow] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [resetPwd, setResetPwd] = useState({ newPwd: '', confirm: '' })
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState({})
  const [delTarget, setDelTarget] = useState(null)
  const [deleting, setDeleting]   = useState(false)

  const openCreate = () => { setForm(EMPTY_FORM); setFormErr({}); setEditRow(null); setModal('create') }
  const openEdit   = (row) => {
    setForm({ username: row.username || '', password: '',
              display_name: row.display_name || '', role: row.role || 'user' })
    setFormErr({}); setEditRow(row); setModal('edit')
  }
  const openReset  = (row) => { setResetPwd({ newPwd: '', confirm: '' }); setEditRow(row); setModal('reset') }

  const validate = () => {
    const err = {}
    if (!form.username.trim()) err.username = '用户名不能为空'
    if (modal === 'create' && !form.password.trim()) err.password = '密码不能为空'
    return err
  }

  const handleSave = async () => {
    const err = validate()
    if (Object.keys(err).length) { setFormErr(err); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (modal === 'edit' && !payload.password) delete payload.password
      if (modal === 'create') { await userApi.create(payload) }
      else { await userApi.update(editRow.id, payload) }
      setModal(null); reload()
    } catch (e) { alert(e?.response?.data?.detail || '操作失败') }
    finally { setSaving(false) }
  }

  const handleReset = async () => {
    if (!resetPwd.newPwd.trim()) { alert('请输入新密码'); return }
    if (resetPwd.newPwd !== resetPwd.confirm) { alert('两次密码不一致'); return }
    setSaving(true)
    try {
      await userApi.resetPassword(editRow.id, resetPwd.newPwd)
      setModal(null)
      alert('密码重置成功')
    } catch (e) { alert(e?.response?.data?.detail || '重置失败') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await userApi.remove(delTarget.id); setDelTarget(null); reload() }
    catch (e) { alert(e?.response?.data?.detail || '删除失败') }
    finally { setDeleting(false) }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const columns = [
    { key: 'username',  title: '用户名',   width: '160px',
      render: (v, row) => (
        <div>
          <div className="font-medium text-gray-900">{v}</div>
          {row.display_name && <div className="text-xs text-gray-400">{row.display_name}</div>}
        </div>
      )
    },
    { key: 'role',  title: '角色',    width: '100px',
      render: (v) => <StatusBadge status={v} />
    },
    { key: 'is_active', title: '状态', width: '80px',
      render: (v) => <StatusBadge status={v !== false ? 'active' : 'inactive'} />
    },
    { key: 'created_at', title: '创建时间', width: '130px',
      render: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : '—'
    },
    { key: '_actions', title: '操作', width: '130px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)}
            className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
            title="编辑">
            <Pencil size={14} />
          </button>
          <button onClick={() => openReset(row)}
            className="p-1.5 rounded text-gray-400 hover:text-warning hover:bg-yellow-50 transition-colors"
            title="重置密码">
            <KeyRound size={14} />
          </button>
          <button onClick={() => setDelTarget(row)}
            className="p-1.5 rounded text-gray-400 hover:text-danger hover:bg-red-50 transition-colors"
            title="删除">
            <Trash2 size={14} />
          </button>
        </div>
      )
    },
  ]

  return (
    <div>
      <PageHeader
        icon={Users} color="indigo"
        title="账号管理"
        description={`共 ${total} 个用户账号`}
        action={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm
                       rounded-lg hover:bg-primary-600 transition-colors">
            <Plus size={15} />新增用户
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 max-w-sm flex items-center gap-2 bg-white border border-border rounded-lg
                        px-3 py-2 focus-within:border-primary transition-colors">
          <Search size={14} className="text-gray-400" />
          <input type="text" value={inputQ} onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索用户名..." className="flex-1 text-sm outline-none placeholder-gray-400" />
        </div>
        <button onClick={handleSearch}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 transition-colors">
          搜索
        </button>
      </div>

      <DataTable columns={columns} rows={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      <ConfirmDialog open={!!delTarget} title="确认删除用户"
        description={`即将删除用户「${delTarget?.username}」，此操作不可恢复。`}
        onConfirm={handleDelete} onCancel={() => setDelTarget(null)} loading={deleting} />

      {/* 新增/编辑 */}
      <Modal open={modal === 'create' || modal === 'edit'}
        title={modal === 'create' ? '新增用户' : '编辑用户'}
        onClose={() => setModal(null)} width={480}
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
        <FormField label="用户名" required error={formErr.username}>
          <TextInput value={form.username} onChange={set('username')} placeholder="登录用户名"
            disabled={modal === 'edit'} />
        </FormField>
        {modal === 'create' && (
          <FormField label="初始密码" required error={formErr.password}>
            <TextInput type="password" value={form.password} onChange={set('password')} placeholder="初始登录密码" />
          </FormField>
        )}
        <FormField label="显示姓名">
          <TextInput value={form.display_name} onChange={set('display_name')} placeholder="真实姓名（可选）" />
        </FormField>
        <FormField label="角色">
          <SelectInput value={form.role} onChange={set('role')} options={ROLE_OPTIONS} />
        </FormField>
      </Modal>

      {/* 重置密码 */}
      <Modal open={modal === 'reset'}
        title={`重置密码 — ${editRow?.username}`}
        onClose={() => setModal(null)} width={400}
        footer={
          <>
            <button onClick={() => setModal(null)}
              className="px-4 py-2 text-sm text-gray-600 border border-border rounded-lg hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button onClick={handleReset} disabled={saving}
              className="px-4 py-2 text-sm text-white bg-warning rounded-lg hover:bg-orange-500 disabled:opacity-60 flex items-center gap-1.5 transition-colors">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              确认重置
            </button>
          </>
        }
      >
        <FormField label="新密码">
          <TextInput type="password" value={resetPwd.newPwd}
            onChange={e => setResetPwd(p => ({ ...p, newPwd: e.target.value }))}
            placeholder="请输入新密码（至少6位）" />
        </FormField>
        <FormField label="确认密码">
          <TextInput type="password" value={resetPwd.confirm}
            onChange={e => setResetPwd(p => ({ ...p, confirm: e.target.value }))}
            placeholder="再次输入新密码" />
        </FormField>
      </Modal>
    </div>
  )
}
