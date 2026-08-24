// sk/Programs.jsx — Program → Project → Activity management
// Shared by Admin and SK. Budget rolls up automatically.
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const C = {
  navy:'#0C2340', navyL:'#E8EEF8', gold:'#B8860B', goldL:'#FDF8EC',
  green:'#14532D', greenL:'#F0FDF4', red:'#7F1D1D', redL:'#FFF1F2',
  blue:'#1D4ED8', blueL:'#EFF6FF', violet:'#6D28D9', violetL:'#F5F3FF',
  amber:'#B45309', amberL:'#FFFBEB',
  border:'#E2E8F0', white:'#FFFFFF', text:'#0F172A', muted:'#64748B', faint:'#94A3B8', bg:'#F8FAFC',
}

const peso = n => `₱${Number(n||0).toLocaleString('en-PH')}`

const STATUS = {
  planned:   { label:'Planned',   color:C.amber,  bg:C.amberL  },
  ongoing:   { label:'Ongoing',   color:C.blue,   bg:C.blueL   },
  completed: { label:'Completed', color:C.green,  bg:C.greenL  },
  cancelled: { label:'Cancelled', color:C.red,    bg:C.redL    },
}

function StatusChip({ status }) {
  const s = STATUS[status] || STATUS.planned
  return <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:s.bg, color:s.color, textTransform:'uppercase', letterSpacing:'0.3px' }}>{s.label}</span>
}

function ProgressBar({ used, total }) {
  const pct = total > 0 ? Math.min(100, (used/total)*100) : 0
  const over = used > total
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ height:6, background:C.bg, borderRadius:999, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background: over ? C.red : pct > 80 ? C.amber : C.green, borderRadius:999, transition:'width 0.3s' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:5, fontSize:10, color:C.muted }}>
        <span>Used: <strong style={{ color: over ? C.red : C.text }}>{peso(used)}</strong></span>
        <span>Budget: <strong style={{ color:C.text }}>{peso(total)}</strong></span>
      </div>
    </div>
  )
}

