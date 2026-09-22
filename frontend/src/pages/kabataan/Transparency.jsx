// kabataan/Transparency.jsx — budget view for youth
import { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme-utils'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const peso = n => `\u20B1${Number(n||0).toLocaleString('en-PH')}`
const STATUS = { planned:'amber', ongoing:'sky', completed:'green', cancelled:'red' }

export default function KabataanTransparency() {
  const { T } = useTheme()
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
      setSummary(s.data); setPrograms(p.data.programs||[])
    }).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  const openProgram=async(id)=>{
    if(expanded?.program?._id===id){ setExpanded(null); return }
    try{ const r=await axios.get(`${API}/programs/${id}`); setExpanded(r.data) }catch{ /* ignore */ }
  }
  const statusColor=(s)=>({ amber:T.amber, sky:T.sky, green:T.green, red:T.red }[STATUS[s]||'amber'])

  if(loading) return <Loader T={T}/>

  const totalBudget = programs.reduce((s,p)=>s+(p.totalBudget||0),0)
  const totalUsed   = programs.reduce((s,p)=>s+(p.totalProjectCost||0),0)

  return (
    <div>
      <div style={{ background:`linear-gradient(135deg,${T.green},${T.sky})`, padding:'24px 20px', color:'#fff', borderRadius:'0 0 20px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>SK Budget 💰</h1>
        <p style={{ fontSize:12.5, opacity:0.9, margin:'3px 0 0' }}>See where every peso goes — full transparency.</p>
      </div>

      <div style={{ padding:16 }}>
        {/* Fund on hand */}
        <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, borderRadius:18, padding:20, color:'#fff', marginBottom:14 }}>
          <p style={{ fontSize:12.5, opacity:0.85, margin:0, fontWeight:600 }}>💵 SK Funds Available Now</p>
          <p style={{ fontSize:32, fontWeight:800, margin:'6px 0 0' }}>{peso(summary?.balance)}</p>
          <div style={{ display:'flex', gap:16, marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.2)' }}>
            <div><p style={{ fontSize:11, opacity:0.8, margin:0 }}>Total received</p><p style={{ fontSize:15, fontWeight:700, margin:'2px 0 0' }}>{peso(summary?.totalFunds)}</p></div>
            <div><p style={{ fontSize:11, opacity:0.8, margin:0 }}>Total spent</p><p style={{ fontSize:15, fontWeight:700, margin:'2px 0 0' }}>{peso(summary?.totalExpenses)}</p></div>
          </div>
        </div>

        {/* Fund sources */}
        {summary?.fundsBySource?.length>0 && (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:16, marginBottom:14, boxShadow:T.shadow }}>
            <p style={{ fontSize:13.5, fontWeight:800, margin:'0 0 12px', color:T.text }}>Where the funds come from</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {summary.fundsBySource.map((f,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:16 }}>{f._id==='barangay_allocation'?'🏛️':f._id==='donation'?'🎁':f._id==='grant'?'📜':'💵'}</span>
                  <span style={{ fontSize:13, color:T.text2, flex:1, textTransform:'capitalize' }}>{(f._id||'other').replace(/_/g,' ')}</span>
                  <span style={{ fontSize:14, fontWeight:800, color:T.green }}>{peso(f.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Program budgets */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'20px 0 12px' }}>
          <h2 style={{ fontSize:16, fontWeight:800, margin:0, color:T.text }}>Program Budgets</h2>
          {totalBudget>0 && <span style={{ fontSize:11.5, color:T.text3, fontWeight:600 }}>{peso(totalUsed)} of {peso(totalBudget)}</span>}
        </div>

        {programs.length===0
          ? <Empty T={T} emoji="📋" text="No programs yet"/>
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {programs.map(p=>{
                const pct=p.totalBudget>0?Math.min(100,Math.round((p.totalProjectCost/p.totalBudget)*100)):0
                const isOpen=expanded?.program?._id===p._id
                return (
                  <div key={p._id} style={{ background:T.surface, border:`1px solid ${isOpen?T.accent:T.border}`, borderRadius:16, overflow:'hidden', boxShadow:T.shadow }}>
                    <div onClick={()=>openProgram(p._id)} style={{ padding:16, cursor:'pointer' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:14, transform:isOpen?'rotate(90deg)':'none', transition:'transform 0.2s', color:T.text3, display:'inline-block' }}>▶</span>
                        <p style={{ fontSize:15, fontWeight:800, margin:0, color:T.text, flex:1 }}>{p.title}</p>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:999, background:statusColor(p.status)+'18', color:statusColor(p.status), textTransform:'capitalize' }}>{p.status}</span>
                      </div>
                      <div style={{ marginLeft:22 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginBottom:5 }}>
                          <span style={{ color:T.text2, fontWeight:600 }}>Budget used</span>
                          <span style={{ color:T.text, fontWeight:700 }}>{peso(p.totalProjectCost)} / {peso(p.totalBudget)}</span>
                        </div>
                        <div style={{ height:8, background:T.surface2, borderRadius:999, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: pct>90?`linear-gradient(90deg,${T.red},#F87171)`:`linear-gradient(90deg,${T.accent},${T.violet})`, borderRadius:999, transition:'width 0.5s' }}/>
                        </div>
                        <p style={{ fontSize:10.5, color:T.text3, margin:'5px 0 0' }}>Tap to see projects & activities →</p>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ borderTop:`1px solid ${T.border}`, background:T.surface2, padding:16 }}>
                        {(!expanded.projects||expanded.projects.length===0)
                          ? <p style={{ fontSize:12.5, color:T.text3, textAlign:'center', padding:12 }}>No projects yet.</p>
                          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                              {expanded.projects.map(proj=><ProjectBlock key={proj._id} project={proj} T={T} />)}
                            </div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>}

        <div style={{ marginTop:16, background:T.greenSoft, borderRadius:14, padding:'14px 16px', fontSize:12.5, color:T.green, lineHeight:1.5 }}>
          ✅ Every peso the SK receives and spends is recorded here. Tap any program to see how the budget is used down to each activity.
        </div>
      </div>
    </div>
  )
}
function ProjectBlock({ project, T }) {
  const [activities,setActivities]=useState([])
  const [open,setOpen]=useState(false)
  const [loaded,setLoaded]=useState(false)
  const peso = n => `\u20B1${Number(n||0).toLocaleString('en-PH')}`

  const toggle=async()=>{
    setOpen(!open)
    if(!loaded){
      try{ const r=await axios.get(`${API}/programs/projects/${project._id}/activities`); setActivities(r.data.activities||[]); setLoaded(true) }catch{ /* ignore */ }
    }
  }
  const pct=project.allocatedBudget>0?Math.min(100,Math.round((project.totalActivityCost/project.allocatedBudget)*100)):0

  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
      <div onClick={toggle} style={{ padding:'12px 14px', cursor:'pointer' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ fontSize:11, color:T.text3, transform:open?'rotate(90deg)':'none', transition:'transform 0.2s', display:'inline-block' }}>▶</span>
            <span style={{ fontSize:13.5, fontWeight:700, color:T.text }}>{project.title}</span>
          </div>
          <span style={{ fontSize:13, fontWeight:800, color:T.accent }}>{peso(project.totalActivityCost)}</span>
        </div>
        {project.allocatedBudget>0 && (
          <div style={{ marginLeft:18, marginTop:6 }}>
            <div style={{ height:5, background:T.surface2, borderRadius:999, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:T.violet, borderRadius:999 }}/>
            </div>
            <p style={{ fontSize:10, color:T.text3, margin:'4px 0 0' }}>Allocated: {peso(project.allocatedBudget)}</p>
          </div>
        )}
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:'10px 14px', background:T.surface2 }}>
          {activities.length===0
            ? <p style={{ fontSize:11.5, color:T.text3, textAlign:'center', padding:6 }}>No activities recorded.</p>
            : <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {activities.map(a=>(
                  <div key={a._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, fontSize:12 }}>
                    <div style={{ flex:1 }}><span style={{ fontWeight:600, color:T.text }}>{a.title}</span><span style={{ color:T.text3, marginLeft:6, fontSize:10.5 }}>{a.type}</span></div>
                    <span style={{ fontWeight:700, color:T.text2 }}>{peso(a.actualCost||a.estimatedCost)}</span>
                  </div>
                ))}
              </div>}
        </div>
      )}
    </div>
  )
}
function Empty({ T, emoji, text }) { return <div style={{ textAlign:'center', padding:'40px 20px', background:T.surface, border:`1px dashed ${T.border}`, borderRadius:16 }}><div style={{ fontSize:36, marginBottom:8 }}>{emoji}</div><p style={{ fontSize:14, fontWeight:700, margin:0, color:T.text }}>{text}</p></div> }
function Loader({ T }) { return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'70vh' }}><div style={{ width:32, height:32, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div> }