import { X } from 'lucide-react'

/**
 * 通用弹窗容器
 * Props: open, title, onClose, children, footer, width, bodyMinHeight
 */
export function Modal({ open, title, onClose, children, footer, width = 560, bodyMinHeight }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 弹窗 */}
      <div
        className="relative bg-white rounded-xl shadow-modal flex flex-col max-h-[90vh]"
        style={{ width: Math.min(width, window.innerWidth - 32) }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 内容区 */}
        <div
          className="flex-1 overflow-y-auto [scrollbar-gutter:stable] px-5 py-5"
          style={bodyMinHeight ? { minHeight: bodyMinHeight } : undefined}
        >
          {children}
        </div>

        {/* 底部操作 */}
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