export default function Programs() {
  const [programs, setPrograms] = useState([])
  const [selected, setSelected] = useState(null)  // selected program with projects
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [msg,      setMsg]      = useState('')

  const load = async () => {
    setLoading(true)
    const r = await axios.get(`${API}/programs`)
    setPrograms(r.data.programs)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openProgram = async (id) => {
    const r = await axios.get(`${API}/programs/${id}`)
    setSelected(r.data)
  }

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // ── Program detail view ──
  if (selected) {
    return <ProgramDetail data={selected} onBack={() => { setSelected(null); load() }} onChange={() => openProgram(selected.program._id)} flash={flash} msg={msg} />
  }

  // ── Programs list view ──
  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text }}>

      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <div style={{ width:16, height:3, background:C.gold, borderRadius:2 }} />
          <span style={{ fontSize:10, fontWeight:700, color:C.gold, letterSpacing:'2px', textTransform:'uppercase' }}>Project Monitoring</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:C.navy, margin:0 }}>Programs</h1>
            <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>Programs contain projects, projects contain activities. Budget rolls up automatically.</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{
            padding:'9px 16px', background:C.navy, color:C.white, border:'none',
            borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
          }}>+ New Program</button>
        </div>
      </div>

      {msg && <div style={{ background:C.greenL, border:`1px solid #BBF7D0`, color:C.green, padding:'10px 16px', borderRadius:6, marginBottom:16, fontSize:13, fontWeight:600 }}>✓ {msg}</div>}

      {showForm && <ProgramForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); flash('Program created.') }} />}

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:C.faint }}>Loading programs...</div>
      ) : programs.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, background:C.white, border:`1px dashed ${C.border}`, borderRadius:12 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
          <p style={{ fontSize:14, fontWeight:600, color:C.text, margin:'0 0 4px' }}>No programs yet</p>
          <p style={{ fontSize:12, color:C.muted, margin:0 }}>Create your first program to start organizing projects and activities.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16 }}>
          {programs.map(p => (
            <div key={p._id} onClick={() => openProgram(p._id)} style={{
              background:C.white, border:`1px solid ${C.border}`, borderRadius:12,
              padding:20, cursor:'pointer', transition:'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor=C.navy }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=C.border }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <span style={{ fontSize:10, fontWeight:700, color:C.violet, background:C.violetL, padding:'3px 10px', borderRadius:999, textTransform:'uppercase', letterSpacing:'0.3px' }}>
                  {p.category || 'Program'}
                </span>
                <StatusChip status={p.status} />
              </div>
              <h3 style={{ fontSize:16, fontWeight:700, color:C.text, margin:'0 0 6px' }}>{p.title}</h3>
              <p style={{ fontSize:12, color:C.muted, margin:'0 0 14px', lineHeight:1.5, minHeight:34 }}>
                {p.description ? (p.description.length > 90 ? p.description.slice(0,90)+'...' : p.description) : 'No description'}
              </p>
              <ProgressBar used={p.totalProjectCost} total={p.totalBudget} />
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.navy, fontWeight:600 }}>
                View projects & activities →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM DETAIL — shows projects and activities
// ═══════════════════════════════════════════════════════════════════════════════
function ProgramDetail({ data, onBack, onChange, flash, msg }) {
  const { program, projects } = data
  const [showProjForm, setShowProjForm] = useState(false)
  const [expandedProj, setExpandedProj] = useState(null)

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text }}>

      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, color:C.muted, marginBottom:16, padding:0 }}>
        ← Back to Programs
      </button>

      {msg && <div style={{ background:C.greenL, border:`1px solid #BBF7D0`, color:C.green, padding:'10px 16px', borderRadius:6, marginBottom:16, fontSize:13, fontWeight:600 }}>✓ {msg}</div>}

      {/* Program header card */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:24, marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <div>
            <span style={{ fontSize:10, fontWeight:700, color:C.violet, background:C.violetL, padding:'3px 10px', borderRadius:999, textTransform:'uppercase' }}>{program.category}</span>
            <h1 style={{ fontSize:24, fontWeight:800, color:C.navy, margin:'10px 0 6px' }}>{program.title}</h1>
            <p style={{ fontSize:13, color:C.muted, margin:0, maxWidth:600, lineHeight:1.5 }}>{program.description}</p>
          </div>
          <StatusChip status={program.status} />
        </div>

        {/* Budget summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:20 }}>
          {[
            { label:'Total Budget',   value:peso(program.totalBudget),      color:C.navy  },
            { label:'Allocated Cost', value:peso(program.totalProjectCost), color:C.amber },
            { label:'Remaining',      value:peso(program.totalBudget - program.totalProjectCost), color:C.green },
          ].map((s,i) => (
            <div key={i} style={{ background:C.bg, borderRadius:8, padding:'14px 16px' }}>
              <div style={{ fontSize:10, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Fund sources */}
        {program.fundSources?.length > 0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:8 }}>Fund Sources</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {program.fundSources.map((f,i) => (
                <div key={i} style={{ background:C.greenL, border:`1px solid #BBF7D0`, borderRadius:6, padding:'6px 12px', fontSize:11 }}>
                  <span style={{ fontWeight:600, color:C.text }}>{f.source}</span>
                  <span style={{ color:C.green, fontWeight:700, marginLeft:8 }}>{peso(f.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Program progress photos */}
        <PhotoStrip type="program" id={program._id} photos={program.photos} canEdit={true} onChange={onChange} />
      </div>

      {/* Projects section */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <h2 style={{ fontSize:16, fontWeight:700, color:C.text, margin:0 }}>Projects <span style={{ color:C.faint, fontWeight:600 }}>({projects?.length || 0})</span></h2>
        <button onClick={() => setShowProjForm(true)} style={{ padding:'8px 14px', background:C.white, color:C.navy, border:`1px solid ${C.navy}`, borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer' }}>+ Add Project</button>
      </div>

      {showProjForm && <ProjectForm programId={program._id} onClose={() => setShowProjForm(false)} onSaved={() => { setShowProjForm(false); onChange(); flash('Project added.') }} />}

      {(!projects || projects.length === 0) ? (
        <div style={{ textAlign:'center', padding:40, background:C.white, border:`1px dashed ${C.border}`, borderRadius:12, color:C.faint, fontSize:13 }}>
          No projects yet. Add your first project to this program.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {projects.map(proj => (
            <ProjectCard key={proj._id} project={proj} expanded={expandedProj === proj._id}
              onToggle={() => setExpandedProj(expandedProj === proj._id ? null : proj._id)}
              onChange={onChange} flash={flash} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Project card with expandable activities ──
function ProjectCard({ project, expanded, onToggle, onChange, flash }) {
  const [activities, setActivities] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showActForm, setShowActForm] = useState(false)

  useEffect(() => {
    if (expanded && !loaded) {
      axios.get(`${API}/programs/projects/${project._id}/activities`)
        .then(r => { setActivities(r.data.activities); setLoaded(true) })
    }
  }, [expanded, loaded, project._id])

  const reloadActs = () => {
    axios.get(`${API}/programs/projects/${project._id}/activities`)
      .then(r => setActivities(r.data.activities))
  }

  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
      <div onClick={onToggle} style={{ padding:18, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <span style={{ fontSize:14, transform: expanded ? 'rotate(90deg)' : 'none', transition:'transform 0.2s', color:C.muted }}>▶</span>
            <h3 style={{ fontSize:15, fontWeight:700, color:C.text, margin:0 }}>{project.title}</h3>
            <StatusChip status={project.status} />
          </div>
          {project.description && <p style={{ fontSize:12, color:C.muted, margin:'0 0 0 24px', lineHeight:1.4 }}>{project.description}</p>}
        </div>
        <div style={{ textAlign:'right', minWidth:120 }}>
          <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>Activity Cost</div>
          <div style={{ fontSize:16, fontWeight:800, color:C.navy }}>{peso(project.totalActivityCost)}</div>
          {project.allocatedBudget > 0 && <div style={{ fontSize:10, color:C.faint }}>of {peso(project.allocatedBudget)}</div>}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:`1px solid ${C.border}`, background:C.bg, padding:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:12, fontWeight:700, color:C.text }}>Activities ({activities.length})</span>
            <button onClick={() => setShowActForm(true)} style={{ padding:'6px 12px', background:C.white, color:C.navy, border:`1px solid ${C.border}`, borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>+ Add Activity</button>
          </div>

          {showActForm && <ActivityForm projectId={project._id} onClose={() => setShowActForm(false)} onSaved={() => { setShowActForm(false); reloadActs(); onChange(); flash('Activity added.') }} />}

          {activities.length === 0 ? (
            <p style={{ fontSize:12, color:C.faint, textAlign:'center', padding:16 }}>No activities yet.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {activities.map(act => (
                <div key={act._id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{act.title}</span>
                      <StatusChip status={act.status} />
                    </div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>
                      {act.type} · {act.totalDays} day{act.totalDays>1?'s':''} · {act.totalPoints} pts
                      {act.venue && ` · ${act.venue}`}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{peso(act.estimatedCost)}</div>
                    <div style={{ fontSize:10, color:C.faint }}>estimated</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Photo strip: shows PPA progress photos + upload button ──
function PhotoStrip({ type, id, photos = [], canEdit, onChange }) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef(null)

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const { data } = await axios.post(`${API}/upload/photo`, fd, { headers:{'Content-Type':'multipart/form-data'} })
      await axios.post(`${API}/programs/${type}/${id}/photos`, { url: data.url })
      onChange && onChange()
    } catch(e){ alert('Upload failed: '+(e.response?.data?.message||e.message)) }
    finally { setUploading(false) }
  }

  const removePhoto = async (photoId) => {
    if (!confirm('Remove this photo?')) return
    try { await axios.delete(`${API}/programs/${type}/${id}/photos/${photoId}`); onChange && onChange() }
    catch{ alert('Failed to remove') }
  }

  return (
    <div style={{ marginTop:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.4px' }}>Progress Photos ({photos.length})</span>
        {canEdit && (
          <label style={{ fontSize:11, fontWeight:600, color:C.navy, cursor:'pointer' }}>
            {uploading?'Uploading…':'+ Add Photo'}
            <input ref={ref} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>upload(e.target.files[0])} />
          </label>
        )}
      </div>
      {photos.length === 0
        ? <div style={{ fontSize:11.5, color:C.faint, fontStyle:'italic', padding:'10px 0' }}>No photos yet. {canEdit && 'Add photos so kabataan can see the progress.'}</div>
        : <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {photos.map(p => (
              <div key={p._id} style={{ position:'relative', width:90, height:90, borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}` }}>
                <img src={p.url} alt={p.caption||'progress'} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                {canEdit && <button onClick={()=>removePhoto(p._id)} style={{ position:'absolute', top:3, right:3, width:20, height:20, borderRadius:'50%', border:'none', background:'rgba(0,0,0,0.6)', color:'#fff', fontSize:12, cursor:'pointer', lineHeight:1 }}>×</button>}
              </div>
            ))}
          </div>}
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.white, borderRadius:12, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:C.white }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:C.navy, margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:C.muted, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  )
}

const field = { width:'100%', padding:'9px 12px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl   = { fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:5 }
const btn   = { padding:'10px 20px', background:C.navy, color:C.white, border:'none', borderRadius:6, fontSize:13, fontWeight:700, cursor:'pointer', width:'100%', marginTop:4 }

function ProgramForm({ onClose, onSaved }) {
  const [f, setF] = useState({ title:'', description:'', category:'Youth Development', status:'planned', startDate:'', endDate:'' })
  const [funds, setFunds] = useState([{ source:'Barangay Allocation', amount:'' }])
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const fundSources = funds.filter(x => x.source && x.amount).map(x => ({ source:x.source, amount:Number(x.amount) }))
      await axios.post(`${API}/programs`, { ...f, fundSources })
      onSaved()
    } catch(e) { alert(e.response?.data?.message || 'Error') } finally { setSaving(false) }
  }

  return (
    <Modal title="New Program" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div><label style={lbl}>Program Title</label><input style={field} value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="e.g. Youth Health & Wellness Program" /></div>
        <div><label style={lbl}>Description</label><textarea style={{...field, minHeight:70, resize:'vertical'}} value={f.description} onChange={e=>setF({...f,description:e.target.value})} /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={lbl}>Category</label>
            <select style={field} value={f.category} onChange={e=>setF({...f,category:e.target.value})}>
              {['Youth Development','Health','Livelihood','Education','Environment','Sports','Peace and Order','Other'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Status</label>
            <select style={field} value={f.status} onChange={e=>setF({...f,status:e.target.value})}>
              {['planned','ongoing','completed','cancelled'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={lbl}>Start Date</label><input type="date" style={field} value={f.startDate} onChange={e=>setF({...f,startDate:e.target.value})} /></div>
          <div><label style={lbl}>End Date</label><input type="date" style={field} value={f.endDate} onChange={e=>setF({...f,endDate:e.target.value})} /></div>
        </div>

        {/* Fund sources */}
        <div>
          <label style={lbl}>Fund Sources</label>
          {funds.map((fund,i) => (
            <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
              <input style={{...field, flex:2}} placeholder="Source" value={fund.source} onChange={e=>{ const c=[...funds]; c[i].source=e.target.value; setFunds(c) }} />
              <input style={{...field, flex:1}} type="number" placeholder="₱ Amount" value={fund.amount} onChange={e=>{ const c=[...funds]; c[i].amount=e.target.value; setFunds(c) }} />
              {funds.length > 1 && <button onClick={()=>setFunds(funds.filter((_,x)=>x!==i))} style={{ border:'none', background:C.redL, color:C.red, borderRadius:6, padding:'0 12px', cursor:'pointer', fontWeight:700 }}>×</button>}
            </div>
          ))}
          <button onClick={()=>setFunds([...funds,{source:'',amount:''}])} style={{ background:'none', border:`1px dashed ${C.border}`, borderRadius:6, padding:'8px', width:'100%', fontSize:12, color:C.muted, cursor:'pointer', fontWeight:600 }}>+ Add Fund Source</button>
        </div>

        <button onClick={save} disabled={saving || !f.title} style={{...btn, opacity: saving||!f.title ? 0.6 : 1}}>{saving ? 'Creating...' : 'Create Program'}</button>
      </div>
    </Modal>
  )
}

function ProjectForm({ programId, onClose, onSaved }) {
  const [f, setF] = useState({ title:'', description:'', status:'planned', allocatedBudget:'', startDate:'', endDate:'' })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try { await axios.post(`${API}/programs/${programId}/projects`, {...f, allocatedBudget:Number(f.allocatedBudget)||0}); onSaved() }
    catch(e){ alert(e.response?.data?.message||'Error') } finally { setSaving(false) }
  }
  return (
    <Modal title="Add Project" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div><label style={lbl}>Project Title</label><input style={field} value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="e.g. Community Feeding Program" /></div>
        <div><label style={lbl}>Description</label><textarea style={{...field,minHeight:60,resize:'vertical'}} value={f.description} onChange={e=>setF({...f,description:e.target.value})} /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={lbl}>Status</label>
            <select style={field} value={f.status} onChange={e=>setF({...f,status:e.target.value})}>
              {['planned','ongoing','completed','cancelled'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Allocated Budget</label><input type="number" style={field} value={f.allocatedBudget} onChange={e=>setF({...f,allocatedBudget:e.target.value})} placeholder="₱ 0" /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={lbl}>Start Date</label><input type="date" style={field} value={f.startDate} onChange={e=>setF({...f,startDate:e.target.value})} /></div>
          <div><label style={lbl}>End Date</label><input type="date" style={field} value={f.endDate} onChange={e=>setF({...f,endDate:e.target.value})} /></div>
        </div>
        <button onClick={save} disabled={saving||!f.title} style={{...btn, opacity:saving||!f.title?0.6:1}}>{saving?'Adding...':'Add Project'}</button>
      </div>
    </Modal>
  )
}

function ActivityForm({ projectId, onClose, onSaved }) {
  const [f, setF] = useState({ title:'', description:'', type:'Meeting', startDate:'', endDate:'', venue:'', estimatedCost:'', pointsPerDay:'' })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try {
      await axios.post(`${API}/programs/projects/${projectId}/activities`, {
        ...f, estimatedCost:Number(f.estimatedCost)||0, pointsPerDay:Number(f.pointsPerDay)||0
      })
      onSaved()
    } catch(e){ alert(e.response?.data?.message||'Error') } finally { setSaving(false) }
  }
  return (
    <Modal title="Add Activity" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div><label style={lbl}>Activity Title</label><input style={field} value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="e.g. Distribution of Goods" /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={lbl}>Type</label>
            <select style={field} value={f.type} onChange={e=>setF({...f,type:e.target.value})}>
              {['Meeting','Workshop','Community Service','Training','Sports','Health','Livelihood','Other'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Venue</label><input style={field} value={f.venue} onChange={e=>setF({...f,venue:e.target.value})} placeholder="Location" /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={lbl}>Start Date</label><input type="date" style={field} value={f.startDate} onChange={e=>setF({...f,startDate:e.target.value})} /></div>
          <div><label style={lbl}>End Date</label><input type="date" style={field} value={f.endDate} onChange={e=>setF({...f,endDate:e.target.value})} /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={lbl}>Estimated Cost</label><input type="number" style={field} value={f.estimatedCost} onChange={e=>setF({...f,estimatedCost:e.target.value})} placeholder="₱ 0" /></div>
          <div><label style={lbl}>Points Per Day</label><input type="number" style={field} value={f.pointsPerDay} onChange={e=>setF({...f,pointsPerDay:e.target.value})} placeholder="0" /></div>
        </div>
        <p style={{ fontSize:11, color:C.muted, margin:0, background:C.bg, padding:'8px 12px', borderRadius:6 }}>
          💡 Points are prorated by attendance. If activity is 3 days at 10 pts/day (30 total), attending 2 days earns 20 pts.
        </p>
        <button onClick={save} disabled={saving||!f.title||!f.startDate||!f.endDate} style={{...btn, opacity:saving||!f.title||!f.startDate||!f.endDate?0.6:1}}>{saving?'Adding...':'Add Activity'}</button>
      </div>
    </Modal>
  )
}