// Admin Dashboard — overview ng buong sistema
// Makikita dito ang stats, logs, at quick actions

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Kulay ng bawat action sa audit logs
const ACTION_STYLE = {
  LOGIN:               '#22C55E',
  REGISTER:            '#3B82F6',
  CREATE_MEETING:      '#D97706',
  CREATE_ANNOUNCEMENT: '#7C3AED',
  CREATE_USER:         '#1A3A8F',
  UPDATE_ROLE:         '#F97316',
  DEACTIVATE_USER:     '#EF4444',
  ACTIVATE_USER:       '#22C55E',
  QR_CHECKIN:          '#D97706',
  DELETE_ANNOUNCEMENT: '#EF4444',
  GENERATE_QR:         '#10B981',
  CREATE_PROGRAM:      '#10B981',
}

export default function AdminDashboard() {
  const [stats,    setStats]    = useState({ totalUsers: 0, activeUsers: 0, pendingUsers: 0, pendingApplications: 0 })
  const [users,    setUsers]    = useState([])
  const [logs,     setLogs]     = useState([])
  const [meetings, setMeetings] = useState([])
  const [programs, setPrograms] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, u, l, meet, prog] = await Promise.all([
          axios.get(`${API}/admin/stats`),
          axios.get(`${API}/admin/users`),
          axios.get(`${API}/admin/logs`),
          axios.get(`${API}/meetings`),
          axios.get(`${API}/programs`),
        ])
        setStats(s.data.stats)
        setUsers(u.data.users)
        setLogs(l.data.logs.slice(0, 10))
        setMeetings(meet.data.meetings)
        setPrograms(prog.data.programs)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Helper: bilang ng users per role
  const roleCount  = (role) => users.filter(u => u.role === role).length
  const upcoming   = meetings.filter(m => new Date(m.date) >= new Date()).length
  const ongoing    = meetings.filter(m => m.status === 'Ongoing').length
  const completed  = programs.filter(p => p.status === 'Completed').length
  const today      = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360, flexDirection: 'column', gap: 14 }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
      <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Loading dashboard...</p>
    </div>
  )

  return (
    <div>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--red-600)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
          Admin Console
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">System Overview</h1>
            <p className="page-subtitle">{today}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/admin/create-account" className="btn btn-primary btn-sm">
              <Icon name="plus" size={14} /> Create Account
            </Link>
            <Link to="/admin/audit-logs" className="btn btn-ghost btn-sm">
              <Icon name="clipboardList" size={14} /> Audit Logs
            </Link>
          </div>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Users',    value: stats.totalUsers,   icon: 'users',     color: 'var(--blue-800)',  bg: 'var(--blue-100)',  to: '/admin/users' },
          { label: 'Active Users',   value: stats.activeUsers,  icon: 'check',     color: 'var(--green-600)', bg: 'var(--green-100)', to: '/admin/users' },
          { label: 'SK Applications', value: stats.pendingApplications || 0, icon: 'bell',      color: 'var(--amber-600)', bg: 'var(--amber-100)', to: '/admin/sk-applications' },
          { label: 'Audit Logs',     value: logs.length,        icon: 'clipboardList', color: 'var(--red-600)', bg: 'var(--red-100)', to: '/admin/audit-logs' },
        ].map(s => (
          <Link key={s.label} to={s.to} style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <Icon name={s.icon} size={20} color={s.color} />
              </div>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Second stats row */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Upcoming Events',  value: upcoming,            icon: 'calendar',  color: 'var(--blue-800)',  bg: 'var(--blue-100)' },
          { label: 'Ongoing Events',   value: ongoing,             icon: 'star',      color: 'var(--green-600)', bg: 'var(--green-100)' },
          { label: 'Total Programs',   value: programs.length,     icon: 'trophy',    color: 'var(--amber-600)', bg: 'var(--amber-100)', sub: `${completed} completed` },
          { label: 'Kabataan Users',   value: roleCount('kabataan_user'), icon: 'users', color: 'var(--green-600)', bg: 'var(--green-100)', sub: 'Registered youth' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <Icon name={s.icon} size={20} color={s.color} />
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              {s.sub && <div className="stat-sub">{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Mid section */}
      <div className="grid-2" style={{ marginBottom: 16 }}>

        {/* User distribution */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>User Distribution</h3>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 20 }}>Breakdown by role</p>
          {[
            { role: 'admin',         label: 'Administrators', color: 'var(--red-600)',   icon: 'shield' },
            { role: 'sk_officer',    label: 'SK Officers',    color: 'var(--blue-800)',  icon: 'identification' },
                        { role: 'kabataan_user', label: 'Kabataan Users', color: 'var(--green-600)', icon: 'users' },
          ].map(r => {
            const count = roleCount(r.role)
            const pct   = stats.totalUsers > 0 ? ((count / stats.totalUsers) * 100).toFixed(0) : 0
            return (
              <div key={r.role} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name={r.icon} size={14} color={r.color} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: r.color }}>{count}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{pct}%</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: r.color }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* System health */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>System Health</h3>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 20 }}>Current status</p>
          {[
            { label: 'Backend API',    status: 'Operational',                                 ok: true },
            { label: 'MongoDB Atlas',  status: 'Connected',                                   ok: true },
            { label: 'Authentication', status: 'Active',                                      ok: true },
            { label: 'QR Check-in',    status: ongoing > 0 ? `${ongoing} Active` : 'Standby', ok: true },
            { label: 'Active Events',  status: `${ongoing} ongoing`,                          ok: ongoing > 0 },
            { label: 'Programs',       status: `${programs.length} documented`,               ok: true },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.ok ? 'var(--green-600)' : 'var(--amber-600)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: item.ok ? 'var(--green-600)' : 'var(--amber-600)' }}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid-2">

        {/* Recent audit logs */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 15 }}>Recent Activity</h3>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>System audit trail</p>
            </div>
            <Link to="/admin/audit-logs" style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-800)', textDecoration: 'none' }}>
              View all
            </Link>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>No activity yet</div>
            ) : logs.map(log => {
              const color = ACTION_STYLE[log.action] || 'var(--text-faint)'
              return (
                <div key={log._id} style={{ display: 'flex', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border)', transition: 'background var(--transition)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${color}18`, color, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', flexShrink: 0 }}>
                        {new Date(log.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{log.details}</p>
                    {log.user && (
                      <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                        by {log.user.firstName} {log.user.lastName}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Quick Actions</h3>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 16 }}>Common admin tasks</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { to: '/admin/create-account', icon: 'plus',           label: 'Create SK Account',    desc: 'Add officer or member',       color: 'var(--blue-800)' },
              { to: '/admin/users',          icon: 'users',          label: 'Manage Users',          desc: 'View, edit, deactivate',      color: 'var(--green-600)' },
              { to: '/admin/analytics',      icon: 'chartBar',       label: 'View Analytics',        desc: 'Stats and charts',            color: 'var(--amber-600)' },
              { to: '/admin/audit-logs',     icon: 'clipboardList',  label: 'Audit Logs',            desc: 'Full activity history',       color: 'var(--red-600)' },
              { to: '/admin/settings',       icon: 'cog',            label: 'Settings',              desc: 'Configure your account',      color: 'var(--text-muted)' },
            ].map(action => (
              <Link key={action.to} to={action.to} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-subtle)',
                textDecoration: 'none',
                transition: 'all var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.background = 'var(--bg-card)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-subtle)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${action.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={action.icon} size={16} color={action.color} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)' }}>{action.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{action.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: 'var(--text-faint)' }}>
                  <Icon name="arrowRight" size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}