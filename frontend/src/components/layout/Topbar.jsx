import { useLocation } from 'react-router-dom'
import { useTheme }    from '../../context/ThemeContext'
import { useAuth }     from '../../context/AuthContext'

const TITLES = {
  '/dashboard':     { title: 'Dashboard',         sub: 'Welcome to e-SK Manage' },
  '/announcements': { title: 'Announcements',     sub: 'Latest SK news and updates' },
  '/members':       { title: 'Member Directory',  sub: 'SK council members' },
  '/meetings':      { title: 'Meetings & Events', sub: 'Schedule and attendance' },
  '/programs':      { title: 'SK Programs',       sub: 'Accomplishment tracker' },
  '/transparency':  { title: 'Transparency',      sub: 'Budget and fund reports' },
  '/officials':     { title: 'SK Officials',      sub: 'Federation directory' },
  '/points':        { title: 'My Points',         sub: 'Your SK rewards points' },
  '/rewards':       { title: 'Rewards Store',     sub: 'Redeem your points' },
  '/admin':         { title: 'Admin Panel',       sub: 'User management & control' },
}

export default function Topbar({ onMenu }) {
  const { darkMode, toggleTheme } = useTheme()
  const { user } = useAuth()
  const location = useLocation()
  const page = TITLES[location.pathname] || { title: 'e-SK Manage', sub: '' }

  return (
    <header style={{
      height: 64,
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
      gap: 12
    }}>

      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenu}
          style={{
            display: 'none',
            width: 36, height: 36,
            border: 'none',
            background: 'var(--bg-card2)',
            borderRadius: 'var(--radius-sm)',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 4,
            cursor: 'pointer'
          }}
          className="hamburger-btn"
        >
          <div style={{ width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 2 }} />
          <div style={{ width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 2 }} />
          <div style={{ width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 2 }} />
        </button>

        <div>
          <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {page.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {page.sub}
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: 36, height: 36,
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card2)',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition)'
          }}
          title="Toggle theme"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Notification */}
        <button style={{
          width: 36, height: 36,
          position: 'relative',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-card2)',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          🔔
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 16, height: 16,
            background: 'var(--sk-red)',
            borderRadius: '50%',
            fontSize: 9,
            color: 'white',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-card)'
          }}>3</span>
        </button>

        {/* Avatar */}
        <div
          className="avatar avatar-md"
          style={{ background: 'var(--sk-blue)', cursor: 'pointer' }}
          title={`${user?.firstName} ${user?.lastName}`}
        >
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  )
}