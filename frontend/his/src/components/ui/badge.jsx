import { cn } from '@/lib/utils'

const variants = {
  default:  'bg-primary text-white',
  required: 'bg-red-50 text-danger border border-red-200',
  optional: 'bg-orange-50 text-warning border border-orange-200',
  blue:     'bg-primary-50 text-primary border border-primary-200',
  success:  'bg-green-50 text-success border border-green-200',
  gray:     'bg-gray-100 text-gray-600 border border-gray-200',
}

export function Badge({ children, variant = 'default', className }) {
  return (
    <span className={cn(
      'inline-flex items-center text-2xs font-medium px-1.5 py-0.5 rounded-sm',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
