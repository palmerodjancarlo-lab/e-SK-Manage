// kabataan/Transparency.jsx — simple, honest budget view for youth
// Shows: SK's total fund on hand, then how each Program/Project/Activity uses budget
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const C = {
  bg:'#F4F6FB', card:'#fff', ink:'#0F1F5C', slate:'#64748B', faint:'#94A3B8',
  line:'#EAEDF3', indigo:'#4F46E5', violet:'#7C3AED', emerald:'#059669', amber:'#D97706', rose:'#E11D48', sky:'#0284C7', teal:'#0891B2',
}
const peso = n => `₱${Number(n||0).toLocaleString('en-PH')}`
const STATUS = {
  planned:{ l:'Planned', c:C.amber, bg:'#FFFBEB' }, ongoing:{ l:'Ongoing', c:C.sky, bg:'#F0F9FF' },
  completed:{ l:'Completed', c:C.emerald, bg:'#ECFDF5' }, cancelled:{ l:'Cancelled', c:C.rose, bg:'#FFF1F3' },
}

export default function KabataanTransparency() {
  const [summary,setSummary]=useState(null)
  const [programs,setPrograms]=useState([])
  const [expanded,setExpanded]=useState(null)
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    Promise.all([
      axios.get(`${API}/finance/summary`).catch(()=>({data:null})),
      axios.get(`${API}/programs`).catch(()=>({data:{programs:[]}})),
    ]).then(([s,p])=>{
      if(!active) return
      setSummary(s.data)
      setPrograms(p.data.programs||[])
    }).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  const openProgram=async(id)=>{
    if(expanded?.program?._id===id){ setExpanded(null); return }
    try{ const r=await axios.get(`${API}/programs/${id}`); setExpanded(r.data) }catch{ /* ignore */ }
  }

  if(loading) return <Loader/>

  const totalBudget = programs.reduce((s,p)=>s+(p.totalBudget||0),0)
  const totalUsed   = programs.reduce((s,p)=>s+(p.totalProjectCost||0),0)

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','Inter',sans-serif", color:C.ink }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0891B2,#059669)', padding:'24px 20px', color:'#fff' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>SK Budget 💰</h1>
        <p style={{ fontSize:12.5, opacity:0.9, margin:'3px 0 0' }}>See the SK funds and where every peso goes — full transparency, no secrets.</p>
      </div>

      <div style={{ padding:16 }}>

        {/* Fund on hand — the main number */}
        <div style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', borderRadius:20, padding:22, color:'#fff', marginBottom:14, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', right:-20, top:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
          <div style={{ position:'relative' }}>
            <p style={{ fontSize:12.5, opacity:0.85, margin:0, fontWeight:600 }}>💵 SK Funds Available Now</p>
            <p style={{ fontSize:34, fontWeight:800, margin:'6px 0 0' }}>{peso(summary?.balance)}</p>
            <div style={{ display:'flex', gap:16, marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.2)' }}>
              <div>
                <p style={{ fontSize:11, opacity:0.8, margin:0 }}>Total received</p>
                <p style={{ fontSize:15, fontWeight:700, margin:'2px 0 0' }}>{peso(summary?.totalFunds)}</p>
              </div>
              <div>
                <p style={{ fontSize:11, opacity:0.8, margin:0 }}>Total spent</p>
                <p style={{ fontSize:15, fontWeight:700, margin:'2px 0 0' }}>{peso(summary?.totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Where funds come from */}
        {summary?.fundsBySource?.length>0 && (
          <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:16, marginBottom:14 }}>
            <p style={{ fontSize:13.5, fontWeight:800, margin:'0 0 12px' }}>Where the funds come from</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {summary.fundsBySource.map((f,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:16 }}>{f._id==='barangay_allocation'?'🏛️':f._id==='donation'?'🎁':f._id==='grant'?'📜':'💵'}</span>
                  <span style={{ fontSize:13, color:C.slate, flex:1, textTransform:'capitalize' }}>{(f._id||'other').replace(/_/g,' ')}</span>
                  <span style={{ fontSize:14, fontWeight:800, color:C.emerald }}>{peso(f.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PPA budget breakdown ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'20px 0 12px' }}>
          <h2 style={{ fontSize:16, fontWeight:800, margin:0 }}>Program Budgets</h2>
          {totalBudget>0 && <span style={{ fontSize:11.5, color:C.slate, fontWeight:600 }}>{peso(totalUsed)} used of {peso(totalBudget)}</span>}
        </div>

        {programs.length===0
          ? <Empty emoji="📋" text="No programs yet" sub="Budget breakdown will show here once the SK adds programs."/>
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {programs.map(p=>{
                const st=STATUS[p.status]||STATUS.planned
                const pct=p.totalBudget>0?Math.min(100,Math.round((p.totalProjectCost/p.totalBudget)*100)):0
                const isOpen=expanded?.program?._id===p._id
                return (
                  <div key={p._id} style={{ background:C.card, border:`1px solid ${isOpen?C.indigo:C.line}`, borderRadius:16, overflow:'hidden' }}>
                    {/* program header */}
                    <div onClick={()=>openProgram(p._id)} style={{ padding:16, cursor:'pointer' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                            <span style={{ fontSize:14, transform:isOpen?'rotate(90deg)':'none', transition:'transform 0.2s', color:C.faint, display:'inline-block' }}>▶</span>
                            <p style={{ fontSize:15, fontWeight:800, margin:0 }}>{p.title}</p>
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:999, background:st.bg, color:st.c, marginLeft:22 }}>{st.l}</span>
                        </div>
                      </div>
                      {/* budget bar */}
                      <div style={{ marginLeft:22 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginBottom:5 }}>
                          <span style={{ color:C.slate, fontWeight:600 }}>Budget used</span>
                          <span style={{ color:C.ink, fontWeight:700 }}>{peso(p.totalProjectCost)} / {peso(p.totalBudget)}</span>
                        </div>
                        <div style={{ height:8, background:'#EEF0F7', borderRadius:999, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: pct>90?'linear-gradient(90deg,#E11D48,#F43F5E)':'linear-gradient(90deg,#4F46E5,#7C3AED)', borderRadius:999, transition:'width 0.5s' }}/>
                        </div>
                        <p style={{ fontSize:10.5, color:C.faint, margin:'5px 0 0' }}>Tap to see projects & activities →</p>
                      </div>
                    </div>

                    {/* expanded: projects → activities */}
                    {isOpen && (
                      <div style={{ borderTop:`1px solid ${C.line}`, background:C.bg, padding:16 }}>
                        {(!expanded.projects||expanded.projects.length===0)
                          ? <p style={{ fontSize:12.5, color:C.faint, textAlign:'center', padding:12 }}>No projects in this program yet.</p>
                          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                              {expanded.projects.map(proj=>(
                                <ProjectBlock key={proj._id} project={proj} />
                              ))}
                            </div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>}

        <div style={{ marginTop:16, background:'#ECFDF5', borderRadius:14, padding:'14px 16px', fontSize:12.5, color:C.emerald, lineHeight:1.5 }}>
          ✅ Every peso the SK receives and spends is recorded here. Tap any program to see exactly how the budget is used down to each activity.
        </div>
      </div>
    </div>
  )
}

// Project block that loads its activities on demand
function ProjectBlock({ project }) {
  const [activities,setActivities]=useState([])
  const [open,setOpen]=useState(false)
  const [loaded,setLoaded]=useState(false)

  const toggle=async()=>{
    setOpen(!open)
    if(!loaded){
      try{ const r=await axios.get(`${API}/programs/projects/${project._id}/activities`); setActivities(r.data.activities||[]); setLoaded(true) }catch{ /* ignore */ }
    }
  }
  const pct=project.allocatedBudget>0?Math.min(100,Math.round((project.totalActivityCost/project.allocatedBudget)*100)):0

  return (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, overflow:'hidden' }}>
      <div onClick={toggle} style={{ padding:'12px 14px', cursor:'pointer' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:11, color:C.faint, transform:open?'rotate(90deg)':'none', transition:'transform 0.2s', display:'inline-block' }}>▶</span>
            <span style={{ fontSize:13.5, fontWeight:700 }}>{project.title}</span>
          </div>
          <span style={{ fontSize:13, fontWeight:800, color:C.indigo }}>{peso(project.totalActivityCost)}</span>
        </div>
        {project.allocatedBudget>0 && (
          <div style={{ marginLeft:18, marginTop:6 }}>
            <div style={{ height:5, background:'#EEF0F7', borderRadius:999, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:C.violet, borderRadius:999 }}/>
            </div>
            <p style={{ fontSize:10, color:C.faint, margin:'4px 0 0' }}>Allocated: {peso(project.allocatedBudget)}</p>
          </div>
        )}
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${C.line}`, padding:'10px 14px', background:C.bg }}>
          {activities.length===0
            ? <p style={{ fontSize:11.5, color:C.faint, textAlign:'center', padding:6 }}>No activities recorded.</p>
            : <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {activities.map(a=>(
                  <div key={a._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, fontSize:12 }}>
                    <div style={{ flex:1 }}>
                      <span style={{ fontWeight:600 }}>{a.title}</span>
                      <span style={{ color:C.faint, marginLeft:6, fontSize:10.5 }}>{a.type}</span>
                    </div>
                    <span style={{ fontWeight:700, color:C.slate }}>{peso(a.actualCost||a.estimatedCost)}</span>
                  </div>
                ))}
              </div>}
        </div>
      )}
    </div>
  )
}

function Empty({ emoji, text, sub }) {
  return <div style={{ textAlign:'center', padding:'40px 20px', background:'#fff', border:'1px dashed #EAEDF3', borderRadius:16 }}><div style={{ fontSize:36, marginBottom:8 }}>{emoji}</div><p style={{ fontSize:14, fontWeight:700, margin:'0 0 4px' }}>{text}</p>{sub&&<p style={{ fontSize:12, color:'#94A3B8', margin:0 }}>{sub}</p>}</div>
}
function Loader() {
  return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'70vh' }}><div style={{ width:32, height:32, border:'3px solid #EAEDF3', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div>
}