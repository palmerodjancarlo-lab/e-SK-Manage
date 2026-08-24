// kabataan/Meetings.jsx — view meetings & events
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const C = { bg:'#F4F6FB', card:'#fff', ink:'#0F1F5C', slate:'#64748B', faint:'#94A3B8', line:'#EAEDF3', indigo:'#4F46E5', violet:'#7C3AED', emerald:'#059669' }

export default function KabataanMeetings() {
  const [items,setItems]=useState([])
  const [tab,setTab]=useState('upcoming')
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    axios.get(`${API}/meetings`).then(r=>setItems(r.data.meetings||[])).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  const now=new Date()
  const upcoming=items.filter(m=>new Date(m.date)>=now).sort((a,b)=>new Date(a.date)-new Date(b.date))
  const past=items.filter(m=>new Date(m.date)<now).sort((a,b)=>new Date(b.date)-new Date(a.date))
  const shown=tab==='upcoming'?upcoming:past

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','Inter',sans-serif", color:C.ink }}>
      <div style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', padding:'24px 20px', color:'#fff' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>Events 📅</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>SK meetings and activities</p>
      </div>

      {/* tabs */}
      <div style={{ padding:'14px 16px 0', display:'flex', gap:8 }}>
        {[['upcoming',`Upcoming (${upcoming.length})`],['past',`Past (${past.length})`]].map(([k,label])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:'10px', borderRadius:12, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', background:tab===k?'linear-gradient(135deg,#4F46E5,#7C3AED)':'#fff', color:tab===k?'#fff':C.slate, boxShadow:tab===k?'none':`0 0 0 1px ${C.line}` }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:16 }}>
        {loading ? <Loader/> :
          shown.length===0 ? <Empty tab={tab}/> :
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {shown.map(m=>{
              const d=new Date(m.date)
              const up=tab==='upcoming'
              return (
                <div key={m._id} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:16, display:'flex', gap:14, opacity:up?1:0.75 }}>
                  <div style={{ width:58, height:58, borderRadius:14, background:up?'linear-gradient(135deg,#4F46E5,#7C3AED)':'#F4F6FB', color:up?'#fff':C.slate, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase' }}>{d.toLocaleDateString('en-PH',{month:'short'})}</span>
                    <span style={{ fontSize:22, fontWeight:800, lineHeight:1 }}>{d.getDate()}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:15, fontWeight:800, margin:'0 0 4px' }}>{m.title}</p>
                    <p style={{ fontSize:12.5, color:C.slate, margin:0 }}>🕐 {d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}{m.venue&&` · 📍 ${m.venue}`}</p>
                    {m.description && <p style={{ fontSize:12.5, color:C.faint, margin:'6px 0 0', lineHeight:1.5 }}>{m.description}</p>}
                  </div>
                </div>
              )
            })}
          </div>}
      </div>
    </div>
  )
}
function Empty({tab}){ return <div style={{ textAlign:'center', padding:'50px 20px', background:'#fff', border:'1px dashed #EAEDF3', borderRadius:18 }}><div style={{ fontSize:38, marginBottom:8 }}>📅</div><p style={{ fontSize:14.5, fontWeight:700, margin:0 }}>No {tab} events</p></div> }
function Loader(){ return <div style={{ display:'flex', justifyContent:'center', padding:50 }}><div style={{ width:30, height:30, border:'3px solid #EAEDF3', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div> }