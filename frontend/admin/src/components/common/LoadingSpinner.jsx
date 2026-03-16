export function LoadingSpinner({ text = '加载中...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-primary rounded-full animate-spin mb-3" />
      <span className="text-sm">{text}</span>
    </div>
  )
}
