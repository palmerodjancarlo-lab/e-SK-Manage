// kabataan/Programs.jsx — view SK programs & their progress photos
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const C = {
  bg:'#F4F6FB', card:'#fff', ink:'#0F1F5C', slate:'#64748B', faint:'#94A3B8',
  line:'#EAEDF3', indigo:'#4F46E5', violet:'#7C3AED', emerald:'#059669', amber:'#D97706', sky:'#0284C7', rose:'#E11D48',
}
const peso=n=>`₱${Number(n||0).toLocaleString('en-PH')}`
const STATUS={
  planned:{l:'Planned',c:C.amber,bg:'#FFFBEB'}, ongoing:{l:'Ongoing',c:C.sky,bg:'#F0F9FF'},
  completed:{l:'Completed',c:C.emerald,bg:'#ECFDF5'}, cancelled:{l:'Cancelled',c:C.rose,bg:'#FFF1F3'},
}

export default function KabataanPrograms() {
  const [programs,setPrograms]=useState([])
  const [selected,setSelected]=useState(null)
  const [loading,setLoading]=useState(true)
  const [lightbox,setLightbox]=useState(null)

  useEffect(()=>{
    axios.get(`${API}/programs`).then(r=>setPrograms(r.data.programs||[])).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  const openProgram=async(id)=>{
    try{ const r=await axios.get(`${API}/programs/${id}`); setSelected(r.data) }catch{ /* ignore */ }
  }

  if(loading) return <Loader/>

  // ── Detail view ──
  if(selected){
    const { program, projects }=selected
    return (
      <div style={{ fontFamily:"'Plus Jakarta Sans','Inter',sans-serif", color:C.ink }}>
        <div style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', padding:'18px 20px 24px', color:'#fff' }}>
          <button onClick={()=>setSelected(null)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', fontSize:13, fontWeight:700, padding:'7px 14px', borderRadius:10, cursor:'pointer', marginBottom:14 }}>← Back</button>
          <span style={{ fontSize:11, fontWeight:700, background:'rgba(255,255,255,0.2)', padding:'3px 10px', borderRadius:999 }}>{program.category}</span>
          <h1 style={{ fontSize:22, fontWeight:800, margin:'10px 0 6px' }}>{program.title}</h1>
          <p style={{ fontSize:13, opacity:0.85, margin:0, lineHeight:1.5 }}>{program.description}</p>
        </div>

        <div style={{ padding:16 }}>
          {/* budget transparency */}
          <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:18, padding:18, marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.5px', margin:'0 0 12px' }}>Budget</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ background:'#F4F6FB', borderRadius:12, padding:'12px 14px' }}>
                <p style={{ fontSize:11, color:C.slate, margin:0 }}>Total Budget</p>
                <p style={{ fontSize:18, fontWeight:800, color:C.indigo, margin:'3px 0 0' }}>{peso(program.totalBudget)}</p>
              </div>
              <div style={{ background:'#F4F6FB', borderRadius:12, padding:'12px 14px' }}>
                <p style={{ fontSize:11, color:C.slate, margin:0 }}>Used</p>
                <p style={{ fontSize:18, fontWeight:800, color:C.amber, margin:'3px 0 0' }}>{peso(program.totalProjectCost)}</p>
              </div>
            </div>
          </div>

          {/* progress photos */}
          {program.photos?.length>0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:15, fontWeight:800, margin:'0 0 10px' }}>📸 Progress Photos</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {program.photos.map((ph,i)=>(
                  <div key={i} onClick={()=>setLightbox(ph.url)} style={{ aspectRatio:'1', borderRadius:12, background:`url(${ph.url}) center/cover`, cursor:'pointer', border:`1px solid ${C.line}` }}/>
                ))}
              </div>
            </div>
          )}

          {/* projects */}
          <p style={{ fontSize:15, fontWeight:800, margin:'0 0 10px' }}>Projects ({projects?.length||0})</p>
          {(!projects||projects.length===0)
            ? <Empty emoji="📋" text="No projects yet"/>
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {projects.map(p=>{
                  const ps=STATUS[p.status]||STATUS.planned
                  return (
                    <div key={p._id} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:6 }}>
                        <p style={{ fontSize:14.5, fontWeight:700, margin:0 }}>{p.title}</p>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:999, background:ps.bg, color:ps.c, whiteSpace:'nowrap' }}>{ps.l}</span>
                      </div>
                      {p.description && <p style={{ fontSize:12.5, color:C.slate, margin:'0 0 8px', lineHeight:1.5 }}>{p.description}</p>}
                      {p.photos?.length>0 && (
                        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
                          {p.photos.map((ph,i)=>(
                            <div key={i} onClick={()=>setLightbox(ph.url)} style={{ width:72, height:72, borderRadius:10, background:`url(${ph.url}) center/cover`, flexShrink:0, cursor:'pointer', border:`1px solid ${C.line}` }}/>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
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

  // ── List view ──
  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','Inter',sans-serif", color:C.ink }}>
      <div style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', padding:'24px 20px', color:'#fff' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>Programs 🏆</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>See what your SK is working on</p>
      </div>

      <div style={{ padding:16 }}>
        {programs.length===0
          ? <Empty emoji="🏆" text="No programs yet" sub="Check back to see SK projects and activities."/>
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {programs.map(p=>{
                const st=STATUS[p.status]||STATUS.planned
                const pct=p.totalBudget>0?Math.min(100,Math.round((p.totalProjectCost/p.totalBudget)*100)):0
                return (
                  <div key={p._id} onClick={()=>openProgram(p._id)} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:18, overflow:'hidden', cursor:'pointer' }}>
                    {p.photos?.length>0 && <div style={{ height:130, background:`url(${p.photos[0].url}) center/cover` }}/>}
                    <div style={{ padding:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:6 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:C.violet, background:'#F5F3FF', padding:'3px 10px', borderRadius:999 }}>{p.category}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:999, background:st.bg, color:st.c }}>{st.l}</span>
                      </div>
                      <p style={{ fontSize:16, fontWeight:800, margin:'0 0 4px' }}>{p.title}</p>
                      <p style={{ fontSize:12.5, color:C.slate, margin:'0 0 12px', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.description||'No description'}</p>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, marginBottom:5 }}>
                        <span style={{ color:C.slate, fontWeight:600 }}>Budget used</span>
                        <span style={{ color:C.ink, fontWeight:700 }}>{peso(p.totalProjectCost)} / {peso(p.totalBudget)}</span>
                      </div>
                      <div style={{ height:6, background:'#EEF0F7', borderRadius:999, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#4F46E5,#7C3AED)', borderRadius:999 }}/>
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

function Empty({ emoji, text, sub }) {
  return <div style={{ textAlign:'center', padding:'44px 20px', background:'#fff', border:'1px dashed #EAEDF3', borderRadius:18 }}><div style={{ fontSize:38, marginBottom:8 }}>{emoji}</div><p style={{ fontSize:14.5, fontWeight:700, margin:'0 0 4px' }}>{text}</p>{sub&&<p style={{ fontSize:12.5, color:'#94A3B8', margin:0 }}>{sub}</p>}</div>
}
function Loader() {
  return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'70vh' }}><div style={{ width:32, height:32, border:'3px solid #EAEDF3', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div>
}