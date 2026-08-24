// kabataan/Announcements.jsx — view SK news
import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const C = { bg:'#F4F6FB', card:'#fff', ink:'#0F1F5C', slate:'#64748B', faint:'#94A3B8', line:'#EAEDF3', indigo:'#4F46E5', sky:'#0284C7', rose:'#E11D48', amber:'#D97706' }
const CAT = {
  general:{ l:'General', c:C.indigo, bg:'#EEF0FF', e:'📢' },
  event:{ l:'Event', c:C.sky, bg:'#F0F9FF', e:'🎉' },
  urgent:{ l:'Urgent', c:C.rose, bg:'#FFF1F3', e:'🚨' },
  reminder:{ l:'Reminder', c:C.amber, bg:'#FFFBEB', e:'⏰' },
}

export default function KabataanAnnouncements() {
  const [items,setItems]=useState([])
  const [filter,setFilter]=useState('all')
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    axios.get(`${API}/announcements`).then(r=>setItems(r.data.announcements||[])).catch(()=>{}).finally(()=>setLoading(false))
  },[])

  const shown=filter==='all'?items:items.filter(i=>i.category===filter)

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','Inter',sans-serif", color:C.ink }}>
      <div style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', padding:'24px 20px', color:'#fff' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>News 📰</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>Latest updates from your SK</p>
      </div>

      {/* filter chips */}
      <div style={{ padding:'14px 16px 0', display:'flex', gap:8, overflowX:'auto' }}>
        {['all',...Object.keys(CAT)].map(k=>(
          <button key={k} onClick={()=>setFilter(k)} style={{ padding:'7px 14px', borderRadius:999, border:'none', whiteSpace:'nowrap', fontSize:12.5, fontWeight:700, cursor:'pointer', background:filter===k?'linear-gradient(135deg,#4F46E5,#7C3AED)':'#fff', color:filter===k?'#fff':C.slate, boxShadow:filter===k?'none':`0 0 0 1px ${C.line}` }}>
            {k==='all'?'All':`${CAT[k].e} ${CAT[k].l}`}
          </button>
        ))}
      </div>

      <div style={{ padding:16 }}>
        {loading ? <Loader/> :
          shown.length===0 ? <Empty/> :
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {shown.map(a=>{
              const cat=CAT[a.category]||CAT.general
              return (
                <div key={a._id} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:18, borderLeft:`4px solid ${cat.c}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:cat.bg, color:cat.c }}>{cat.e} {cat.l}</span>
                    <span style={{ fontSize:11, color:C.faint, fontWeight:600 }}>{new Date(a.createdAt).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}</span>
                  </div>
                  <p style={{ fontSize:16, fontWeight:800, margin:'0 0 6px' }}>{a.title}</p>
                  <p style={{ fontSize:13.5, color:C.slate, margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{a.content}</p>
                  {a.author && <p style={{ fontSize:11, color:C.faint, margin:'10px 0 0' }}>— {a.author.firstName} {a.author.lastName}</p>}
                </div>
              )
            })}
          </div>}
      </div>
    </div>
  )
}
function Empty(){ return <div style={{ textAlign:'center', padding:'50px 20px', background:'#fff', border:'1px dashed #EAEDF3', borderRadius:18 }}><div style={{ fontSize:38, marginBottom:8 }}>📭</div><p style={{ fontSize:14.5, fontWeight:700, margin:0 }}>No news yet</p></div> }
function Loader(){ return <div style={{ display:'flex', justifyContent:'center', padding:50 }}><div style={{ width:30, height:30, border:'3px solid #EAEDF3', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div> }