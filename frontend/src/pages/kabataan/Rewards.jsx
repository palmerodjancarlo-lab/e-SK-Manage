// kabataan/Rewards.jsx — browse & see what you can redeem
import { useState, useEffect } from 'react'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export default function KabataanRewards() {
  const { T } = useTheme()
  const [rewards,setRewards]=useState([])
  const [myPoints,setMyPoints]=useState(0)
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    Promise.all([
      axios.get(`${API}/rewards`).catch(()=>({data:{}})),
      axios.get(`${API}/points/my`).catch(()=>({data:{}})),
    ]).then(([r,p])=>{
      if(!active) return
      setRewards((r.data.rewards||[]).sort((a,b)=>a.pointsRequired-b.pointsRequired))
      setMyPoints(p.data.balance ?? p.data.points ?? 0)
    }).finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])

  return (
    <div>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, padding:'24px 20px', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center', borderRadius:'0 0 20px 20px' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>Rewards 🎁</h1>
          <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>Redeem your points</p>
        </div>
        <div style={{ textAlign:'right', background:'rgba(255,255,255,0.18)', borderRadius:14, padding:'10px 16px' }}>
          <p style={{ fontSize:11, opacity:0.85, margin:0 }}>You have</p>
          <p style={{ fontSize:22, fontWeight:800, margin:0 }}>{myPoints} <span style={{ fontSize:12 }}>pts</span></p>
        </div>
      </div>

      <div style={{ padding:16 }}>
        {loading ? <Loader T={T}/> :
          rewards.length===0 ? <Empty T={T}/> :
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14 }}>
            {rewards.map(r=>{
              const canRedeem=myPoints>=r.pointsRequired
              const pct=Math.min(100,Math.round((myPoints/r.pointsRequired)*100))
              const outOfStock=r.stock===0
              return (
                <div key={r._id} style={{ background:T.surface, border:`1px solid ${canRedeem?T.green:T.border}`, borderRadius:18, overflow:'hidden', position:'relative', opacity:outOfStock?0.6:1, boxShadow:T.shadow }}>
                  <div style={{ height:120, background:r.image?`url(${r.image}) center/cover`:`linear-gradient(135deg,${T.accentSoft},${T.violetSoft})`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                    {!r.image && <span style={{ fontSize:40 }}>🎁</span>}
                    {canRedeem && !outOfStock && <span style={{ position:'absolute', top:8, right:8, background:T.green, color:'#fff', fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:999 }}>✓ READY</span>}
                    {outOfStock && <span style={{ position:'absolute', top:8, right:8, background:T.red, color:'#fff', fontSize:10, fontWeight:800, padding:'3px 9px', borderRadius:999 }}>SOLD OUT</span>}
                  </div>
                  <div style={{ padding:14 }}>
                    <p style={{ fontSize:14, fontWeight:800, margin:'0 0 3px', color:T.text }}>{r.title}</p>
                    {r.description && <p style={{ fontSize:11.5, color:T.text2, margin:'0 0 10px', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{r.description}</p>}
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
                      <span style={{ fontSize:16, fontWeight:800, color:T.accent }}>{r.pointsRequired}</span>
                      <span style={{ fontSize:11, color:T.text3, fontWeight:700 }}>points</span>
                    </div>
                    {!canRedeem && (
                      <>
                        <div style={{ height:6, background:T.surface2, borderRadius:999, overflow:'hidden', marginBottom:5 }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${T.accent},${T.violet})`, borderRadius:999 }}/>
                        </div>
                        <p style={{ fontSize:10.5, color:T.text3, margin:0 }}>{r.pointsRequired-myPoints} more to unlock</p>
                      </>
                    )}
                    {canRedeem && !outOfStock && (
                      <div style={{ background:T.greenSoft, color:T.green, fontSize:11.5, fontWeight:700, textAlign:'center', padding:'7px', borderRadius:10 }}>Ready to claim!</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        }
        {rewards.length>0 && (
          <div style={{ marginTop:16, background:T.accentSoft, borderRadius:14, padding:'14px 16px', fontSize:12, color:T.accentText, lineHeight:1.5, display:'flex', gap:10, alignItems:'flex-start' }}>
            <Icon name="gift" size={16}/>
            <span>To claim a reward you're eligible for, visit an SK official in person. They'll confirm and deduct your points.</span>
          </div>
        )}
      </div>
    </div>
  )
}
function Empty({ T }) {
  return <div style={{ textAlign:'center', padding:'50px 20px', background:T.surface, border:`1px dashed ${T.border}`, borderRadius:18 }}><div style={{ fontSize:40, marginBottom:8 }}>🎁</div><p style={{ fontSize:14.5, fontWeight:700, margin:'0 0 4px', color:T.text }}>No rewards yet</p><p style={{ fontSize:12.5, color:T.text3, margin:0 }}>The SK will post rewards soon!</p></div>
}
function Loader({ T }) {
  return <div style={{ display:'flex', justifyContent:'center', padding:50 }}><div style={{ width:30, height:30, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite' }}/><style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style></div>
}