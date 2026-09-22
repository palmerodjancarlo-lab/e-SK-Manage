// kabataan/Announcements.jsx — view SK news
import { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme-utils'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const CAT = {
  general:{ l:'General', e:'📢' }, event:{ l:'Event', e:'🎉' },
  urgent:{ l:'Urgent', e:'🚨' }, reminder:{ l:'Reminder', e:'⏰' },
  Meetings:{ l:'Meetings', e:'📅' }, Events:{ l:'Events', e:'🎉' },
  Programs:{ l:'Programs', e:'🏆' }, Opportunities:{ l:'Opportunities', e:'✨' }, General:{ l:'General', e:'📢' },
}

export default function KabataanAnnouncements() {
  const { T } = useTheme()
  const [items,setItems]=useState([])
  const [filter,setFilter]=useState('all')
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    axios.get(`${API}/announcements`).then(r=>{ if(active) setItems(r.data.announcements||[]) }).catch(()=>{}).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  const cats = ['all', ...Array.from(new Set(items.map(i=>i.category).filter(Boolean)))]
  const shown=filter==='all'?items:items.filter(i=>i.category===filter)

  return (
    <div>
      <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, padding:'24px 20px', color:'#fff', borderRadius:'0 0 20px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>News 📰</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>Latest updates from your SK</p>
      </div>

      {/* filter chips */}
      <div style={{ padding:'14px 16px 0', display:'flex', gap:8, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        {cats.map(k=>{
          const cat=CAT[k]
          return (
            <button key={k} onClick={()=>setFilter(k)} style={{ padding:'7px 14px', borderRadius:999, border:'none', whiteSpace:'nowrap', fontSize:12.5, fontWeight:700, cursor:'pointer', background:filter===k?`linear-gradient(135deg,${T.accent},${T.violet})`:T.surface, color:filter===k?'#fff':T.text2, boxShadow:filter===k?'none':`0 0 0 1px ${T.border}` }}>
              {k==='all'?'All':`${cat?.e||''} ${cat?.l||k}`}
            </button>
          )
        })}
      </div>

      <div style={{ padding:16 }}>
        {loading ? <Loader T={T}/> :
          shown.length===0 ? <Empty T={T}/> :
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {shown.map(a=>{
              const cat=CAT[a.category]||CAT.general
              return (
                <div key={a._id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:18, borderLeft:`4px solid ${T.accent}`, boxShadow:T.shadow }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:T.accentSoft, color:T.accentText }}>{cat.e} {cat.l}</span>
                    <span style={{ fontSize:11, color:T.text3, fontWeight:600 }}>{new Date(a.createdAt).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}</span>
                  </div>
                  <p style={{ fontSize:16, fontWeight:800, margin:'0 0 6px', color:T.text }}>{a.title}</p>
                  <p style={{ fontSize:13.5, color:T.text2, margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{a.content}</p>
                  {a.author && <p style={{ fontSize:11, color:T.text3, margin:'10px 0 0' }}>— {a.author.firstName} {a.author.lastName}</p>}
                </div>
              )
            })}
          </div>}
      </div>
    </div>
  )
}
function Empty({ T }) { return <div style={{ textAlign:'center', padding:'50px 20px', background:T.surface, border:`1px dashed ${T.border}`, borderRadius:18 }}><div style={{ fontSize:38, marginBottom:8 }}>📭</div><p style={{ fontSize:14.5, fontWeight:700, margin:0, color:T.text }}>No news yet</p></div> }
function Loader({ T }) { return <div style={{ display:'flex', justifyContent:'center', padding:50 }}><div style={{ width:30, height:30, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div> }