import { AlertTriangle } from 'lucide-react'

/**
 * 删除确认弹窗
 * Props: open, title, description, onConfirm, onCancel, loading
 */
export function ConfirmDialog({ open, title, description, onConfirm, onCancel, loading }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* 弹窗 */}
      <div className="relative bg-white rounded-xl shadow-modal w-[400px] p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-danger" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 border border-border rounded-lg
                       hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-danger rounded-lg
                       hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            确认删除
          </button>
        </div>
      </div>
    </div>
  )
}
