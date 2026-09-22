// kabataan/Points.jsx — my points, history, leaderboard
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/theme-utils'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export default function KabataanPoints() {
  const { user } = useAuth()
  const { T } = useTheme()
  const [tab,setTab]=useState('history')
  const [points,setPoints]=useState(0)
  const [history,setHistory]=useState([])
  const [board,setBoard]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    Promise.all([
      axios.get(`${API}/points/my`).catch(()=>({data:{}})),
      axios.get(`${API}/points/history`).catch(()=>({data:{}})),
      axios.get(`${API}/points/leaderboard`).catch(()=>({data:{}})),
    ]).then(([p,h,l])=>{
      if(!active) return
      setPoints(p.data.balance ?? p.data.points ?? 0)
      setHistory(h.data.history||h.data.points||[])
      setBoard(l.data.leaderboard||[])
    }).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  const myRank=board.findIndex(b=>b._id===user?._id)+1
  const medal=(i)=>i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`

  return (
    <div>
      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, padding:'26px 20px 52px', color:'#fff', textAlign:'center', position:'relative', overflow:'hidden', borderRadius:'0 0 20px 20px' }}>
        <div style={{ position:'absolute', left:-20, top:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
        <div style={{ position:'relative' }}>
          <p style={{ fontSize:13, opacity:0.85, margin:0, fontWeight:600 }}>Your Total Points</p>
          <div style={{ fontSize:52, fontWeight:800, margin:'4px 0', lineHeight:1 }}>{points}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.18)', padding:'5px 14px', borderRadius:999, fontSize:12.5, fontWeight:700 }}>
            {myRank>0?`${medal(myRank-1)} Rank #${myRank} in Tawiran`:'🏅 Keep earning points!'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:'0 16px', marginTop:-36, position:'relative' }}>
        <div style={{ background:T.surface, borderRadius:16, boxShadow:T.shadowMd, border:`1px solid ${T.border}`, padding:6, display:'flex', gap:4 }}>
          {[['history','📜 History'],['leaderboard','🏆 Leaderboard']].map(([k,label])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:'11px', border:'none', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:700, background:tab===k?`linear-gradient(135deg,${T.accent},${T.violet})`:'transparent', color:tab===k?'#fff':T.text2 }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:'18px 16px 24px' }}>
        {loading ? <Loader T={T}/> : tab==='history' ? (
          history.length===0
            ? <Empty T={T} emoji="✨" text="No points yet" sub="Attend events and join activities to earn points!"/>
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {history.map((h,i)=>(
                  <div key={h._id||i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:h.type==='redeemed'?T.redSoft:T.greenSoft, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {h.type==='redeemed'?'🎁':h.type==='awarded'?'⭐':'✅'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13.5, fontWeight:700, margin:0, color:T.text }}>{h.reason||'Points earned'}</p>
                      <p style={{ fontSize:11.5, color:T.text3, margin:'2px 0 0' }}>{new Date(h.createdAt||h.checkedInAt).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}</p>
                    </div>
                    <div style={{ fontSize:16, fontWeight:800, color:h.type==='redeemed'?T.amber:T.green, flexShrink:0 }}>
                      {h.type==='redeemed'?'-':'+'}{h.pointsEarned||h.points||0}
                    </div>
                  </div>
                ))}
              </div>
        ) : (
          board.length===0
            ? <Empty T={T} emoji="🏆" text="No rankings yet" sub="Be the first to earn points!"/>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {board.map((b,i)=>{
                  const isMe=b._id===user?._id
                  const top3=i<3
                  return (
                    <div key={b._id} style={{ background:isMe?T.accentSoft:T.surface, border:`1px solid ${isMe?T.accent:T.border}`, borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:36, textAlign:'center', fontSize:top3?22:15, fontWeight:800, color:top3?'inherit':T.text3 }}>{medal(i)}</div>
                      <div style={{ width:40, height:40, borderRadius:'50%', background: b.photo?`url(${b.photo}) center/cover`:`linear-gradient(135deg,${T.accent},${T.violet})`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, flexShrink:0 }}>
                        {!b.photo && `${b.firstName?.[0]||''}${b.lastName?.[0]||''}`}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13.5, fontWeight:700, margin:0, color:T.text }}>{b.firstName} {b.lastName} {isMe&&<span style={{ fontSize:11, color:T.accent }}>(You)</span>}</p>
                      </div>
                      <div style={{ fontSize:15, fontWeight:800, color:T.accent }}>{b.points||0}<span style={{ fontSize:11, color:T.text3, fontWeight:700 }}> pts</span></div>
                    </div>
                  )
                })}
              </div>
        )}
      </div>
    </div>
  )
}
function Empty({ T, emoji, text, sub }) {
  return <div style={{ textAlign:'center', padding:'44px 20px', background:T.surface, border:`1px dashed ${T.border}`, borderRadius:18 }}><div style={{ fontSize:38, marginBottom:8 }}>{emoji}</div><p style={{ fontSize:14.5, fontWeight:700, margin:'0 0 4px', color:T.text }}>{text}</p>{sub&&<p style={{ fontSize:12.5, color:T.text3, margin:0 }}>{sub}</p>}</div>
}
function Loader({ T }) {
  return <div style={{ display:'flex', justifyContent:'center', padding:50 }}><div style={{ width:30, height:30, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div>
}