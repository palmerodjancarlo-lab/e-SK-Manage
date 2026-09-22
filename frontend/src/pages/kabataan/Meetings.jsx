// kabataan/Meetings.jsx — view meetings & events
import { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme-utils'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export default function KabataanMeetings() {
  const { T } = useTheme()
  const [items,setItems]=useState([])
  const [tab,setTab]=useState('upcoming')
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    axios.get(`${API}/meetings`).then(r=>{ if(active) setItems(r.data.meetings||[]) }).catch(()=>{}).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  const now=new Date()
  const upcoming=items.filter(m=>new Date(m.date)>=now).sort((a,b)=>new Date(a.date)-new Date(b.date))
  const past=items.filter(m=>new Date(m.date)<now).sort((a,b)=>new Date(b.date)-new Date(a.date))
  const shown=tab==='upcoming'?upcoming:past

  return (
    <div>
      <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, padding:'24px 20px', color:'#fff', borderRadius:'0 0 20px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>Events 📅</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>SK meetings and activities</p>
      </div>

      <div style={{ padding:'14px 16px 0', display:'flex', gap:8 }}>
        {[['upcoming',`Upcoming (${upcoming.length})`],['past',`Past (${past.length})`]].map(([k,label])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:'10px', borderRadius:12, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', background:tab===k?`linear-gradient(135deg,${T.accent},${T.violet})`:T.surface, color:tab===k?'#fff':T.text2, boxShadow:tab===k?'none':`0 0 0 1px ${T.border}` }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:16 }}>
        {loading ? <Loader T={T}/> :
          shown.length===0 ? <Empty T={T} tab={tab}/> :
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {shown.map(m=>{
              const d=new Date(m.date)
              const up=tab==='upcoming'
              return (
                <div key={m._id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:16, display:'flex', gap:14, opacity:up?1:0.8, boxShadow:T.shadow }}>
                  <div style={{ width:58, height:58, borderRadius:14, background:up?`linear-gradient(135deg,${T.accent},${T.violet})`:T.surface2, color:up?'#fff':T.text2, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase' }}>{d.toLocaleDateString('en-PH',{month:'short'})}</span>
                    <span style={{ fontSize:22, fontWeight:800, lineHeight:1 }}>{d.getDate()}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:15, fontWeight:800, margin:'0 0 4px', color:T.text }}>{m.title}</p>
                    <p style={{ fontSize:12.5, color:T.text3, margin:0 }}>🕐 {d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}{m.venue&&` · 📍 ${m.venue}`}</p>
                    {m.description && <p style={{ fontSize:12.5, color:T.text2, margin:'6px 0 0', lineHeight:1.5 }}>{m.description}</p>}
                  </div>
                </div>
              )
            })}
          </div>}
      </div>
    </div>
  )
}
function Empty({ T, tab }) { return <div style={{ textAlign:'center', padding:'50px 20px', background:T.surface, border:`1px dashed ${T.border}`, borderRadius:18 }}><div style={{ fontSize:38, marginBottom:8 }}>📅</div><p style={{ fontSize:14.5, fontWeight:700, margin:0, color:T.text }}>No {tab} events</p></div> }
function Loader({ T }) { return <div style={{ display:'flex', justifyContent:'center', padding:50 }}><div style={{ width:30, height:30, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div> }