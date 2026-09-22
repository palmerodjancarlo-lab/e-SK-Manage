// kabataan/Officials.jsx — meet your SK council
import { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme-utils'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const ROLES = {
  sk_chairperson:{ label:'Chairperson', order:0, emoji:'👑' },
  sk_secretary:  { label:'Secretary',   order:1, emoji:'📝' },
  sk_treasurer:  { label:'Treasurer',   order:2, emoji:'💰' },
  sk_kagawad:    { label:'Kagawad',     order:3, emoji:'🤝' },
}

export default function KabataanOfficials() {
  const { T } = useTheme()
  const [officials,setOfficials]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    axios.get(`${API}/auth/members`).then(r=>{
      if(!active) return
      const sk=(r.data.users||[]).filter(u=>ROLES[u.role])
      sk.sort((a,b)=>ROLES[a.role].order-ROLES[b.role].order)
      setOfficials(sk)
    }).catch(()=>{}).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  const chair=officials.find(o=>o.role==='sk_chairperson')
  const others=officials.filter(o=>o.role!=='sk_chairperson')

  if(loading) return <Loader T={T}/>

  return (
    <div>
      <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, padding:'24px 20px', color:'#fff', borderRadius:'0 0 20px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>Your SK Council 🏛️</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>The officials serving Barangay Tawiran</p>
      </div>

      <div style={{ padding:16 }}>
        {officials.length===0 ? <Empty T={T}/> : (
          <>
            {chair && (
              <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, borderRadius:20, padding:22, color:'#fff', display:'flex', alignItems:'center', gap:18, marginBottom:14 }}>
                <div style={{ width:64, height:64, borderRadius:18, background: chair.photo?`url(${chair.photo}) center/cover`:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, flexShrink:0 }}>
                  {!chair.photo && `${chair.firstName?.[0]||''}${chair.lastName?.[0]||''}`}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <span style={{ fontSize:11, fontWeight:700, opacity:0.8, textTransform:'uppercase', letterSpacing:'0.5px' }}>👑 SK Chairperson</span>
                  <p style={{ fontSize:19, fontWeight:800, margin:'3px 0 0' }}>{chair.firstName} {chair.lastName}</p>
                </div>
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12 }}>
              {others.map(o=>{
                const r=ROLES[o.role]
                return (
                  <div key={o._id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:16, textAlign:'center', boxShadow:T.shadow }}>
                    <div style={{ width:56, height:56, borderRadius:16, background: o.photo?`url(${o.photo}) center/cover`:`linear-gradient(135deg,${T.accent},${T.violet})`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, fontWeight:800, margin:'0 auto 10px' }}>
                      {!o.photo && `${o.firstName?.[0]||''}${o.lastName?.[0]||''}`}
                    </div>
                    <p style={{ fontSize:13.5, fontWeight:700, margin:'0 0 5px', color:T.text }}>{o.firstName} {o.lastName}</p>
                    <span style={{ display:'inline-block', fontSize:10.5, fontWeight:700, padding:'3px 10px', borderRadius:999, background:T.accentSoft, color:T.accentText }}>{r.emoji} {r.label}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
function Empty({ T }) { return <div style={{ textAlign:'center', padding:'50px 20px', background:T.surface, border:`1px dashed ${T.border}`, borderRadius:18 }}><div style={{ fontSize:38, marginBottom:8 }}>🏛️</div><p style={{ fontSize:14.5, fontWeight:700, margin:0, color:T.text }}>No officials listed yet</p></div> }
function Loader({ T }) { return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'70vh' }}><div style={{ width:32, height:32, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div> }