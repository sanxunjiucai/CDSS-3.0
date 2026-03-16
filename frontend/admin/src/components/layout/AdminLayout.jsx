import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SideMenu } from './SideMenu'
import { TopBar } from './TopBar'

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <SideMenu collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setCollapsed(c => !c)} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
