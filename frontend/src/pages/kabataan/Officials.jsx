// kabataan/Officials.jsx — meet your SK council
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const C = { bg:'#F4F6FB', card:'#fff', ink:'#0F1F5C', slate:'#64748B', faint:'#94A3B8', line:'#EAEDF3', indigo:'#4F46E5', violet:'#7C3AED', emerald:'#059669', amber:'#D97706', sky:'#0284C7' }

const ROLES = {
  sk_chairperson:{ label:'Chairperson', color:C.indigo, order:0, emoji:'👑' },
  sk_secretary:  { label:'Secretary',   color:C.violet, order:1, emoji:'📝' },
  sk_treasurer:  { label:'Treasurer',   color:C.amber,  order:2, emoji:'💰' },
  sk_kagawad:    { label:'Kagawad',     color:C.sky,    order:3, emoji:'🤝' },
}

export default function KabataanOfficials() {
  const [officials,setOfficials]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    axios.get(`${API}/auth/members`).then(r=>{
      const sk=(r.data.users||[]).filter(u=>ROLES[u.role])
      sk.sort((a,b)=>ROLES[a.role].order-ROLES[b.role].order)
      setOfficials(sk)
    }).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  const chair=officials.find(o=>o.role==='sk_chairperson')
  const others=officials.filter(o=>o.role!=='sk_chairperson')

  if(loading) return <Loader/>

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','Inter',sans-serif", color:C.ink }}>
      <div style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', padding:'24px 20px', color:'#fff' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>Your SK Council 🏛️</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>The officials serving Barangay Tawiran</p>
      </div>

      <div style={{ padding:16 }}>
        {officials.length===0 ? <Empty/> : (
          <>
            {/* Chairperson featured */}
            {chair && (
              <div style={{ background:'linear-gradient(135deg,#1A3A8F,#4F46E5)', borderRadius:20, padding:22, color:'#fff', display:'flex', alignItems:'center', gap:18, marginBottom:14 }}>
                <div style={{ width:64, height:64, borderRadius:18, background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, flexShrink:0 }}>
                  {chair.firstName?.[0]}{chair.lastName?.[0]}
                </div>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:11, fontWeight:700, opacity:0.8, textTransform:'uppercase', letterSpacing:'0.5px' }}>👑 SK Chairperson</span>
                  <p style={{ fontSize:19, fontWeight:800, margin:'3px 0 0' }}>{chair.firstName} {chair.lastName}</p>
                </div>
              </div>
            )}

            {/* Others grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12 }}>
              {others.map(o=>{
                const r=ROLES[o.role]
                return (
                  <div key={o._id} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:16, textAlign:'center' }}>
                    <div style={{ width:56, height:56, borderRadius:16, background:r.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, fontWeight:800, margin:'0 auto 10px' }}>
                      {o.firstName?.[0]}{o.lastName?.[0]}
                    </div>
                    <p style={{ fontSize:13.5, fontWeight:700, margin:'0 0 5px' }}>{o.firstName} {o.lastName}</p>
                    <span style={{ display:'inline-block', fontSize:10.5, fontWeight:700, padding:'3px 10px', borderRadius:999, background:r.color+'18', color:r.color }}>{r.emoji} {r.label}</span>
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
function Empty(){ return <div style={{ textAlign:'center', padding:'50px 20px', background:'#fff', border:'1px dashed #EAEDF3', borderRadius:18 }}><div style={{ fontSize:38, marginBottom:8 }}>🏛️</div><p style={{ fontSize:14.5, fontWeight:700, margin:0 }}>No officials listed yet</p></div> }
function Loader(){ return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'70vh' }}><div style={{ width:32, height:32, border:'3px solid #EAEDF3', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div> }