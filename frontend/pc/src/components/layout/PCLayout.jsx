import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'

export function PCLayout() {
  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      <TopBar />

      {/* 内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
