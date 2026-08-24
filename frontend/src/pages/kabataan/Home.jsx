// kabataan/Home.jsx — youth dashboard, mobile-first & interactive
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const C = {
  bg:'#F4F6FB', card:'#fff', ink:'#0F1F5C', slate:'#64748B', faint:'#94A3B8',
  line:'#EAEDF3', indigo:'#4F46E5', violet:'#7C3AED',
  emerald:'#059669', amber:'#D97706', rose:'#E11D48', sky:'#0284C7',
}

const CAT = {
  general:{ c:C.indigo, e:'📢' }, event:{ c:C.sky, e:'🎉' },
  urgent:{ c:C.rose, e:'🚨' }, reminder:{ c:C.amber, e:'⏰' },
}

export default function KabataanHome() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [points,setPoints]=useState(0)
  const [rank,setRank]=useState(null)
  const [totalKab,setTotalKab]=useState(0)
  const [announcements,setAnnouncements]=useState([])
  const [meetings,setMeetings]=useState([])
  const [rewards,setRewards]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    Promise.all([
      axios.get(`${API}/points/my`).catch(()=>({data:{}})),
      axios.get(`${API}/announcements`).catch(()=>({data:{}})),
      axios.get(`${API}/meetings`).catch(()=>({data:{}})),
      axios.get(`${API}/points/leaderboard`).catch(()=>({data:{}})),
      axios.get(`${API}/rewards`).catch(()=>({data:{}})),
    ]).then(([p,a,m,l,r])=>{
      setPoints(p.data.balance ?? p.data.points ?? 0)
      setAnnouncements((a.data.announcements||[]).slice(0,3))
      setMeetings((m.data.meetings||[]).filter(x=>new Date(x.date)>=new Date()).sort((x,y)=>new Date(x.date)-new Date(y.date)).slice(0,2))
      const board=l.data.leaderboard||[]; setTotalKab(board.length)
      const idx=board.findIndex(b=>b._id===user?._id); if(idx>=0)setRank(idx+1)
      setRewards((r.data.rewards||[]).sort((x,y)=>x.pointsRequired-y.pointsRequired))
    }).finally(()=>setLoading(false))
  },[user])

  const hour=new Date().getHours()
  const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening'

  // next reward to aim for
  const nextReward=rewards.find(r=>r.pointsRequired>points)
  const progressPct=nextReward?Math.min(100,Math.round((points/nextReward.pointsRequired)*100)):100

  if(loading) return <Loader/>

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','Inter',sans-serif", color:C.ink }}>

      {/* ── Hero ── */}
      <div style={{ background:'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)', padding:'26px 20px 60px', color:'#fff', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
        <div style={{ position:'absolute', right:50, bottom:-40, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }}/>
        <div style={{ position:'relative' }}>
          <p style={{ fontSize:13, opacity:0.85, margin:0 }}>{greeting},</p>
          <h1 style={{ fontSize:24, fontWeight:800, margin:'2px 0 0' }}>{user?.firstName}! 👋</h1>
          <p style={{ fontSize:12.5, opacity:0.8, margin:'6px 0 0' }}>Sangguniang Kabataan · Barangay Tawiran</p>
        </div>
      </div>

      {/* ── Floating points card ── */}
      <div style={{ padding:'0 16px', marginTop:-44, position:'relative' }}>
        <div style={{ background:C.card, borderRadius:20, padding:20, boxShadow:'0 12px 32px rgba(15,31,92,0.12)', border:`1px solid ${C.line}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:12, color:C.slate, margin:0, fontWeight:600 }}>Your Points</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:2 }}>
                <span style={{ fontSize:36, fontWeight:800, color:C.indigo, lineHeight:1 }}>{points}</span>
                <span style={{ fontSize:14, color:C.faint, fontWeight:700 }}>pts</span>
              </div>
            </div>
            <div style={{ textAlign:'center', background:'#F4F6FB', borderRadius:16, padding:'12px 18px' }}>
              <div style={{ fontSize:22 }}>{rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'🏅'}</div>
              <p style={{ fontSize:11, color:C.slate, margin:'2px 0 0', fontWeight:700 }}>{rank?`Rank #${rank}`:'Unranked'}</p>
              {totalKab>0 && <p style={{ fontSize:10, color:C.faint, margin:0 }}>of {totalKab}</p>}
            </div>
          </div>

          {/* progress to next reward */}
          {nextReward && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.line}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                <span style={{ fontSize:12, color:C.slate, fontWeight:600 }}>Next: {nextReward.title}</span>
                <span style={{ fontSize:12, color:C.indigo, fontWeight:800 }}>{points}/{nextReward.pointsRequired}</span>
              </div>
              <div style={{ height:8, background:'#EEF0F7', borderRadius:999, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progressPct}%`, background:'linear-gradient(90deg,#4F46E5,#7C3AED)', borderRadius:999, transition:'width 0.6s' }}/>
              </div>
              <p style={{ fontSize:11, color:C.faint, margin:'6px 0 0' }}>{nextReward.pointsRequired-points} more points to unlock 🎁</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { icon:'📷', label:'Scan', to:'/kabataan/checkin', bg:'#EEF0FF', c:C.indigo },
            { icon:'🎁', label:'Rewards', to:'/kabataan/rewards', bg:'#F5F3FF', c:C.violet },
            { icon:'🏆', label:'Programs', to:'/kabataan/programs', bg:'#FFFBEB', c:C.amber },
            { icon:'💰', label:'Budget', to:'/kabataan/transparency', bg:'#ECFDF5', c:C.emerald },
          ].map(a=>(
            <button key={a.label} onClick={()=>nav(a.to)} style={{ background:a.bg, border:'none', borderRadius:16, padding:'14px 6px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'transform 0.12s' }}
              onMouseDown={e=>e.currentTarget.style.transform='scale(0.94)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
              <span style={{ fontSize:22 }}>{a.icon}</span>
              <span style={{ fontSize:11, fontWeight:700, color:a.c }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Upcoming events ── */}
      {meetings.length>0 && (
        <Section title="Upcoming Events" action={{label:'See all',to:'/kabataan/meetings',nav}}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {meetings.map(m=>{
              const d=new Date(m.date)
              return (
                <div key={m._id} onClick={()=>nav('/kabataan/meetings')} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:14, display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', opacity:0.9 }}>{d.toLocaleDateString('en-PH',{month:'short'})}</span>
                    <span style={{ fontSize:20, fontWeight:800, lineHeight:1 }}>{d.getDate()}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:700, margin:0 }}>{m.title}</p>
                    <p style={{ fontSize:12, color:C.slate, margin:'3px 0 0' }}>🕐 {d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}{m.venue&&` · 📍 ${m.venue}`}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Latest news ── */}
      <Section title="Latest News" action={{label:'See all',to:'/kabataan/announcements',nav}}>
        {announcements.length===0
          ? <Empty emoji="📭" text="No announcements yet"/>
          : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {announcements.map(a=>{
                const cat=CAT[a.category]||CAT.general
                return (
                  <div key={a._id} onClick={()=>nav('/kabataan/announcements')} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:16, borderLeft:`4px solid ${cat.c}`, cursor:'pointer' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:15 }}>{cat.e}</span>
                      <span style={{ fontSize:11, color:C.faint, fontWeight:600 }}>{new Date(a.createdAt).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}</span>
                    </div>
                    <p style={{ fontSize:14, fontWeight:700, margin:'0 0 4px' }}>{a.title}</p>
                    <p style={{ fontSize:12.5, color:C.slate, margin:0, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{a.content}</p>
                  </div>
                )
              })}
            </div>}
      </Section>

      <div style={{ height:24 }}/>
    </div>
  )
}

function Section({ title, action, children }) {
  return (
    <div style={{ padding:'22px 16px 0' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <h2 style={{ fontSize:16, fontWeight:800, margin:0 }}>{title}</h2>
        {action && <button onClick={()=>action.nav(action.to)} style={{ background:'none', border:'none', fontSize:12.5, fontWeight:700, color:'#4F46E5', cursor:'pointer' }}>{action.label} →</button>}
      </div>
      {children}
    </div>
  )
}
function Empty({ emoji, text }) {
  return <div style={{ textAlign:'center', padding:'30px 0', background:'#fff', border:'1px dashed #EAEDF3', borderRadius:16 }}><div style={{ fontSize:30, marginBottom:6 }}>{emoji}</div><p style={{ fontSize:13, color:'#94A3B8', margin:0 }}>{text}</p></div>
}
function Loader() {
  return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'70vh' }}><div style={{ width:32, height:32, border:'3px solid #EAEDF3', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div>
}