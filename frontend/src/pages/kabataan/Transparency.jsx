import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function KabataanTransparency() {
  const [programs, setPrograms] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    axios.get(`${API}/programs`)
      .then(r => setPrograms(r.data.programs))
      .catch(() => toast.error('Failed.'))
      .finally(() => setLoading(false))
  }, [])

  const totalAllocated = programs.reduce((s,p)=>s+(p.budget?.allocated||0),0)
  const totalSpent     = programs.reduce((s,p)=>s+(p.budget?.spent||0),0)
  const pct = totalAllocated > 0 ? ((totalSpent/totalAllocated)*100).toFixed(1) : 0

  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ background:'#0F1F5C', padding:'18px 20px 20px' }}>
        <h1 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:3 }}>Budget Transparency</h1>
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>Public SK fund report</p>
      </div>
      <div style={{ padding:'16px' }}>
        <div className="grid-2" style={{ marginBottom:14 }}>
          {[{l:'Total Budget',v:`₱${totalAllocated.toLocaleString()}`,c:'var(--blue-800)',bg:'var(--blue-100)'},{l:'Total Spent',v:`₱${totalSpent.toLocaleString()}`,c:'var(--red-600)',bg:'var(--red-100)'},{l:'Remaining',v:`₱${(totalAllocated-totalSpent).toLocaleString()}`,c:'var(--green-600)',bg:'var(--green-100)'},{l:'Utilization',v:`${pct}%`,c:'var(--amber-600)',bg:'var(--amber-100)'}].map(s=>(
            <div key={s.l} style={{ background:s.bg, borderRadius:12, padding:'14px 16px', border:`1px solid ${s.c}20` }}>
              <p style={{ fontSize:10, color:s.c, fontWeight:700, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.4px' }}>{s.l}</p>
              <p style={{ fontSize:20, fontWeight:800, color:s.c, lineHeight:1 }}>{s.v}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner"/></div>
        ) : programs.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-icon"><Icon name="banknotes" size={40}/></div><div className="empty-title">No data yet</div></div></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {programs.map(p => {
              const pct = p.budget?.allocated>0 ? ((p.budget.spent||0)/p.budget.allocated*100).toFixed(1) : 0
              return (
                <div key={p._id} className="card card-hover" style={{ padding:'14px 16px' }} onClick={()=>setSelected(p)}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <div><h3 style={{ fontWeight:700, fontSize:13 }}>{p.title}</h3>{p.date&&<p style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{new Date(p.date).toLocaleDateString('en-PH')}</p>}</div>
                    <span className="badge badge-gray">{p.status}</span>
                  </div>
                  {p.budget?.allocated>0 ? (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-muted)', marginBottom:6, flexWrap:'wrap', gap:4 }}>
                        <span>Allocated: <strong>₱{p.budget.allocated.toLocaleString()}</strong></span>
                        <span>Spent: <strong style={{ color:pct>90?'var(--red-600)':'var(--green-600)' }}>₱{(p.budget.spent||0).toLocaleString()}</strong></span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width:`${pct}%`, background:pct>90?'var(--red-600)':pct>70?'var(--amber-600)':'var(--green-600)' }} />
                      </div>
                      <p style={{ fontSize:10, color:'var(--text-faint)', marginTop:3 }}>{pct}% utilized</p>
                    </>
                  ) : <p style={{ fontSize:12, color:'var(--text-faint)' }}>No Budget Data.</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {selected && (
        <div className="modal-overlay" onClick={()=>setSelected(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Budget Detail</span><button className="modal-close" onClick={()=>setSelected(null)}><Icon name="x" size={14}/></button></div>
            <div className="modal-body">
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>{selected.title}</h2>
              <div className="grid-2" style={{ gap:10 }}>
                {[{l:'Allocated',v:`₱${(selected.budget?.allocated||0).toLocaleString()}`},{l:'Spent',v:`₱${(selected.budget?.spent||0).toLocaleString()}`},{l:'Remaining',v:`₱${((selected.budget?.allocated||0)-(selected.budget?.spent||0)).toLocaleString()}`},{l:'Status',v:selected.status}].map(i=>(
                  <div key={i.l} style={{ padding:'9px 11px', background:'var(--bg-subtle)', borderRadius:8, border:'1px solid var(--border)' }}>
                    <p style={{ fontSize:10, color:'var(--text-faint)', fontWeight:700, marginBottom:3, textTransform:'uppercase', letterSpacing:'0.4px' }}>{i.l}</p>
                    <p style={{ fontSize:13, fontWeight:700 }}>{i.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}