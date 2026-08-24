// kabataan/Points.jsx — my points, history, leaderboard
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const C = {
  bg:'#F4F6FB', card:'#fff', ink:'#0F1F5C', slate:'#64748B', faint:'#94A3B8',
  line:'#EAEDF3', indigo:'#4F46E5', violet:'#7C3AED', emerald:'#059669', amber:'#D97706',
}

export default function KabataanPoints() {
  const { user } = useAuth()
  const [tab,setTab]=useState('history')
  const [points,setPoints]=useState(0)
  const [history,setHistory]=useState([])
  const [board,setBoard]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    Promise.all([
      axios.get(`${API}/points/my`).catch(()=>({data:{}})),
      axios.get(`${API}/points/history`).catch(()=>({data:{}})),
      axios.get(`${API}/points/leaderboard`).catch(()=>({data:{}})),
    ]).then(([p,h,l])=>{
      setPoints(p.data.balance ?? p.data.points ?? 0)
      setHistory(h.data.history||h.data.points||[])
      setBoard(l.data.leaderboard||[])
    }).finally(()=>setLoading(false))
  },[])

  const myRank=board.findIndex(b=>b._id===user?._id)+1
  const medal=(i)=>i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','Inter',sans-serif", color:C.ink }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', padding:'26px 20px 54px', color:'#fff', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', left:-20, top:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
        <div style={{ position:'absolute', right:-30, bottom:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }}/>
        <div style={{ position:'relative' }}>
          <p style={{ fontSize:13, opacity:0.85, margin:0, fontWeight:600 }}>Your Total Points</p>
          <div style={{ fontSize:52, fontWeight:800, margin:'4px 0', lineHeight:1 }}>{points}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.18)', padding:'5px 14px', borderRadius:999, fontSize:12.5, fontWeight:700 }}>
            {myRank>0?`${medal(myRank-1)} Rank #${myRank} in Tawiran`:'🏅 Keep earning points!'}
          </div>
        </div>
      </div>

      {/* Tabs card */}
      <div style={{ padding:'0 16px', marginTop:-38, position:'relative' }}>
        <div style={{ background:C.card, borderRadius:20, boxShadow:'0 12px 32px rgba(15,31,92,0.1)', border:`1px solid ${C.line}`, overflow:'hidden' }}>
          <div style={{ display:'flex', padding:6, gap:4 }}>
            {[['history','📜 History'],['leaderboard','🏆 Leaderboard']].map(([k,label])=>(
              <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:'11px', border:'none', borderRadius:14, cursor:'pointer', fontSize:13, fontWeight:700, background:tab===k?'linear-gradient(135deg,#4F46E5,#7C3AED)':'transparent', color:tab===k?'#fff':C.slate }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 16px 24px' }}>
        {loading ? <Loader/> : tab==='history' ? (
          history.length===0
            ? <Empty emoji="✨" text="No points yet" sub="Attend events and join activities to earn points!"/>
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {history.map((h,i)=>(
                  <div key={h._id||i} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:h.type==='redeemed'?'#FFF1F3':'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {h.type==='redeemed'?'🎁':h.type==='awarded'?'⭐':'✅'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13.5, fontWeight:700, margin:0 }}>{h.reason||'Points earned'}</p>
                      <p style={{ fontSize:11.5, color:C.faint, margin:'2px 0 0' }}>{new Date(h.createdAt||h.checkedInAt).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}</p>
                    </div>
                    <div style={{ fontSize:16, fontWeight:800, color:h.type==='redeemed'?C.amber:C.emerald, flexShrink:0 }}>
                      {h.type==='redeemed'?'-':'+'}{h.pointsEarned||h.points||0}
                    </div>
                  </div>
                ))}
              </div>
        ) : (
          board.length===0
            ? <Empty emoji="🏆" text="No rankings yet" sub="Be the first to earn points!"/>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {board.map((b,i)=>{
                  const isMe=b._id===user?._id
                  const top3=i<3
                  return (
                    <div key={b._id} style={{ background:isMe?'linear-gradient(135deg,#EEF0FF,#F5F3FF)':C.card, border:`1px solid ${isMe?'#C7CCFF':C.line}`, borderRadius:16, padding:'12px 16px', display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:36, textAlign:'center', fontSize:top3?22:15, fontWeight:800, color:top3?'inherit':C.faint }}>{medal(i)}</div>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, flexShrink:0 }}>
                        {b.firstName?.[0]}{b.lastName?.[0]}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13.5, fontWeight:700, margin:0 }}>{b.firstName} {b.lastName} {isMe&&<span style={{ fontSize:11, color:C.indigo }}>(You)</span>}</p>
                      </div>
                      <div style={{ fontSize:15, fontWeight:800, color:C.indigo }}>{b.points||0}<span style={{ fontSize:11, color:C.faint, fontWeight:700 }}> pts</span></div>
                    </div>
                  )
                })}
              </div>
        )}
      </div>
    </div>
  )
}

function Empty({ emoji, text, sub }) {
  return <div style={{ textAlign:'center', padding:'44px 20px', background:'#fff', border:'1px dashed #EAEDF3', borderRadius:18 }}><div style={{ fontSize:38, marginBottom:8 }}>{emoji}</div><p style={{ fontSize:14.5, fontWeight:700, margin:'0 0 4px' }}>{text}</p>{sub&&<p style={{ fontSize:12.5, color:'#94A3B8', margin:0 }}>{sub}</p>}</div>
}
function Loader() {
  return <div style={{ display:'flex', justifyContent:'center', padding:50 }}><div style={{ width:30, height:30, border:'3px solid #EAEDF3', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div>
}