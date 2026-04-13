// SK Programs page — para sa pag-document ng mga programa at proyekto
import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../components/Icon'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const STATUS_STYLE = {
  Upcoming:  { badge: 'badge-blue',  bar: 'var(--blue-800)' },
  Ongoing:   { badge: 'badge-amber', bar: 'var(--amber-600)' },
  Completed: { badge: 'badge-green', bar: 'var(--green-600)' },
  Cancelled: { badge: 'badge-rose',  bar: 'var(--rose-600)' },
}

export default function SKPrograms() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('All')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const canManage = user?.role === 'admin' || user?.role === 'sk_officer'

  const [form, setForm] = useState({ title:'', objectives:'', date:'', venue:'', status:'Upcoming', sdgGoal:'', budget:{ allocated:0, spent:0 }, accomplishments:'' })

  useEffect(() => {
    axios.get(`${API}/programs`)
      .then(r => setPrograms(r.data.programs))
      .catch(() => toast.error('Failed to load program.'))
      .finally(() => setLoading(false))
  }, [])

  const fetchPrograms = () => {
    axios.get(`${API}/programs`).then(r => setPrograms(r.data.programs)).catch(() => {})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/programs`, form)
      toast.success('Program added.')
      setShowForm(false)
      setForm({ title:'', objectives:'', date:'', venue:'', status:'Upcoming', sdgGoal:'', budget:{allocated:0,spent:0}, accomplishments:'' })
      fetchPrograms()
    } catch (err) { toast.error(err.response?.data?.message || 'Error.') }
  }

  const filtered = filter === 'All' ? programs : programs.filter(p => p.status === filter)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">SK Programs</h1>
          <p className="page-subtitle">Program and accomplishment tracker</p>
        </div>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <Icon name="plus" size={14} /> Add Program
          </button>
        )}
      </div>

      {/* Status filter cards */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {['All','Upcoming','Ongoing','Completed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '14px 16px', borderRadius: 'var(--radius-lg)',
            border: `1.5px solid ${filter===s ? 'var(--blue-800)' : 'var(--border)'}`,
            background: filter===s ? 'var(--blue-800)' : 'var(--bg-card)',
            color: filter===s ? 'white' : 'var(--text-muted)',
            cursor: 'pointer', transition: 'all var(--transition)',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, marginBottom: 3 }}>
              {s === 'All' ? programs.length : programs.filter(p => p.status === s).length}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{s}</div>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:48 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="trophy" size={40} /></div>
            <div className="empty-title">No Program</div>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(p => {
            const ss = STATUS_STYLE[p.status] || STATUS_STYLE.Upcoming
            const pct = p.budget?.allocated > 0 ? Math.min(((p.budget.spent||0)/p.budget.allocated)*100, 100).toFixed(0) : 0
            return (
              <div key={p._id} className="card card-hover" onClick={() => setSelected(p)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span className={`badge ${ss.badge}`}>{p.status}</span>
                  {p.sdgGoal && <span className="badge badge-green" style={{ fontSize: 10 }}>SDG</span>}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-base)', marginBottom: 6 }}>{p.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.objectives}
                </p>
                {p.date && <p style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: p.budget?.allocated>0?10:0 }}>
                  {new Date(p.date).toLocaleDateString('en-PH')}
                </p>}
                {p.budget?.allocated > 0 && (
                  <>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-faint)', marginBottom:4 }}>
                      <span>Budget</span>
                      <span>₱{(p.budget.spent||0).toLocaleString()} / ₱{p.budget.allocated.toLocaleString()}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width:`${pct}%`, background: pct>90?'var(--red-600)':ss.bar }} />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add SK Program</span>
              <button className="modal-close" onClick={() => setShowForm(false)}><Icon name="x" size={14} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Program Title</label>
                  <input className="form-input" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Objectives</label>
                  <textarea className="form-textarea" required rows={3} value={form.objectives} onChange={e=>setForm({...form,objectives:e.target.value})} /></div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Date</label>
                    <input type="date" className="form-input" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                      <option>Upcoming</option><option>Ongoing</option><option>Completed</option><option>Cancelled</option>
                    </select></div>
                </div>
                <div className="form-group"><label className="form-label">Venue</label>
                  <input className="form-input" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} /></div>
                <div className="grid-2">
                  <div className="form-group"><label className="form-label">Budget Allocated (₱)</label>
                    <input type="number" className="form-input" value={form.budget.allocated} onChange={e=>setForm({...form,budget:{...form.budget,allocated:Number(e.target.value)}})} /></div>
                  <div className="form-group"><label className="form-label">Budget Spent (₱)</label>
                    <input type="number" className="form-input" value={form.budget.spent} onChange={e=>setForm({...form,budget:{...form.budget,spent:Number(e.target.value)}})} /></div>
                </div>
                <div className="form-group"><label className="form-label">SDG Goal (optional)</label>
                  <input className="form-input" placeholder="e.g. SDG 4: Quality Education" value={form.sdgGoal} onChange={e=>setForm({...form,sdgGoal:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Accomplishments</label>
                  <textarea className="form-textarea" rows={3} value={form.accomplishments} onChange={e=>setForm({...form,accomplishments:e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Program</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className={`badge ${STATUS_STYLE[selected.status]?.badge}`}>{selected.status}</span>
              <button className="modal-close" onClick={() => setSelected(null)}><Icon name="x" size={14} /></button>
            </div>
            <div className="modal-body">
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>{selected.title}</h2>
              <div className="grid-2" style={{ gap: 10, marginBottom: 16 }}>
                {[{l:'Date',v:selected.date?new Date(selected.date).toLocaleDateString('en-PH'):'—'},{l:'Venue',v:selected.venue||'—'},{l:'Budget Allocated',v:selected.budget?.allocated?`₱${selected.budget.allocated.toLocaleString()}`:'—'},{l:'Budget Spent',v:selected.budget?.spent?`₱${selected.budget.spent.toLocaleString()}`:'—'},{l:'SDG Goal',v:selected.sdgGoal||'—'},{l:'Status',v:selected.status}].map(i=>(
                  <div key={i.l} style={{ padding:'9px 11px',background:'var(--bg-subtle)',borderRadius:8,border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:10,color:'var(--text-faint)',fontWeight:700,marginBottom:3,textTransform:'uppercase',letterSpacing:'0.4px' }}>{i.l}</div>
                    <div style={{ fontSize:13,fontWeight:600 }}>{i.v}</div>
                  </div>
                ))}
              </div>
              {selected.objectives && <><p style={{ fontSize:11,color:'var(--text-faint)',fontWeight:700,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px' }}>Objectives</p><p style={{ fontSize:13,color:'var(--text-muted)',lineHeight:1.7,marginBottom:14 }}>{selected.objectives}</p></>}
              {selected.accomplishments && <><p style={{ fontSize:11,color:'var(--text-faint)',fontWeight:700,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.4px' }}>Accomplishments</p><p style={{ fontSize:13,color:'var(--text-muted)',lineHeight:1.7 }}>{selected.accomplishments}</p></>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}