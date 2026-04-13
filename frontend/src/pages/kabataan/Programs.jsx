import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const STATUS_BADGE = { Upcoming:'badge-blue', Ongoing:'badge-amber', Completed:'badge-green', Cancelled:'badge-rose' }

export default function KabataanPrograms() {
  const [programs, setPrograms] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('All')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    axios.get(`${API}/programs`)
      .then(r => setPrograms(r.data.programs))
      .catch(() => toast.error('Failed.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter==='All' ? programs : programs.filter(p=>p.status===filter)

  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ background:'#0F1F5C', padding:'18px 20px 20px' }}>
        <h1 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:3 }}>SK Programs</h1>
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>SK Programs and Projects</p>
      </div>
      <div style={{ padding:'16px' }}>
        <div className="tabs" style={{ marginBottom:16 }}>
          {['All','Upcoming','Ongoing','Completed'].map(s=><button key={s} className={`tab-btn ${filter===s?'active':''}`} onClick={()=>setFilter(s)}>{s}</button>)}
        </div>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}><div className="spinner"/></div>
        ) : filtered.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-icon"><Icon name="trophy" size={40}/></div><div className="empty-title">No programs</div></div></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(p => (
              <div key={p._id} className="card card-hover" style={{ padding:'14px 16px' }} onClick={()=>setSelected(p)}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap', gap:6 }}>
                  <span className={`badge ${STATUS_BADGE[p.status]||'badge-gray'}`}>{p.status}</span>
                  {p.sdgGoal && <span className="badge badge-green" style={{ fontSize:10 }}>SDG</span>}
                </div>
                <h3 style={{ fontWeight:700, fontSize:14, marginBottom:5 }}>{p.title}</h3>
                <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.objectives}</p>
                {p.date && <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:8 }}>{new Date(p.date).toLocaleDateString('en-PH')}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="modal-overlay" onClick={()=>setSelected(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className={`badge ${STATUS_BADGE[selected.status]||'badge-gray'}`}>{selected.status}</span><button className="modal-close" onClick={()=>setSelected(null)}><Icon name="x" size={14}/></button></div>
            <div className="modal-body">
              <h2 style={{ fontSize:17, fontWeight:700, marginBottom:14 }}>{selected.title}</h2>
              {selected.objectives && <><p style={{ fontSize:11, color:'var(--text-faint)', fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>Objectives</p><p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7, marginBottom:14 }}>{selected.objectives}</p></>}
              {selected.accomplishments && <><p style={{ fontSize:11, color:'var(--text-faint)', fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.4px' }}>Accomplishments</p><p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7 }}>{selected.accomplishments}</p></>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}