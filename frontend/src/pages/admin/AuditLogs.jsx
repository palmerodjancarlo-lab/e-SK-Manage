// Admin Audit Logs — full activity history
import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const ACTION_COLOR = {
  LOGIN:'#22C55E', REGISTER:'#3B82F6', CREATE_MEETING:'#D97706',
  CREATE_ANNOUNCEMENT:'#7C3AED', CREATE_USER:'#1A3A8F', UPDATE_ROLE:'#F97316',
  DEACTIVATE_USER:'#EF4444', ACTIVATE_USER:'#22C55E', QR_CHECKIN:'#D97706',
  DELETE_ANNOUNCEMENT:'#EF4444', GENERATE_QR:'#10B981', CREATE_PROGRAM:'#10B981',
  APPROVE_SK_APPLICATION:'#22C55E', REJECT_SK_APPLICATION:'#EF4444',
}

export default function AdminAuditLogs() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('All')

  useEffect(() => {
    axios.get(`${API}/admin/logs`)
      .then(r => setLogs(r.data.logs))
      .catch(() => toast.error('Failed to load logs.'))
      .finally(() => setLoading(false))
  }, [])

  const actions = ['All', ...new Set(logs.map(l => l.action))]
  const filtered = logs.filter(l => {
    const s = `${l.action} ${l.details} ${l.user?.email || ''} ${l.user?.firstName || ''}`.toLowerCase()
    return s.includes(search.toLowerCase()) && (filter === 'All' || l.action === filter)
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">{logs.length} total entries</p>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)', display:'flex' }}>
            <Icon name="search" size={14} />
          </span>
          <input className="form-input" placeholder="Search logs..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:36 }} />
        </div>
        <select className="form-select" style={{ width:'auto', minWidth:160 }} value={filter} onChange={e=>setFilter(e.target.value)}>
          {actions.map(a=><option key={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner" style={{ width:36, height:36 }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon"><Icon name="clipboardList" size={40} /></div>
          <div className="empty-title">No logs found</div>
        </div></div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Action</th><th>User</th><th>Details</th><th>Date & Time</th></tr></thead>
            <tbody>
              {filtered.map(log => {
                const color = ACTION_COLOR[log.action] || 'var(--text-faint)'
                return (
                  <tr key={log._id}>
                    <td>
                      <span style={{ padding:'3px 9px', borderRadius:999, fontSize:11, fontWeight:700, background:`${color}15`, color, whiteSpace:'nowrap' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      {log.user ? (
                        <div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{log.user.firstName} {log.user.lastName}</div>
                          <div style={{ fontSize:11, color:'var(--text-faint)' }}>{log.user.email}</div>
                        </div>
                      ) : <span style={{ color:'var(--text-faint)' }}>System</span>}
                    </td>
                    <td style={{ maxWidth:280 }}>
                      <span style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                        {log.details}
                      </span>
                    </td>
                    <td style={{ whiteSpace:'nowrap', fontSize:12, color:'var(--text-faint)' }}>
                      {new Date(log.createdAt).toLocaleDateString('en-PH')}<br/>
                      {new Date(log.createdAt).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}