import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Pill, FlaskConical,
  BookOpen, Users, Upload, FolderTree,
  Calculator, ClipboardList, Settings, Newspaper,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  {
    label: '知识库管理',
    items: [
      { to: '/diseases',      icon: Activity,      label: '疾病库管理' },
      { to: '/drugs',         icon: Pill,          label: '药品库管理' },
      { to: '/exams',         icon: FlaskConical,  label: '检验库管理' },
      { to: '/guidelines',    icon: BookOpen,      label: '指南库管理' },
      { to: '/literature',    icon: Newspaper,     label: '文献库管理' },
      { to: '/formulas',      icon: Calculator,    label: '公式库管理' },
      { to: '/assessments',   icon: ClipboardList, label: '量表管理' },
    ],
  },
  {
    label: '系统管理',
    items: [
      { to: '/categories',    icon: FolderTree,    label: '分类导航管理' },
      { to: '/search-config', icon: Settings,      label: '检索配置' },
      { to: '/import',        icon: Upload,        label: '批量导入' },
      { to: '/users',         icon: Users,         label: '账号管理' },
    ],
  },
]

export function SideMenu({ collapsed, onToggle }) {
  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-navy-deeper border-r border-white/5',
        'transition-all duration-200 ease-in-out flex-shrink-0',
        collapsed ? 'w-[56px]' : 'w-[210px]'
      )}
    >
      {/* Logo区 */}
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-4 border-b border-white/10',
        collapsed && 'justify-center px-0'
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">C</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-white text-sm font-bold leading-tight">CDSS 3.0</div>
            <div className="text-white/40 text-xs leading-tight">管理控制台</div>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {/* 仪表盘 */}
        <NavLink
          to="/"
          end
          className={({ isActive }) => cn(
            'flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/8',
            isActive ? 'bg-primary/20 text-primary border-r-2 border-primary' : 'text-white/60',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? '仪表盘' : undefined}
        >
          <LayoutDashboard size={16} className="flex-shrink-0" />
          {!collapsed && <span className="truncate">仪表盘</span>}
        </NavLink>

        {/* 分组导航 */}
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-4 pt-4 pb-1">
                <span className="text-[10px] text-white/30 font-medium uppercase tracking-widest">
                  {group.label}
                </span>
              </div>
            )}
            {collapsed && <div className="border-t border-white/10 my-2" />}
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/8',
                  isActive ? 'bg-primary/20 text-primary border-r-2 border-primary' : 'text-white/60',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? label : undefined}
              >
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* 折叠按钮 */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center justify-center py-3 border-t border-white/10',
          'text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors'
        )}
        title={collapsed ? '展开菜单' : '收起菜单'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  )
}
