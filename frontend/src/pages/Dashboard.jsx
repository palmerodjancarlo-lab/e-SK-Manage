import { useAuth }    from '../context/AuthContext'
import { Link }       from 'react-router-dom'
import skLogo         from '../assets/sk-logo.png'

const STATS = [
  { label: 'Total Members',   value: '128', icon: '👥', bg: 'var(--sk-blue)',  sub: '+4 this month' },
  { label: 'Announcements',   value: '24',  icon: '📢', bg: 'var(--sk-red)',   sub: '3 pinned' },
  { label: 'Upcoming Events', value: '7',   icon: '📅', bg: 'var(--sk-gold)',  sub: 'Next: June 15' },
  { label: 'Programs',        value: '12',  icon: '🏆', bg: 'var(--success)',  sub: '5 completed' },
]

const ANNOUNCEMENTS = [
  { title: 'SK Sports Festival 2025 is OPEN!',  cat: 'Events',       badge: 'badge-blue',  date: 'June 28' },
  { title: 'Scholarship Applications Open',      cat: 'Programs',     badge: 'badge-red',   date: 'June 30' },
  { title: 'Clean Drive Volunteer Signup',       cat: 'Activity',     badge: 'badge-green', date: 'June 22' },
  { title: 'Monthly Council Meeting',            cat: 'Meetings',     badge: 'badge-gold',  date: 'June 15' },
]

const EVENTS = [
  { title: 'SK Council Meeting',    date: 'Jun 15', time: '9:00 AM',  color: 'var(--sk-blue)' },
  { title: 'Youth Summit 2025',     date: 'Jun 18', time: '1:00 PM',  color: 'var(--success)' },
  { title: 'Tree Planting Drive',   date: 'Jun 22', time: '7:00 AM',  color: 'var(--sk-gold)' },
  { title: 'Sports Fest Day 1',     date: 'Jun 28', time: '8:00 AM',  color: 'var(--sk-red)' },
]

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div>

      {/* Welcome Banner */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--sk-blue)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px 36px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 24
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 220, height: 220,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', bottom: -40, right: 80,
          width: 140, height: 140,
          background: 'rgba(245,196,0,0.12)',
          borderRadius: '50%'
        }} />

        {/* SK Logo in banner */}
        <div style={{
          width: 72, height: 72,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 18,
          border: '2px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <img src={skLogo} alt="SK" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 4 }}>Good morning,</p>
          <h2 style={{ color: 'white', fontSize: 28, fontWeight: 900, marginBottom: 4, lineHeight: 1.2 }}>
            {user?.firstName} {user?.lastName}!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
            {user?.barangay && `Brgy. ${user.barangay} · `}
            <span style={{ textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ')}
            </span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {STATS.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}
           className="dashboard-grid">

        {/* Announcements */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 18 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Latest Announcements</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Recent SK updates</div>
            </div>
            <Link to="/announcements" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          <div>
            {ANNOUNCEMENTS.map((ann, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 0',
                borderBottom: i < ANNOUNCEMENTS.length-1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ann.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ann.date}</div>
                </div>
                <span className={`badge ${ann.badge}`}>{ann.cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 18 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Upcoming</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>June 2025</div>
            </div>
            <Link to="/meetings" className="btn btn-ghost btn-sm">All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {EVENTS.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  background: ev.color,
                  color: 'white',
                  borderRadius: 12,
                  padding: '8px 10px',
                  textAlign: 'center',
                  minWidth: 52,
                  flexShrink: 0
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>{ev.date.split(' ')[0]}</div>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{ev.date.split(' ')[1]}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="card">
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 16 }}>Quick Access</div>
        <div className="grid-4">
          {[
            { to: '/transparency', icon: '📊', label: 'Budget Report',    bg: '#F0FDF4', color: '#15803D' },
            { to: '/programs',     icon: '🏆', label: 'SK Programs',      bg: 'var(--sk-blue-pale)', color: 'var(--sk-blue)' },
            { to: '/points',       icon: '⭐', label: 'My Points',        bg: 'var(--sk-gold-pale)', color: 'var(--sk-gold-dark)' },
            { to: '/officials',    icon: '🏛', label: 'SK Officials',     bg: '#F5F3FF', color: '#6D28D9' },
          ].map(q => (
            <Link key={q.to} to={q.to} style={{
              background: q.bg,
              borderRadius: 'var(--radius-lg)',
              padding: '20px 16px',
              textAlign: 'center',
              transition: 'var(--transition)',
              color: q.color,
              textDecoration: 'none',
              display: 'block'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{q.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{q.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}