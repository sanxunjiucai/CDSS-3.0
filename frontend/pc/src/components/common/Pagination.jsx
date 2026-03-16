import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const pages = buildPages(page, totalPages)

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <PageBtn disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={14} />
      </PageBtn>

      {pages.map((p, i) =>
        p === '...'
          ? <span key={`dots-${i}`} className="px-2 text-gray-400 text-sm">…</span>
          : (
            <PageBtn
              key={p}
              active={p === page}
              onClick={() => onChange(p)}
            >
              {p}
            </PageBtn>
          )
      )}

      <PageBtn disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight size={14} />
      </PageBtn>
    </div>
  )
}

function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded text-sm transition-colors',
        active
          ? 'bg-primary text-white'
          : 'text-gray-600 hover:bg-primary-50 hover:text-primary',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total)
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }
  return pages
}
