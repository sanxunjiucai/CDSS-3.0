import { cn } from '@/lib/utils'

export function Input({ className, icon, ...props }) {
  if (icon) {
    return (
      <div className="relative flex items-center">
        <span className="absolute left-2.5 text-gray-400 pointer-events-none">
          {icon}
        </span>
        <input
          {...props}
          className={cn(
            'w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-border rounded',
            'outline-none focus:border-primary focus:ring-1 focus:ring-primary/20',
            'placeholder:text-gray-400',
            className
          )}
        />
      </div>
    )
  }

  return (
    <input
      {...props}
      className={cn(
        'w-full px-3 py-1.5 text-sm bg-white border border-border rounded',
        'outline-none focus:border-primary focus:ring-1 focus:ring-primary/20',
        'placeholder:text-gray-400',
        className
      )}
    />
  )
}
