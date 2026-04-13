import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import skLogo from '../../assets/sk-logo.svg'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',       icon: '🏠', roles: ['admin','sk_officer','sk_member','kabataan_user'] },
  { to: '/announcements', label: 'Announcements',   icon: '📢', roles: ['admin','sk_officer','sk_member','kabataan_user'] },
  { to: '/members',       label: 'Members',          icon: '👥', roles: ['admin','sk_officer','sk_member','kabataan_user'] },
  { to: '/meetings',      label: 'Meetings',         icon: '📅', roles: ['admin','sk_officer','sk_member','kabataan_user'] },
  { to: '/programs',      label: 'Programs',         icon: '🏆', roles: ['admin','sk_officer','sk_member','kabataan_user'] },
  { to: '/transparency',  label: 'Transparency',     icon: '📊', roles: ['admin','sk_officer','sk_member','kabataan_user'] },
  { to: '/officials',     label: 'SK Officials',     icon: '🏛', roles: ['admin','sk_officer','sk_member','kabataan_user'] },
  { to: '/points',        label: 'My Points',        icon: '⭐', roles: ['kabataan_user','sk_member'] },
  { to: '/rewards',       label: 'Rewards',          icon: '🎁', roles: ['kabataan_user','sk_member'] },
  { to: '/admin',         label: 'Admin Panel',      icon: '⚙️', roles: ['admin'] },
]

export default function Sidebar({ open, setOpen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems = NAV_ITEMS.filter(n => n.roles.includes(user?.role))

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <aside style={{
      width: 260,
      flexShrink: 0,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 50,
      transform: open ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s ease',
      boxShadow: open ? 'var(--shadow-lg)' : 'none'
    }}
    className="sidebar-desktop"
    >

      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <img
          src={skLogo}
          alt="SK Logo"
          style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }}
        />
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--sk-blue)' }}>
            e-SK Manage
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Province of Marinduque
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 18,
            display: 'none'
          }}
          className="sidebar-close-btn"
        >✕</button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 3,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              background: isActive ? 'var(--sk-blue)' : 'transparent',
              color: isActive ? 'white' : 'var(--text-secondary)',
              transition: 'var(--transition)'
            })}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{
        padding: '12px 10px',
        borderTop: '1px solid var(--border)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card2)',
          marginBottom: 6
        }}>
          <div className="avatar avatar-sm" style={{ background: 'var(--sk-blue)' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'transparent',
            color: 'var(--sk-red)',
            fontWeight: 700,
            fontSize: 14,
            transition: 'var(--transition)'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--sk-red-pale)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 18 }}>🚪</span>
          Logout
        </button>
      </div>
    </aside>
  )
}