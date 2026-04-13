// SK Transparency page — para sa budget reporting
import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Icon } from '../../components/Icon'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function SKTransparency() {
  const [programs, setPrograms] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    axios.get(`${API}/programs`)
      .then(r => setPrograms(r.data.programs))
      .catch(() => toast.error('Error.'))
      .finally(() => setLoading(false))
  }, [])

  const totalAllocated = programs.reduce((s,p) => s+(p.budget?.allocated||0), 0)
  const totalSpent     = programs.reduce((s,p) => s+(p.budget?.spent||0), 0)
  const pctUsed        = totalAllocated > 0 ? ((totalSpent/totalAllocated)*100).toFixed(1) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget Transparency</h1>
          <p className="page-subtitle">SK fund utilization report</p>
        </div>
        <span className="badge badge-green"><Icon name="check" size={11} /> Public Data</span>
      </div>

      {/* Overview cards */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Allocated', value: `₱${totalAllocated.toLocaleString()}`, color: 'var(--blue-800)' },
          { label: 'Total Spent',     value: `₱${totalSpent.toLocaleString()}`,      color: 'var(--red-600)' },
          { label: 'Remaining',       value: `₱${(totalAllocated-totalSpent).toLocaleString()}`, color: 'var(--green-600)' },
        ].map(s => (
          <div key={s.label} className="card">
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Overall utilization bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Overall Budget Utilization</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-base)' }}>{pctUsed}%</span>
        </div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div className="progress-fill" style={{ width: `${pctUsed}%`, background: pctUsed>90?'var(--red-600)':pctUsed>70?'var(--amber-600)':'var(--blue-800)' }} />
        </div>
      </div>

      {/* Program list */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner" /></div>
      ) : programs.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon"><Icon name="banknotes" size={40} /></div><div className="empty-title">No Data</div></div></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {programs.map(p => {
            const pct = p.budget?.allocated>0 ? ((p.budget.spent||0)/p.budget.allocated*100).toFixed(1) : 0
            return (
              <div key={p._id} className="card card-hover" onClick={() => setSelected(p)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, flexWrap:'wrap', gap:6 }}>
                  <div>
                    <h3 style={{ fontWeight:700, fontSize:14, color:'var(--text-base)' }}>{p.title}</h3>
                    {p.date && <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>{new Date(p.date).toLocaleDateString('en-PH')}</p>}
                  </div>
                  <span className="badge badge-gray">{p.status}</span>
                </div>
                {p.budget?.allocated > 0 ? (
                  <>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-muted)', marginBottom:6, flexWrap:'wrap', gap:4 }}>
                      <span>Allocated: <strong>₱{p.budget.allocated.toLocaleString()}</strong></span>
                      <span>Spent: <strong style={{ color:pct>90?'var(--red-600)':'var(--green-600)' }}>₱{(p.budget.spent||0).toLocaleString()}</strong></span>
                      <span>Left: <strong>₱{(p.budget.allocated-(p.budget.spent||0)).toLocaleString()}</strong></span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width:`${pct}%`, background:pct>90?'var(--red-600)':pct>70?'var(--amber-600)':'var(--blue-800)' }} />
                    </div>
                    <p style={{ fontSize:10, color:'var(--text-faint)', marginTop:3 }}>{pct}% utilize</p>
                  </>
                ) : <p style={{ fontSize:12, color:'var(--text-faint)' }}>No Budget Data</p>}
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Budget Detail</span><button className="modal-close" onClick={()=>setSelected(null)}><Icon name="x" size={14}/></button></div>
            <div className="modal-body">
              <h2 style={{ fontSize:16,fontWeight:700,marginBottom:16 }}>{selected.title}</h2>
              <div className="grid-2" style={{ gap:10,marginBottom:16 }}>
                {[{l:'Allocated',v:`₱${(selected.budget?.allocated||0).toLocaleString()}`},{l:'Spent',v:`₱${(selected.budget?.spent||0).toLocaleString()}`},{l:'Remaining',v:`₱${((selected.budget?.allocated||0)-(selected.budget?.spent||0)).toLocaleString()}`},{l:'Status',v:selected.status}].map(i=>(
                  <div key={i.l} style={{ padding:'9px 11px',background:'var(--bg-subtle)',borderRadius:8,border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:10,color:'var(--text-faint)',fontWeight:700,marginBottom:3,textTransform:'uppercase',letterSpacing:'0.4px' }}>{i.l}</div>
                    <div style={{ fontSize:13,fontWeight:700 }}>{i.v}</div>
                  </div>
                ))}
              </div>
              {selected.objectives && <p style={{ fontSize:13,color:'var(--text-muted)',lineHeight:1.7 }}>{selected.objectives}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}