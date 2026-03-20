import { useState } from 'react'
import { Outlet }   from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Overlay — mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 40
          }}
        />
      )}

      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          background: 'var(--bg)'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}