// kabataan/Home.jsx — youth dashboard, themed + responsive
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const CAT = {
  general:{ e:'📢' }, event:{ e:'🎉' }, urgent:{ e:'🚨' }, reminder:{ e:'⏰' },
  Meetings:{ e:'📅' }, Events:{ e:'🎉' }, Programs:{ e:'🏆' }, Opportunities:{ e:'✨' },
}

export default function KabataanHome() {
  const { user } = useAuth()
  const { T } = useTheme()
  const nav = useNavigate()
  const [points,setPoints]=useState(0)
  const [rank,setRank]=useState(null)
  const [totalKab,setTotalKab]=useState(0)
  const [announcements,setAnnouncements]=useState([])
  const [meetings,setMeetings]=useState([])
  const [rewards,setRewards]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    Promise.all([
      axios.get(`${API}/points/my`).catch(()=>({data:{}})),
      axios.get(`${API}/announcements`).catch(()=>({data:{}})),
      axios.get(`${API}/meetings`).catch(()=>({data:{}})),
      axios.get(`${API}/points/leaderboard`).catch(()=>({data:{}})),
      axios.get(`${API}/rewards`).catch(()=>({data:{}})),
    ]).then(([p,a,m,l,r])=>{
      if(!active) return
      setPoints(p.data.balance ?? p.data.points ?? 0)
      setAnnouncements((a.data.announcements||[]).slice(0,3))
      setMeetings((m.data.meetings||[]).filter(x=>new Date(x.date)>=new Date()).sort((x,y)=>new Date(x.date)-new Date(y.date)).slice(0,2))
      const board=l.data.leaderboard||[]; setTotalKab(board.length)
      const idx=board.findIndex(b=>b._id===user?._id); if(idx>=0)setRank(idx+1)
      setRewards((r.data.rewards||[]).sort((x,y)=>x.pointsRequired-y.pointsRequired))
    }).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[user])

  const hour=new Date().getHours()
  const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening'
  const nextReward=rewards.find(r=>r.pointsRequired>points)
  const progressPct=nextReward?Math.min(100,Math.round((points/nextReward.pointsRequired)*100)):100

  if(loading) return <Loader T={T}/>

  return (
    <div>
      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, padding:'26px 20px 58px', color:'#fff', position:'relative', overflow:'hidden', borderRadius:'0 0 20px 20px' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
        <div style={{ position:'relative' }}>
          <p style={{ fontSize:13, opacity:0.85, margin:0 }}>{greeting},</p>
          <h1 style={{ fontSize:24, fontWeight:800, margin:'2px 0 0' }}>{user?.firstName}! 👋</h1>
          <p style={{ fontSize:12.5, opacity:0.8, margin:'6px 0 0' }}>Sangguniang Kabataan · Barangay Tawiran</p>
        </div>
      </div>

      {/* Points card */}
      <div style={{ padding:'0 16px', marginTop:-42, position:'relative' }}>
        <div style={{ background:T.surface, borderRadius:18, padding:20, boxShadow:T.shadowMd, border:`1px solid ${T.border}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:12, color:T.text3, margin:0, fontWeight:600 }}>Your Points</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:2 }}>
                <span style={{ fontSize:36, fontWeight:800, color:T.accent, lineHeight:1 }}>{points}</span>
                <span style={{ fontSize:14, color:T.text3, fontWeight:700 }}>pts</span>
              </div>
            </div>
            <div style={{ textAlign:'center', background:T.surface2, borderRadius:14, padding:'12px 18px' }}>
              <div style={{ fontSize:22 }}>{rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'🏅'}</div>
              <p style={{ fontSize:11, color:T.text2, margin:'2px 0 0', fontWeight:700 }}>{rank?`Rank #${rank}`:'Unranked'}</p>
              {totalKab>0 && <p style={{ fontSize:10, color:T.text3, margin:0 }}>of {totalKab}</p>}
            </div>
          </div>
          {nextReward && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                <span style={{ fontSize:12, color:T.text2, fontWeight:600 }}>Next: {nextReward.title}</span>
                <span style={{ fontSize:12, color:T.accent, fontWeight:800 }}>{points}/{nextReward.pointsRequired}</span>
              </div>
              <div style={{ height:8, background:T.surface2, borderRadius:999, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progressPct}%`, background:`linear-gradient(90deg,${T.accent},${T.violet})`, borderRadius:999, transition:'width 0.6s' }}/>
              </div>
              <p style={{ fontSize:11, color:T.text3, margin:'6px 0 0' }}>{nextReward.pointsRequired-points} more points to unlock 🎁</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { icon:'qrCode', label:'Scan', to:'/kabataan/checkin', c:T.accent },
            { icon:'gift', label:'Rewards', to:'/kabataan/rewards', c:T.violet },
            { icon:'trophy', label:'Programs', to:'/kabataan/programs', c:T.amber },
            { icon:'banknotes', label:'Budget', to:'/kabataan/transparency', c:T.green },
          ].map(a=>(
            <button key={a.label} onClick={()=>nav(a.to)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:'14px 6px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:7 }}>
              <div style={{ width:40, height:40, borderRadius:11, background:a.c+'18', display:'flex', alignItems:'center', justifyContent:'center', color:a.c }}><Icon name={a.icon} size={19}/></div>
              <span style={{ fontSize:11, fontWeight:700, color:T.text2 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming events */}
      {meetings.length>0 && (
        <Section T={T} title="Upcoming Events" onAll={()=>nav('/kabataan/meetings')}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {meetings.map(m=>{
              const d=new Date(m.date)
              return (
                <div key={m._id} onClick={()=>nav('/kabataan/meetings')} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:14, display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}>
                  <div style={{ width:52, height:52, borderRadius:13, background:`linear-gradient(135deg,${T.accent},${T.violet})`, color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', opacity:0.9 }}>{d.toLocaleDateString('en-PH',{month:'short'})}</span>
                    <span style={{ fontSize:20, fontWeight:800, lineHeight:1 }}>{d.getDate()}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:700, margin:0, color:T.text }}>{m.title}</p>
                    <p style={{ fontSize:12, color:T.text3, margin:'3px 0 0' }}>🕐 {d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}{m.venue&&` · 📍 ${m.venue}`}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Latest news */}
      <Section T={T} title="Latest News" onAll={()=>nav('/kabataan/announcements')}>
        {announcements.length===0
          ? <Empty T={T} emoji="📭" text="No announcements yet"/>
          : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {announcements.map(a=>{
                const cat=CAT[a.category]||CAT.general
                return (
                  <div key={a._id} onClick={()=>nav('/kabataan/announcements')} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:16, borderLeft:`4px solid ${T.accent}`, cursor:'pointer' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:15 }}>{cat.e}</span>
                      <span style={{ fontSize:11, color:T.text3, fontWeight:600 }}>{new Date(a.createdAt).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}</span>
                    </div>
                    <p style={{ fontSize:14, fontWeight:700, margin:'0 0 4px', color:T.text }}>{a.title}</p>
                    <p style={{ fontSize:12.5, color:T.text2, margin:0, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{a.content}</p>
                  </div>
                )
              })}
            </div>}
      </Section>
      <div style={{ height:24 }}/>
    </div>
  )
}

function Section({ T, title, onAll, children }) {
  return (
    <div style={{ padding:'22px 16px 0' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h2 style={{ fontSize:16, fontWeight:800, margin:0, color:T.text }}>{title}</h2>
        {onAll && <button onClick={onAll} style={{ background:'none', border:'none', fontSize:12.5, fontWeight:700, color:T.accent, cursor:'pointer' }}>See all →</button>}
      </div>
      {children}
    </div>
  )
}
function Empty({ T, emoji, text }) {
  return <div style={{ textAlign:'center', padding:'30px 0', background:T.surface, border:`1px dashed ${T.border}`, borderRadius:14 }}><div style={{ fontSize:30, marginBottom:6 }}>{emoji}</div><p style={{ fontSize:13, color:T.text3, margin:0 }}>{text}</p></div>
}
function Loader({ T }) {
  return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'70vh' }}><div style={{ width:32, height:32, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div>
}