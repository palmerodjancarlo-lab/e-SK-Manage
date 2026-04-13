// Admin Analytics — stats, charts, top actions
import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function AdminAnalytics() {
  const [users,    setUsers]    = useState([])
    const [programs, setPrograms] = useState([])
  const [logs,     setLogs]     = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/admin/users`),
            axios.get(`${API}/programs`),
      axios.get(`${API}/admin/logs`),
    ]).then(([u, p, l]) => {
      setUsers(u.data.users)
            setPrograms(p.data.programs)
      setLogs(l.data.logs)
    }).catch(() => toast.error('Failed to load analytics.'))
      .finally(() => setLoading(false))
  }, [])

  const kabataanUsers = users.filter(u => u.role === 'kabataan_user')
  const totalPoints   = kabataanUsers.reduce((s, u) => s + (u.points || 0), 0)
  const avgPoints     = kabataanUsers.length > 0 ? Math.round(totalPoints / kabataanUsers.length) : 0
  const topUser       = [...kabataanUsers].sort((a, b) => (b.points || 0) - (a.points || 0))[0]
  const totalBudget   = programs.reduce((s, p) => s + (p.budget?.allocated || 0), 0)
  const totalSpent    = programs.reduce((s, p) => s + (p.budget?.spent || 0), 0)
  const budgetPct     = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0

  // Top system actions from audit logs
  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1
    return acc
  }, {})
  const topActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxAction  = topActions[0]?.[1] || 1

  // Users per municipality
  const munis = ['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos']
  const muniData = munis.map(m => ({
    name: m,
    total: users.filter(u => u.municipality === m).length,
  }))
  const maxMuni = Math.max(...muniData.map(m => m.total), 1)

  // Programs by status
  const progStatus = ['Upcoming','Ongoing','Completed','Cancelled'].map(s => ({
    label: s,
    count: programs.filter(p => p.status === s).length,
  }))

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div className="spinner" style={{ width:36, height:36 }} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">System-wide data overview</p>
      </div>

      {/* KPI row */}
      <div className="grid-4" style={{ marginBottom:20 }}>
        {[
          { label:'Avg Points / User', value:avgPoints,        icon:'star',    color:'var(--amber-600)', bg:'var(--amber-100)', sub:'Kabataan average' },
          { label:'Top Performer',     value:topUser ? `${topUser.firstName} ${topUser.lastName}` : '—', icon:'trophy', color:'var(--green-600)', bg:'var(--green-100)', sub:`${topUser?.points || 0} pts` },
          { label:'Budget Used',       value:`${budgetPct}%`,  icon:'banknotes',color:'var(--blue-800)', bg:'var(--blue-100)', sub:`₱${totalSpent.toLocaleString()} of ₱${totalBudget.toLocaleString()}` },
          { label:'QR Check-ins',      value:logs.filter(l=>l.action==='QR_CHECKIN').length, icon:'qrCode', color:'var(--green-600)', bg:'var(--green-100)', sub:'Total check-ins' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.bg }}>
              <Icon name={s.icon} size={20} color={s.color} />
            </div>
            <div style={{ minWidth:0 }}>
              <div className="stat-value" style={{ fontSize:s.label==='Top Performer'?14:26, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              {s.sub && <div className="stat-sub">{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom:16 }}>

        {/* Users per municipality */}
        <div className="card">
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Users by Municipality</h3>
          <p style={{ fontSize:12, color:'var(--text-faint)', marginBottom:20 }}>Marinduque breakdown</p>
          {muniData.map(m => (
            <div key={m.name} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:13, color:'var(--text-muted)' }}>{m.name}</span>
                <span style={{ fontSize:13, fontWeight:700 }}>{m.total}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${(m.total/maxMuni)*100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Top system actions */}
        <div className="card">
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Top System Actions</h3>
          <p style={{ fontSize:12, color:'var(--text-faint)', marginBottom:20 }}>Most frequent activities</p>
          {topActions.length === 0 ? (
            <p style={{ fontSize:13, color:'var(--text-faint)', textAlign:'center', padding:24 }}>No logs yet.</p>
          ) : topActions.map(([action, count]) => (
            <div key={action} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.3px' }}>{action}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--blue-800)' }}>{count}x</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${(count/maxAction)*100}%`, background:'var(--blue-800)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        {/* Programs by status */}
        <div className="card">
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:20 }}>Programs by Status</h3>
          <div className="grid-2" style={{ gap:10 }}>
            {progStatus.map(s => {
              const colors = { Upcoming:'var(--blue-800)', Ongoing:'var(--amber-600)', Completed:'var(--green-600)', Cancelled:'var(--red-600)' }
              const bgs    = { Upcoming:'var(--blue-100)', Ongoing:'var(--amber-100)', Completed:'var(--green-100)', Cancelled:'var(--red-100)' }
              return (
                <div key={s.label} style={{ padding:'14px 16px', background:bgs[s.label], borderRadius:12, border:`1px solid ${colors[s.label]}20` }}>
                  <div style={{ fontSize:24, fontWeight:800, color:colors[s.label], lineHeight:1, marginBottom:4 }}>{s.count}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:colors[s.label] }}>{s.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Budget overview */}
        <div className="card">
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:20 }}>Budget Overview</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { label:'Total Allocated', value:`₱${totalBudget.toLocaleString()}`, color:'var(--blue-800)' },
              { label:'Total Spent',     value:`₱${totalSpent.toLocaleString()}`, color:'var(--red-600)' },
              { label:'Remaining',       value:`₱${(totalBudget-totalSpent).toLocaleString()}`, color:'var(--green-600)' },
            ].map(item => (
              <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:'var(--bg-subtle)', borderRadius:10, border:'1px solid var(--border)' }}>
                <span style={{ fontSize:13, color:'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontSize:15, fontWeight:800, color:item.color }}>{item.value}</span>
              </div>
            ))}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'var(--text-faint)' }}>Utilization Rate</span>
                <span style={{ fontSize:12, fontWeight:700 }}>{budgetPct}%</span>
              </div>
              <div className="progress-bar" style={{ height:10 }}>
                <div className="progress-fill" style={{ width:`${budgetPct}%`, background: budgetPct > 90 ? 'var(--red-600)' : budgetPct > 70 ? 'var(--amber-600)' : 'var(--green-600)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}