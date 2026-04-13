// AdminLayout.jsx
// Layout ng Admin Portal — dark sidebar, always visible sa desktop
// Mobile: hamburger menu lang ang makikita

import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Icon } from '../../components/Icon'
import skLogo from '../../assets/sk-logo.svg'
import toast from 'react-hot-toast'

// Mga navigation items ng Admin
const NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: 'home',         label: 'Dashboard' },
      { to: '/admin/analytics', icon: 'chartBar',     label: 'Analytics' },
    ]
  },
  {
    section: 'Management',
    items: [
      { to: '/admin/users',          icon: 'users',          label: 'User Accounts' },
      { to: '/admin/sk-officers',    icon: 'identification', label: 'SK Officials' },
      { to: '/admin/create-account',   icon: 'plus',           label: 'Create Account' },
      { to: '/admin/sk-applications',  icon: 'identification', label: 'SK Applications' },
    ]
  },
  {
    section: 'Content',
    items: [
      { to: '/admin/announcements', icon: 'megaphone',   label: 'Announcements' },
      { to: '/admin/meetings',      icon: 'calendar',    label: 'Meetings & Events' },
      { to: '/admin/programs',      icon: 'trophy',      label: 'Programs' },
      { to: '/admin/transparency',  icon: 'banknotes',   label: 'Transparency' },
    ]
  },
  {
    section: 'System',
    items: [
      { to: '/admin/audit-logs', icon: 'clipboardList', label: 'Audit Logs' },
      { to: '/admin/settings',   icon: 'cog',           label: 'Settings' },
    ]
  },
]

// Reusable sidebar content — ginagamit sa desktop at mobile
function SidebarContent({ onClose }) {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const location         = useLocation()

  const handleLogout = () => {
    logout()
    toast.success('Naka-logout na.')
    navigate('/login')
  }

  return (
    <div style={{
      width: 240,
      height: '100%',
      background: 'linear-gradient(180deg, #080D1C 0%, #0D1528 100%)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>

      {/* Logo area */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <img src={skLogo} alt="SK" style={{ width: 24, objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>e-SK Manage</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: 1 }}>Admin Console</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      {/* Admin badge */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 10px', borderRadius: 7,
          background: 'rgba(192,17,31,0.18)',
          border: '1px solid rgba(192,17,31,0.3)',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF5555', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#FF8888', letterSpacing: '0.8px' }}>
            ADMINISTRATOR
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {NAV.map(section => (
          <div key={section.section} style={{ marginBottom: 2 }}>
            <div style={{
              fontSize: 9, fontWeight: 700,
              color: 'rgba(255,255,255,0.2)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              padding: '10px 10px 4px',
            }}>
              {section.section}
            </div>
            {section.items.map(item => {
              const active = location.pathname === item.to
              return (
                <NavLink key={item.to} to={item.to} onClick={onClose}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 10px',
                    borderRadius: 8, marginBottom: 1,
                    fontSize: 13, fontWeight: active ? 600 : 500,
                    textDecoration: 'none',
                    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: active ? 'white' : 'rgba(255,255,255,0.45)',
                    borderLeft: active ? '2px solid #F5C400' : '2px solid transparent',
                    transition: 'all 140ms ease',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' } }}
                >
                  <Icon name={item.icon} size={15} color={active ? '#F5C400' : 'rgba(255,255,255,0.3)'} />
                  <span>{item.label}</span>
                  {active && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#F5C400' }} />}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '9px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          marginBottom: 4,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: 'linear-gradient(135deg, #C0111F, #E63946)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 11,
          }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 10px', borderRadius: 8,
          border: 'none', background: 'transparent',
          color: 'rgba(255,100,100,0.6)', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', transition: 'all 140ms ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,17,31,0.15)'; e.currentTarget.style.color = '#FF8888' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,100,100,0.6)' }}
        >
          <Icon name="logout" size={15} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { darkMode, toggleTheme } = useTheme()
  const { user }                  = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Desktop sidebar — laging visible sa malaking screen */}
      <div className="admin-desktop-sidebar" style={{ height: '100vh', flexShrink: 0 }}>
        <SidebarContent />
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 150, backdropFilter: 'blur(3px)' }}
          />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 160, height: '100vh' }}>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top header bar */}
        <header style={{
          height: 54,
          padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: darkMode ? 'rgba(13,21,40,0.95)' : 'rgba(255,255,255,0.96)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          boxShadow: 'var(--shadow-xs)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* Hamburger para sa mobile */}
            <button className="admin-hamburger" onClick={() => setMobileOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none', alignItems: 'center', padding: 4, color: 'var(--text-muted)' }}>
              <Icon name="menu" size={20} />
            </button>

            {/* Admin mode indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 6,
              background: darkMode ? 'rgba(192,17,31,0.12)' : 'rgba(192,17,31,0.07)',
              border: '1px solid rgba(192,17,31,0.15)',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red-600)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red-600)', letterSpacing: '0.5px' }}>
                ADMIN
              </span>
            </div>
          </div>

          {/* Right side controls */}
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
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
            >
              <Icon name={darkMode ? 'sun' : 'moon'} size={15} />
            </button>

            {/* User avatar */}
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--red-600), #E63946)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', flexShrink: 0,
            }}
            title={`${user?.firstName} ${user?.lastName}`}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1, overflowY: 'auto',
          padding: '24px',
          background: 'var(--bg)',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}