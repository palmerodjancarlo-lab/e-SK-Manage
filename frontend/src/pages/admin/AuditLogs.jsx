// admin/AuditLogs.jsx — searchable audit trail
import { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const TONE = {
  LOGIN:'green', REGISTER:'sky', VERIFY_EMAIL:'green', CREATE_SK_ACCOUNT:'accent',
  RECORD_FUND:'green', RECORD_EXPENSE:'red', APPROVE_EXPENSE:'green', VOID_EXPENSE:'red', VOID_FUND:'red',
  CREATE_PROGRAM:'violet', CREATE_PROJECT:'sky', CREATE_ACTIVITY:'amber', RECORD_ATTENDANCE:'green',
  QR_CHECKIN:'green', DELETE_USER:'red', DELETE_PROGRAM:'red', RESET_PASSWORD:'amber', FORGOT_PASSWORD:'amber',
  TOGGLE_USER:'amber', GENERATE_QR:'sky', BULK_AWARD_POINTS:'violet',
}

export default function AdminAuditLogs() {
  const { T } = useTheme()
  const [logs,setLogs]=useState([])
  const [search,setSearch]=useState('')
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    axios.get(`${API}/admin/logs`).then(r=>setLogs(r.data.logs||[])).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  const filtered = logs.filter(l=>
    search==='' || `${l.details} ${l.user?.firstName} ${l.user?.lastName} ${l.action}`.toLowerCase().includes(search.toLowerCase())
  )

  const toneColor = (action) => {
    const key = TONE[action] || 'accent'
    return { green:T.green, red:T.red, amber:T.amber, sky:T.sky, violet:T.violet, accent:T.accent }[key]
  }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.accentText, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>System</div>
        <h1 style={{ fontSize:23, fontWeight:800, margin:0, color:T.text, letterSpacing:'-0.5px' }}>Audit Trail</h1>
        <p style={{ fontSize:13, color:T.text2, margin:'5px 0 0' }}>Every action, attributed and time-stamped for accountability.</p>
      </div>

      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:T.text3 }}><Icon name="search" size={15}/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search logs..." style={{
            width:'100%', padding:'10px 12px 10px 36px', border:`1px solid ${T.border}`, borderRadius:9, fontSize:13.5,
            outline:'none', background:T.surface, color:T.text, boxSizing:'border-box',
          }}/>
        </div>
        <span style={{ fontSize:12, color:T.text3, fontWeight:600 }}>{filtered.length} entries</span>
      </div>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, overflow:'hidden', boxShadow:T.shadow }}>
        {loading ? <div style={{ padding:50, textAlign:'center', color:T.text3, fontSize:13 }}>Loading…</div>
          : filtered.length===0 ? <div style={{ padding:50, textAlign:'center', color:T.text3, fontSize:13 }}>No log entries found</div>
          : filtered.map((log,i)=>(
            <div key={log._id} style={{ display:'flex', gap:13, padding:'14px 18px', borderBottom: i<filtered.length-1?`1px solid ${T.border}`:'none' }}>
              <div style={{ width:9, height:9, borderRadius:'50%', background:toneColor(log.action), marginTop:5, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, color:T.text, lineHeight:1.45 }}>{log.details}</div>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:toneColor(log.action)+'18', color:toneColor(log.action) }}>{log.action}</span>
                  <span style={{ fontSize:11, color:T.text3 }}>
                    {log.user && `${log.user.firstName} ${log.user.lastName} · `}
                    {new Date(log.createdAt).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}