import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()

  const [form, setForm]       = useState({ username: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('请输入用户名和密码')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(form.username, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.detail || '用户名或密码错误'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-[#1a3a6b] to-[#0f2340]
                    flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo & 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-primary mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-wide">CDSS 3.0</h1>
          <p className="text-white/50 text-sm mt-1">临床辅助决策系统·医学知识库</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-gray-800 text-lg font-semibold mb-6">账号登录</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">用户名</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="请输入用户名"
                autoComplete="username"
                className="w-full h-10 px-3 border border-border rounded-lg text-sm
                           outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                           transition-colors"
              />
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  className="w-full h-10 px-3 pr-10 border border-border rounded-lg text-sm
                             outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                             hover:text-gray-600 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary/90 disabled:opacity-60
                         text-white rounded-lg text-sm font-medium flex items-center
                         justify-center gap-2 transition-colors mt-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30
                                 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            默认账号：admin / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
