import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null

  const pages = []
  const delta = 2
  const left = Math.max(1, page - delta)
  const right = Math.min(totalPages, page + delta)

  if (left > 1) { pages.push(1); if (left > 2) pages.push('...') }
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < totalPages) {
    if (right < totalPages - 1) pages.push('...')
    pages.push(totalPages)
  }

  const btnBase = 'w-8 h-8 flex items-center justify-center rounded text-sm transition-colors'

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={cn(btnBase, 'text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed')}
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-8 text-center text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              btnBase,
              p === page
                ? 'bg-primary text-white font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={cn(btnBase, 'text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed')}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
