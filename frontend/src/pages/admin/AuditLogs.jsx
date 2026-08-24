// admin/AuditLogs.jsx — Full system audit trail
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const C = {
  navy:'#0C2340', navyL:'#E8EEF8', gold:'#B8860B', green:'#14532D', greenL:'#F0FDF4',
  red:'#7F1D1D', redL:'#FFF1F2', amber:'#78350F', amberL:'#FFFBEB',
  border:'#CBD5E1', white:'#FFFFFF', text:'#0F172A', muted:'#64748B', faint:'#94A3B8', bg:'#F1F5F9',
}

const ACTION_COLOR = {
  LOGIN:'#14532D', LOGOUT:'#64748B', REGISTER:'#1D4ED8',
  CREATE_SK_ACCOUNT:'#0C2340', UPDATE_USER:'#1D4ED8', DELETE_USER:'#7F1D1D',
  TOGGLE_USER:'#78350F', RESET_PASSWORD:'#78350F', CHANGE_PASSWORD:'#78350F',
  RECORD_FUND:'#14532D', EDIT_FUND:'#78350F', VOID_FUND:'#7F1D1D',
  RECORD_EXPENSE:'#7F1D1D', APPROVE_EXPENSE:'#14532D', REJECT_EXPENSE:'#7F1D1D', VOID_EXPENSE:'#7F1D1D',
  CREATE_PROGRAM:'#6D28D9', CREATE_PROJECT:'#1D4ED8', CREATE_ACTIVITY:'#B8860B',
  RECORD_ATTENDANCE:'#14532D', CREATE_MEETING:'#B8860B',
}

const ROLE_LABEL = {
  admin:'Admin/IT', sk_chairperson:'SK Chairperson', sk_secretary:'SK Secretary',
  sk_treasurer:'SK Treasurer', sk_kagawad:'SK Kagawad', kabataan:'Kabataan',
}

export default function AuditLogs() {
  const [logs,    setLogs]    = useState([])
  const [search,  setSearch]  = useState('')
  const [action,  setAction]  = useState('all')
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    axios.get(`${API}/admin/logs`)
      .then(r => setLogs(r.data.logs))
      .catch(console.error)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const actions = ['all', ...new Set(logs.map(l => l.action))]

  const filtered = logs.filter(l => {
    const matchAction = action === 'all' || l.action === action
    const matchSearch = search === '' ||
      `${l.details} ${l.user?.firstName} ${l.user?.lastName}`.toLowerCase().includes(search.toLowerCase())
    return matchAction && matchSearch
  })

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text }}>

      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <div style={{ width:16, height:3, background:C.gold, borderRadius:2 }} />
          <span style={{ fontSize:10, fontWeight:700, color:C.gold, letterSpacing:'2px', textTransform:'uppercase' }}>System Audit</span>
        </div>
        <h1 style={{ fontSize:22, fontWeight:800, color:C.navy, margin:0 }}>Audit Trail</h1>
        <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>Every significant action is logged — who did it, what they did, and when. This ensures full accountability.</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search logs..."
          style={{ flex:1, minWidth:200, padding:'8px 12px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, outline:'none' }} />
        <select value={action} onChange={e=>setAction(e.target.value)}
          style={{ padding:'8px 12px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, background:C.white, cursor:'pointer' }}>
          {actions.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a.replace(/_/g,' ')}</option>)}
        </select>
        <div style={{ padding:'8px 14px', background:C.bg, borderRadius:6, fontSize:12, color:C.muted, fontWeight:600, display:'flex', alignItems:'center' }}>
          {filtered.length} entries
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:C.faint }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:C.faint }}>No logs found</div>
        ) : filtered.map((log, i) => {
          const color = ACTION_COLOR[log.action] || C.muted
          return (
            <div key={log._id} style={{ display:'flex', gap:14, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:i%2?'#FAFBFC':C.white }}>
              <div style={{ paddingTop:3 }}>
                <div style={{ width:9, height:9, borderRadius:'50%', background:color }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, gap:10 }}>
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:`${color}18`, color, letterSpacing:'0.3px' }}>
                    {log.action?.replace(/_/g,' ')}
                  </span>
                  <span style={{ fontSize:11, color:C.faint, flexShrink:0 }}>
                    {new Date(log.createdAt).toLocaleString('en-PH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize:13, color:C.text, margin:'0 0 3px', lineHeight:1.4 }}>{log.details}</p>
                {log.user && (
                  <p style={{ fontSize:11, color:C.faint, margin:0 }}>
                    <strong style={{ color:C.muted }}>{log.user.firstName} {log.user.lastName}</strong>
                    {' · '}{ROLE_LABEL[log.user.role] || log.user.role}
                    {log.user.email && ` · ${log.user.email}`}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}