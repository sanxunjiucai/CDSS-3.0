export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  }
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div
        className={`${sizes[size] || sizes.md} rounded-full border-primary border-t-transparent animate-spin`}
      />
    </div>
  )
}
