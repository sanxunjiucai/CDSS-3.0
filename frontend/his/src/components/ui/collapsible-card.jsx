import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 功能卡片容器（可折叠）
 * icon:    左侧彩色圆形图标
 * title:   标题
 * badge:   标题右侧数量提示
 * defaultOpen: 默认展开
 */
export function CollapsibleCard({
  icon,
  iconBg = 'bg-primary',
  title,
  badge,
  defaultOpen = true,
  children,
  className,
  extra,           // 标题行右侧额外元素
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('panel-card', className)}>
      {/* 标题行 */}
      <div className="panel-header" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          {/* 彩色圆形图标 */}
          <span className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
            iconBg
          )}>
            {icon}
          </span>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {badge != null && (
            <span className="text-2xs bg-primary-50 text-primary px-1 rounded-sm font-medium">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {extra}
          {open
            ? <ChevronUp size={14} className="text-gray-400" />
            : <ChevronDown size={14} className="text-gray-400" />
          }
        </div>
      </div>

      {/* 内容区 */}
      {open && <div className="panel-body">{children}</div>}
    </div>
  )
}
