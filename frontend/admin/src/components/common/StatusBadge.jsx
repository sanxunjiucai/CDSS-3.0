import { cn } from '@/lib/utils'

const PRESETS = {
  active:    { label: '已发布', cls: 'bg-green-50 text-success border-green-100' },
  inactive:  { label: '未发布', cls: 'bg-gray-50 text-gray-400 border-gray-200' },
  published: { label: '已发布', cls: 'bg-green-50 text-success border-green-100' },
  draft:     { label: '草稿',   cls: 'bg-yellow-50 text-warning border-yellow-100' },
  admin:     { label: '管理员', cls: 'bg-primary-50 text-primary border-primary-100' },
  user:      { label: '普通用户', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export function StatusBadge({ status, label }) {
  const preset = PRESETS[status] || { label: status, cls: 'bg-gray-50 text-gray-500 border-gray-200' }
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs border',
      preset.cls
    )}>
      {label || preset.label}
    </span>
  )
}
