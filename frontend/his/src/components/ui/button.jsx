import { cn } from '@/lib/utils'

const variants = {
  primary:  'bg-primary text-white hover:bg-primary-600 active:bg-primary-700',
  ghost:    'bg-transparent text-gray-600 hover:bg-gray-100',
  outline:  'border border-border text-gray-700 hover:bg-gray-50',
  danger:   'bg-red-500 text-white hover:bg-red-600',
  tab:      'rounded-full px-3 py-1 text-xs font-medium transition-all',
  'tab-active': 'rounded-full px-3 py-1 text-xs font-medium bg-primary text-white',
}

const sizes = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1.5',
  lg: 'text-base px-4 py-2',
  icon: 'w-7 h-7 p-0 flex items-center justify-center',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  disabled,
  type = 'button',
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded font-medium',
        'transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  )
}
