// SK Officer Dashboard — bawat fetch ay separate
// para hindi mabigo lahat kung may isa lang na error

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../components/Icon'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function SKDashboard() {
  const { user } = useAuth()
  const [members,  setMembers]  = useState([])
  const [meetings, setMeetings] = useState([])
  const [anns,     setAnns]     = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      // Members
      try {
        const r = await axios.get(`${API}/admin/users`)
        setMembers((r.data.users || []).filter(u => u.role !== 'admin'))
      } catch (e) { console.log('members:', e.message) }

      // Meetings
      try {
        const r = await axios.get(`${API}/meetings`)
        setMeetings(
          (r.data.meetings || [])
            .filter(m => new Date(m.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 4)
        )
      } catch (e) { console.log('meetings:', e.message) }

      // Announcements
      try {
        const r = await axios.get(`${API}/announcements`)
        setAnns((r.data.announcements || []).slice(0, 4))
      } catch (e) { console.log('announcements:', e.message) }

      setLoading(false)
    }
    fetchAll()
  }, [])

  const today       = new Date().toLocaleDateString('en-PH', { weekday:'long', month:'long', day:'numeric', year:'numeric' })
  const active      = members.filter(m => m.isActive).length
  const pendingApps = members.filter(m => m.skApplication?.isApplying && m.skApplication?.status === 'pending').length

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:80, flexDirection:'column', gap:14 }}>
      <div className="spinner" style={{ width:36, height:36 }} />
      <p style={{ fontSize:13, color:'var(--text-muted)' }}>Loading dashboard...</p>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--blue-800)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:4 }}>SK Officer</p>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 className="page-title">Good day, {user?.firstName}!</h1>
            <p className="page-subtitle">{today}</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Link to="/sk/meetings"      className="btn btn-primary btn-sm"><Icon name="plus"      size={14}/> New Meeting</Link>
            <Link to="/sk/announcements" className="btn btn-ghost   btn-sm"><Icon name="megaphone" size={14}/> Post News</Link>
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom:16 }}>
        {[
          { label:'Total Members',   value: members.length, icon:'users',          color:'var(--blue-800)',  bg:'var(--blue-100)',  to:'/sk/members'  },
          { label:'Active Members',  value: active,          icon:'check',          color:'var(--green-600)', bg:'var(--green-100)', to:'/sk/members'  },
          { label:'Upcoming Events', value: meetings.length, icon:'calendar',       color:'var(--amber-600)', bg:'var(--amber-100)', to:'/sk/meetings' },
          { label:'Pending SK Apps', value: pendingApps,     icon:'identification', color:'var(--red-600)',   bg:'var(--red-100)',   to:'/sk/members'  },
        ].map(s => (
          <Link key={s.label} to={s.to} style={{ textDecoration:'none' }}>
            <div className="stat-card" style={{ cursor:'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=s.color; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none' }}>
              <div className="stat-icon" style={{ background:s.bg }}>
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

      <div className="grid-2">
        {/* Upcoming meetings */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 18px', borderBottom:'1px solid var(--border)' }}>
            <h3 style={{ fontWeight:700, fontSize:15 }}>Upcoming Events</h3>
            <Link to="/sk/meetings" style={{ fontSize:12, fontWeight:600, color:'var(--blue-800)', textDecoration:'none' }}>View all</Link>
          </div>
          {meetings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="calendar" size={32}/></div>
              <div className="empty-title">No upcoming events</div>
              <div className="empty-desc">Create a meeting to get started.</div>
            </div>
          ) : meetings.map(m => {
            const d = new Date(m.date)
            return (
              <div key={m._id} style={{ display:'flex', gap:12, padding:'12px 18px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                <div style={{ background:'var(--blue-800)', color:'white', borderRadius:9, padding:'7px 10px', textAlign:'center', minWidth:42, flexShrink:0 }}>
                  <p style={{ fontSize:9, fontWeight:700, opacity:0.7 }}>{d.toLocaleString('default',{month:'short'})}</p>
                  <p style={{ fontSize:16, fontWeight:800, lineHeight:1 }}>{d.getDate()}</p>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</p>
                  <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{m.time && `${m.time} · `}{m.venue}</p>
                </div>
                <span className={`badge ${m.type==='Meeting'?'badge-blue':m.type==='Event'?'badge-green':'badge-amber'}`} style={{ fontSize:10 }}>
                  {m.type}
                </span>
              </div>
            )
          })}
        </div>

        {/* Recent announcements */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 18px', borderBottom:'1px solid var(--border)' }}>
            <h3 style={{ fontWeight:700, fontSize:15 }}>Recent Announcements</h3>
            <Link to="/sk/announcements" style={{ fontSize:12, fontWeight:600, color:'var(--blue-800)', textDecoration:'none' }}>View all</Link>
          </div>
          {anns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="megaphone" size={32}/></div>
              <div className="empty-title">No announcements yet</div>
              <div className="empty-desc">Post an announcement to notify members.</div>
            </div>
          ) : anns.map(a => (
            <div key={a._id} style={{ display:'flex', gap:12, padding:'12px 18px', borderBottom:'1px solid var(--border)', alignItems:'flex-start' }}>
              <div style={{ width:34, height:34, borderRadius:8, background:a.isPinned?'var(--gold-100)':'var(--blue-100)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="megaphone" size={15} color={a.isPinned?'var(--gold-600)':'var(--blue-800)'} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</p>
                <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>
                  {new Date(a.createdAt).toLocaleDateString('en-PH')}
                  {a.isPinned && <span style={{ marginLeft:8, fontSize:10, fontWeight:700, color:'var(--gold-600)' }}>Pinned</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}