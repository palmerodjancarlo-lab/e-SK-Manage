// kabataan/Programs.jsx — view SK programs & progress photos
import { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme-utils'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const peso=n=>`\u20B1${Number(n||0).toLocaleString('en-PH')}`
const STATUS={ planned:'amber', ongoing:'sky', completed:'green', cancelled:'red' }

export default function KabataanPrograms() {
  const { T } = useTheme()
  const [programs,setPrograms]=useState([])
  const [selected,setSelected]=useState(null)
  const [loading,setLoading]=useState(true)
  const [lightbox,setLightbox]=useState(null)

  useEffect(()=>{
    let active=true
    axios.get(`${API}/programs`).then(r=>{ if(active) setPrograms(r.data.programs||[]) }).catch(()=>{}).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  const openProgram=async(id)=>{ try{ const r=await axios.get(`${API}/programs/${id}`); setSelected(r.data) }catch{ /* ignore */ } }
  const statusColor=(s)=>({ amber:T.amber, sky:T.sky, green:T.green, red:T.red }[STATUS[s]||'amber'])
  const statusBg=(s)=>({ amber:T.amberSoft, sky:T.skySoft, green:T.greenSoft, red:T.redSoft }[STATUS[s]||'amber'])

  if(loading) return <Loader T={T}/>

  // Detail view
  if(selected){
    const { program, projects }=selected
    return (
      <div>
        <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, padding:'18px 20px 24px', color:'#fff', borderRadius:'0 0 20px 20px' }}>
          <button onClick={()=>setSelected(null)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', fontSize:13, fontWeight:700, padding:'7px 14px', borderRadius:10, cursor:'pointer', marginBottom:14 }}>← Back</button>
          <span style={{ fontSize:11, fontWeight:700, background:'rgba(255,255,255,0.2)', padding:'3px 10px', borderRadius:999 }}>{program.category}</span>
          <h1 style={{ fontSize:22, fontWeight:800, margin:'10px 0 6px' }}>{program.title}</h1>
          <p style={{ fontSize:13, opacity:0.85, margin:0, lineHeight:1.5 }}>{program.description}</p>
        </div>

        <div style={{ padding:16 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:18, marginBottom:16, boxShadow:T.shadow }}>
            <p style={{ fontSize:12, fontWeight:700, color:T.text3, textTransform:'uppercase', letterSpacing:'0.5px', margin:'0 0 12px' }}>Budget</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ background:T.surface2, borderRadius:12, padding:'12px 14px' }}>
                <p style={{ fontSize:11, color:T.text3, margin:0 }}>Total Budget</p>
                <p style={{ fontSize:18, fontWeight:800, color:T.accent, margin:'3px 0 0' }}>{peso(program.totalBudget)}</p>
              </div>
              <div style={{ background:T.surface2, borderRadius:12, padding:'12px 14px' }}>
                <p style={{ fontSize:11, color:T.text3, margin:0 }}>Used</p>
                <p style={{ fontSize:18, fontWeight:800, color:T.amber, margin:'3px 0 0' }}>{peso(program.totalProjectCost)}</p>
              </div>
            </div>
          </div>

          {program.photos?.length>0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:15, fontWeight:800, margin:'0 0 10px', color:T.text }}>📸 Progress Photos</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {program.photos.map((ph,i)=>(
                  <div key={i} onClick={()=>setLightbox(ph.url)} style={{ aspectRatio:'1', borderRadius:12, background:`url(${ph.url}) center/cover`, cursor:'pointer', border:`1px solid ${T.border}` }}/>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize:15, fontWeight:800, margin:'0 0 10px', color:T.text }}>Projects ({projects?.length||0})</p>
          {(!projects||projects.length===0)
            ? <Empty T={T} emoji="📋" text="No projects yet"/>
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {projects.map(p=>(
                  <div key={p._id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:16, boxShadow:T.shadow }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:6 }}>
                      <p style={{ fontSize:14.5, fontWeight:700, margin:0, color:T.text }}>{p.title}</p>
                      <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:999, background:statusBg(p.status), color:statusColor(p.status), whiteSpace:'nowrap', textTransform:'capitalize' }}>{p.status}</span>
                    </div>
                    {p.description && <p style={{ fontSize:12.5, color:T.text2, margin:'0 0 8px', lineHeight:1.5 }}>{p.description}</p>}
                    {p.photos?.length>0 && (
                      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
                        {p.photos.map((ph,i)=>(
                          <div key={i} onClick={()=>setLightbox(ph.url)} style={{ width:72, height:72, borderRadius:10, background:`url(${ph.url}) center/cover`, flexShrink:0, cursor:'pointer', border:`1px solid ${T.border}` }}/>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>}
        </div>

        {lightbox && (
          <div onClick={()=>setLightbox(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 }}>
            <img src={lightbox} alt="" style={{ maxWidth:'100%', maxHeight:'100%', borderRadius:12 }}/>
            <button onClick={()=>setLightbox(null)} style={{ position:'absolute', top:20, right:20, background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', width:40, height:40, borderRadius:'50%', fontSize:20, cursor:'pointer' }}>×</button>
          </div>
        )}
      </div>
    )
  }

  // List view
  return (
    <div>
      <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, padding:'24px 20px', color:'#fff', borderRadius:'0 0 20px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>Programs 🏆</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>See what your SK is working on</p>
      </div>
      <div style={{ padding:16 }}>
        {programs.length===0
          ? <Empty T={T} emoji="🏆" text="No programs yet" sub="Check back to see SK projects."/>
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {programs.map(p=>{
                const pct=p.totalBudget>0?Math.min(100,Math.round((p.totalProjectCost/p.totalBudget)*100)):0
                return (
                  <div key={p._id} onClick={()=>openProgram(p._id)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, overflow:'hidden', cursor:'pointer', boxShadow:T.shadow }}>
                    {p.photos?.length>0 && <div style={{ height:130, background:`url(${p.photos[0].url}) center/cover` }}/>}
                    <div style={{ padding:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:6 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:T.violet, background:T.violetSoft, padding:'3px 10px', borderRadius:999 }}>{p.category}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:999, background:statusBg(p.status), color:statusColor(p.status), textTransform:'capitalize' }}>{p.status}</span>
                      </div>
                      <p style={{ fontSize:16, fontWeight:800, margin:'0 0 4px', color:T.text }}>{p.title}</p>
                      <p style={{ fontSize:12.5, color:T.text2, margin:'0 0 12px', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.description||'No description'}</p>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginBottom:5 }}>
                        <span style={{ color:T.text2, fontWeight:600 }}>Budget used</span>
                        <span style={{ color:T.text, fontWeight:700 }}>{peso(p.totalProjectCost)} / {peso(p.totalBudget)}</span>
                      </div>
                      <div style={{ height:6, background:T.surface2, borderRadius:999, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${T.accent},${T.violet})`, borderRadius:999 }}/>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>}
      </div>
    </div>
  )
}
function Empty({ T, emoji, text, sub }) { return <div style={{ textAlign:'center', padding:'44px 20px', background:T.surface, border:`1px dashed ${T.border}`, borderRadius:18 }}><div style={{ fontSize:38, marginBottom:8 }}>{emoji}</div><p style={{ fontSize:14.5, fontWeight:700, margin:'0 0 4px', color:T.text }}>{text}</p>{sub&&<p style={{ fontSize:12.5, color:T.text3, margin:0 }}>{sub}</p>}</div> }
function Loader({ T }) { return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'70vh' }}><div style={{ width:32, height:32, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div> }