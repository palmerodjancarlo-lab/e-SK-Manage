// SKLayout.jsx
// Layout ng SK Officer Portal — clean white sidebar
// Professional at minimal ang design nito

import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Icon } from '../../components/Icon'
import skLogo from '../../assets/sk-logo.svg'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/sk/dashboard',     icon: 'home',         label: 'Dashboard' },
  { to: '/sk/announcements', icon: 'megaphone',    label: 'Announcements' },
  { to: '/sk/members',       icon: 'users',        label: 'Members' },
  { to: '/sk/meetings',      icon: 'calendar',     label: 'Meetings & Events' },
  { to: '/sk/programs',      icon: 'trophy',       label: 'Programs' },
  { to: '/sk/transparency',  icon: 'banknotes',    label: 'Transparency' },
  { to: '/sk/officials',     icon: 'identification',label: 'SK Officials' },
  { to: '/sk/settings',      icon: 'cog',          label: 'Settings'},
]

export default function SKLayout() {
  const { user, logout }          = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const navigate                  = useNavigate()
  const location                  = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Naka-logout na.')
    navigate('/login')
  }

  // Kunin ang page title base sa current path
  const pageTitles = {
    '/sk/dashboard':     'Dashboard',
    '/sk/announcements': 'Announcements',
    '/sk/members':       'Member Directory',
    '/sk/meetings':      'Meetings & Events',
    '/sk/programs':      'SK Programs',
    '/sk/transparency':  'Budget Transparency',
    '/sk/officials':     'SK Officials',
  }
  const currentTitle = pageTitles[location.pathname] || 'SK Portal'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 100,
          backdropFilter: 'blur(2px)',
        }} />
      )}

      {/* Sidebar */}
      <aside className="sk-sidebar" style={{
        width: 232,
        flexShrink: 0,
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 110,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
        boxShadow: sidebarOpen ? 'var(--shadow-xl)' : 'none',
      }}>

        {/* Logo */}
        <div style={{
          padding: '14px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, flexShrink: 0,
            background: 'var(--blue-800)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(26,58,143,0.3)',
          }}>
            <img src={skLogo} alt="SK" style={{ width: 24, objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-800)' }}>e-SK Manage</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 500 }}>SK Officer Portal</div>
          </div>
          <button className="sk-close-btn" onClick={() => setSidebarOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'none', padding: 4 }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Officer tag */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 9px', borderRadius: 6,
            background: 'var(--blue-50)',
            border: '1px solid var(--blue-100)',
          }}>
            <Icon name="shield" size={12} color="var(--blue-800)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue-800)', letterSpacing: '0.5px' }}>
              SK OFFICER
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '1px', padding: '8px 8px 4px', textTransform: 'uppercase' }}>
            Navigation
          </div>
          {NAV.map(item => {
            const active = location.pathname === item.to
            return (
              <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 8, marginBottom: 1,
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  textDecoration: 'none',
                  background: active ? 'var(--blue-800)' : 'transparent',
                  color: active ? 'white' : 'var(--text-muted)',
                  transition: 'all 140ms ease',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-base)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
              >
                <Icon name={item.icon} size={15} color={active ? 'rgba(255,255,255,0.9)' : 'var(--text-faint)'} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 10px', borderRadius: 8,
            background: 'var(--bg-subtle)',
            marginBottom: 4,
          }}>
            <div className="avatar avatar-sm" style={{ background: 'var(--blue-800)' }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                {user?.position || 'SK Officer'}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '7px 10px', borderRadius: 8,
            border: 'none', background: 'transparent',
            color: 'var(--text-faint)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'all 140ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-50)'; e.currentTarget.style.color = 'var(--red-600)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}
          >
            <Icon name="logout" size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{
          height: 54,
          padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          boxShadow: 'var(--shadow-xs)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* Hamburger — mobile only */}
            <button className="sk-hamburger" onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none', alignItems: 'center', color: 'var(--text-muted)', padding: 4 }}>
              <Icon name="menu" size={20} />
            </button>

            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-base)' }}>{currentTitle}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleTheme} style={{
              width: 34, height: 34,
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all var(--transition)',
            }}>
              <Icon name={darkMode ? 'sun' : 'moon'} size={15} />
            </button>
            <div className="avatar avatar-sm" style={{ background: 'var(--blue-800)', cursor: 'pointer' }}
              title={`${user?.firstName} ${user?.lastName}`}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '22px', background: 'var(--bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
