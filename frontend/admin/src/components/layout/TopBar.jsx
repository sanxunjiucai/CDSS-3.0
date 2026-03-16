import { useNavigate } from 'react-router-dom'
import { LogOut, User, Menu } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

export function TopBar({ onMenuClick }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-12 flex items-center justify-between px-4
                       bg-white border-b border-border flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <Menu size={16} />
      </button>

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-gray-600">
          <User size={14} className="text-gray-400" />
          <span>{user?.username || 'admin'}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm
                     text-gray-500 hover:text-danger hover:bg-red-50 transition-colors"
        >
          <LogOut size={14} />
          <span>退出</span>
        </button>
      </div>
    </header>
  )
}
