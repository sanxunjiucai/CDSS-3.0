import { cn } from '@/lib/utils'

export function TagBadge({ children, color = 'default', className }) {
  const colors = {
    default: 'bg-gray-100 text-gray-600 border-gray-200',
    primary: 'bg-primary-50 text-primary border-primary/20',
    danger:  'bg-red-50 text-red-600 border-red-200',
    warning: 'bg-orange-50 text-orange-600 border-orange-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    purple:  'bg-purple-50 text-purple-700 border-purple-200',
  }

  return (
    <span
      className={cn(
        'inline-block text-xs px-2 py-0.5 rounded border',
        colors[color] || colors.default,
        className
      )}
    >
      {children}
    </span>
  )
}
