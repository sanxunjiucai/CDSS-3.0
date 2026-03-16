import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Activity, Pill, FlaskConical,
  BookOpen, Calculator, ClipboardList, Newspaper, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: Home,          label: '工作台',     path: '/',           exact: true },
  { icon: Activity,      label: '疾病知识库', path: '/diseases' },
  { icon: Pill,          label: '药品库',     path: '/drugs' },
  { icon: FlaskConical,  label: '检验检查库', path: '/exams' },
  { icon: BookOpen,      label: '临床指南库', path: '/guidelines' },
  { icon: Newspaper,     label: '动态文献库', path: '/literature' },
  { icon: FileText,      label: '案例文献库', path: '/cases' },
  { icon: Calculator,    label: '医学公式库', path: '/formulas' },
  { icon: ClipboardList, label: '评估量表',   path: '/assessments' },
]

export function SideNav({ collapsed, onToggle }) {
  const navigate  = useNavigate()
  const location  = useLocation()

  const isActive = (item) => {
    if (item.exact) return location.pathname === '/'
    return location.pathname.startsWith(item.path)
  }

  return (
    <aside
      className={cn(
        'flex flex-col bg-white border-r border-border flex-shrink-0 transition-all duration-200',
        collapsed ? 'w-[56px]' : 'w-[200px]'
      )}
    >
      {/* 导航列表 */}
      <nav className="flex-1 overflow-y-auto py-3">
        {/* 分组标签 */}
        {!collapsed && (
          <div className="px-4 mb-2 pb-2 border-b border-border">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              知识门户
            </span>
          </div>
        )}

        {NAV_ITEMS.map(item => {
          const Icon   = item.icon
          const active = isActive(item)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 text-sm transition-all duration-150',
                'hover:bg-primary-50 hover:text-primary',
                collapsed ? 'justify-center px-2 py-3' : 'px-4 py-2.5',
                active
                  ? 'bg-primary-50 text-primary font-medium border-r-[3px] border-primary'
                  : 'text-gray-600 border-r-[3px] border-transparent'
              )}
            >
              <Icon
                size={16}
                className={cn('flex-shrink-0', active ? 'text-primary' : 'text-gray-400')}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* 底部版本 */}
      {!collapsed && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-border">
          <p className="text-[10px] text-gray-300 font-medium">CDSS v3.0</p>
        </div>
      )}
    </aside>
  )
}
