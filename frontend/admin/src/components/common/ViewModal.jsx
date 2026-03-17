import { Eye } from 'lucide-react'
import { Modal } from './Modal'

export function ViewModal({ open, onClose, title, data, fields }) {
  if (!data) return null

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto">
        {fields.map(({ label, key, render }) => (
          <div key={key}>
            <span className="text-gray-500 font-medium">{label}:</span>
            <div className="mt-1 text-gray-700">
              {render ? render(data[key], data) : (data[key] || '—')}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
          关闭
        </button>
      </div>
    </Modal>
  )
}

export function ViewButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
      title="查看">
      <Eye size={14} />
    </button>
  )
}
