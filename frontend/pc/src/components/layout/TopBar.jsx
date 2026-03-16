import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search, User, LogOut, ChevronDown,
  Home, Activity, Pill, FlaskConical,
  BookOpen, Calculator, ClipboardList, Stethoscope,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'

const NAV_ITEMS = [
  { icon: Home,          label: '工作台',   path: '/',            exact: true },
  { icon: Activity,      label: '疾病库',   path: '/diseases' },
  { icon: Pill,          label: '药品库',   path: '/drugs' },
  { icon: FlaskConical,  label: '检验检查', path: '/exams' },
  { icon: BookOpen,      label: '临床指南', path: '/guidelines' },
  { icon: Stethoscope,   label: '治疗方案', path: '/treatments' },
  { icon: Calculator,    label: '医学公式', path: '/formulas' },
  { icon: ClipboardList, label: '评估量表', path: '/assessments' },
]

export function TopBar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, logout } = useAuthStore()

  const [query, setQuery]       = useState('')
  const [userOpen, setUserOpen] = useState(false)

  const isActive = (item) => {
    if (item.exact) return location.pathname === '/'
    return location.pathname.startsWith(item.path)
  }

  const handleSearch = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex-shrink-0 h-[52px] bg-navy flex items-center px-4 z-50">
      {/* Logo */}
      <div
        className="flex items-center gap-2 cursor-pointer flex-shrink-0 mr-5"
        onClick={() => navigate('/')}
      >
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <span className="text-white text-xs font-bold">C</span>
        </div>
        <span className="text-white font-semibold text-sm tracking-wide whitespace-nowrap">CDSS 3.0</span>
      </div>

      {/* 导航页签 — 填满中间空间，允许横向滚动 */}
      <nav className="flex items-center flex-1 h-full overflow-x-auto scrollbar-none min-w-0">
        {NAV_ITEMS.map(item => {
          const Icon   = item.icon
          const active = isActive(item)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-full text-[13px] whitespace-nowrap',
                'border-b-2 transition-colors flex-shrink-0',
                active
                  ? 'text-white border-primary font-medium'
                  : 'text-white/60 border-transparent hover:text-white/90 hover:border-white/30'
              )}
            >
              <Icon size={13} className="flex-shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* 右侧：紧凑搜索 + 用户 */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {/* 紧凑搜索框 */}
        <div className="flex items-center bg-white/10 border border-white/20 rounded-md
                        hover:bg-white/15 focus-within:bg-white/15 focus-within:border-primary/60
                        transition-colors h-[30px] w-[190px]">
          <Search size={13} className="text-white/50 ml-2.5 flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索知识内容..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="flex-1 bg-transparent text-white placeholder-white/35 text-xs
                       px-2 outline-none"
          />
        </div>

        {/* 用户下拉 */}
        <div className="relative">
          <button
            onClick={() => setUserOpen(o => !o)}
            className="flex items-center gap-1.5 text-white/80 cursor-pointer
                       hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
          >
            <div className="w-6 h-6 rounded-full bg-primary/70 flex items-center justify-center">
              <User size={12} />
            </div>
            <span className="text-xs">{user?.display_name || user?.username || '用户'}</span>
            <ChevronDown size={11} className="opacity-60" />
          </button>

          {userOpen && (
            <div
              className="absolute top-full right-0 mt-1 bg-white border border-border
                         rounded-lg shadow-lg z-50 min-w-[140px] py-1"
              onClick={() => setUserOpen(false)}
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs text-gray-500">当前账号</p>
                <p className="text-sm font-medium text-gray-800">{user?.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500
                           hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
