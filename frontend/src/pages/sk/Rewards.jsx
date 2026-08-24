// sk/Rewards.jsx — SK manages Rewards + awards Points to kabataan
// Two tabs: Rewards (create/manage) and Award Points (manual + bulk attendance)

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const T = {
  bg:'#F7F8FA', card:'#FFFFFF', ink:'#111827', slate:'#6B7280', faint:'#9CA3AF',
  line:'#EEF0F3', indigo:'#4F46E5', indigoSoft:'#EEF0FF',
  emerald:'#059669', emeraldSoft:'#ECFDF5', amber:'#D97706', amberSoft:'#FFFBEB',
  rose:'#E11D48', roseSoft:'#FFF1F3', violet:'#7C3AED', violetSoft:'#F5F3FF',
}

const field = { width:'100%', padding:'10px 12px', border:`1px solid ${T.line}`, borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl   = { fontSize:11, fontWeight:700, color:T.slate, textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:6 }

export default function SKRewards() {
  const [tab,setTab]=useState('rewards')
  return (
    <div style={{fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",color:T.ink}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,margin:0,letterSpacing:'-0.5px'}}>Rewards & Points</h1>
        <p style={{fontSize:12.5,color:T.slate,margin:'4px 0 0'}}>Create rewards kabataan can redeem, and award points for participation.</p>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:`1px solid ${T.line}`}}>
        {[['rewards','Rewards Catalog'],['award','Award Points'],['leaderboard','Leaderboard']].map(([k,label])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'10px 18px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:700,color:tab===k?T.indigo:T.slate,borderBottom:tab===k?`2px solid ${T.indigo}`:'2px solid transparent',marginBottom:-1}}>{label}</button>
        ))}
      </div>

      {tab==='rewards' ? <RewardsTab/> : tab==='award' ? <AwardTab/> : <LeaderboardTab/>}
    </div>
  )
}

// ═══ REWARDS CATALOG ═══
function RewardsTab() {
  const [rewards,setRewards]=useState([])
  const [loading,setLoading]=useState(true)
  const [show,setShow]=useState(false)
  const [editing,setEditing]=useState(null)
  const [msg,setMsg]=useState('')

  const load=()=>{ axios.get(`${API}/rewards`).then(r=>setRewards(r.data.rewards)).finally(()=>setLoading(false)) }
  useEffect(()=>{load()},[])
  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(''),3000)}

  const remove=async(id,title)=>{ if(!confirm(`Remove reward "${title}"?`))return; await axios.delete(`${API}/rewards/${id}`); flash('Reward removed.'); load() }

  return (
    <div>
      {msg && <div style={{background:T.emeraldSoft,border:'1px solid #A7F3D0',color:T.emerald,padding:'10px 16px',borderRadius:10,marginBottom:16,fontSize:13,fontWeight:600}}>✓ {msg}</div>}

      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <button onClick={()=>{setEditing(null);setShow(true)}} style={{padding:'9px 16px',background:T.indigo,color:'#fff',border:'none',borderRadius:10,fontSize:12.5,fontWeight:600,cursor:'pointer'}}>+ New Reward</button>
      </div>

      {loading?<p style={{textAlign:'center',color:T.faint,padding:40}}>Loading…</p>:
       rewards.length===0?(
        <div style={{textAlign:'center',padding:60,background:T.card,border:`1px dashed ${T.line}`,borderRadius:16}}>
          <div style={{fontSize:40,marginBottom:12}}>🎁</div>
          <p style={{fontSize:14,fontWeight:600,margin:'0 0 4px'}}>No rewards yet</p>
          <p style={{fontSize:12,color:T.slate,margin:0}}>Create rewards that kabataan can redeem with their points.</p>
        </div>
       ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
          {rewards.map(r=>(
            <div key={r._id} style={{background:T.card,border:`1px solid ${T.line}`,borderRadius:16,overflow:'hidden'}}>
              <div style={{height:140,background:r.image?`url(${r.image}) center/cover`:T.violetSoft,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {!r.image && <span style={{fontSize:44}}>🎁</span>}
              </div>
              <div style={{padding:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:6}}>
                  <h3 style={{fontSize:14,fontWeight:700,margin:0}}>{r.title}</h3>
                  <span style={{fontSize:11,fontWeight:800,color:T.violet,background:T.violetSoft,padding:'3px 10px',borderRadius:999,whiteSpace:'nowrap'}}>{r.pointsRequired} pts</span>
                </div>
                {r.description && <p style={{fontSize:11.5,color:T.slate,margin:'0 0 10px',lineHeight:1.4}}>{r.description}</p>}
                <div style={{fontSize:10.5,color:T.faint,marginBottom:12}}>{r.stock===-1?'Unlimited stock':`${r.stock} in stock`}</div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>{setEditing(r);setShow(true)}} style={{flex:1,padding:'7px',background:T.bg,color:T.ink,border:`1px solid ${T.line}`,borderRadius:8,fontSize:11.5,fontWeight:600,cursor:'pointer'}}>Edit</button>
                  <button onClick={()=>remove(r._id,r.title)} style={{padding:'7px 12px',background:T.roseSoft,color:T.rose,border:'none',borderRadius:8,fontSize:11.5,fontWeight:600,cursor:'pointer'}}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
       )}

      {show && <RewardModal reward={editing} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load();flash(editing?'Reward updated.':'Reward created.')}} />}
    </div>
  )
}

function RewardModal({ reward, onClose, onSaved }) {
  const [f,setF]=useState({ title:reward?.title||'', description:reward?.description||'', pointsRequired:reward?.pointsRequired||'', stock:reward?.stock ?? -1, image:reward?.image||'' })
  const [saving,setSaving]=useState(false)
  const [uploading,setUploading]=useState(false)
  const fileRef=useRef()

  const upload=async(file)=>{
    if(!file)return; setUploading(true)
    const fd=new FormData(); fd.append('file',file)
    try{ const {data}=await axios.post(`${API}/upload/photo`,fd,{headers:{'Content-Type':'multipart/form-data'}}); setF(x=>({...x,image:data.url})) }
    catch{alert('Upload failed')}finally{setUploading(false)}
  }
  const save=async()=>{
    setSaving(true)
    try{
      const payload={...f,pointsRequired:Number(f.pointsRequired),stock:Number(f.stock)}
      if(reward) await axios.put(`${API}/rewards/${reward._id}`,payload)
      else await axios.post(`${API}/rewards`,payload)
      onSaved()
    }catch(e){alert(e.response?.data?.message||'Error')}finally{setSaving(false)}
  }

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(17,24,39,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:460,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{padding:'18px 22px',borderBottom:`1px solid ${T.line}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{fontSize:16,fontWeight:700,margin:0}}>{reward?'Edit Reward':'New Reward'}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,color:T.slate,cursor:'pointer'}}>×</button>
        </div>
        <div style={{padding:22,display:'flex',flexDirection:'column',gap:14}}>
          {/* Image */}
          <div>
            <label style={lbl}>Reward Image (optional)</label>
            <div onClick={()=>fileRef.current.click()} style={{height:150,borderRadius:10,border:`1px dashed ${T.line}`,background:f.image?`url(${f.image}) center/cover`:T.bg,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              {!f.image && <span style={{fontSize:12,color:T.slate}}>{uploading?'Uploading…':'📷 Click to upload image'}</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>upload(e.target.files[0])} />
          </div>
          <div><label style={lbl}>Reward Title</label><input style={field} value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="e.g. SK T-Shirt" /></div>
          <div><label style={lbl}>Description</label><textarea style={{...field,minHeight:60,resize:'vertical'}} value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="What is this reward?" /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={lbl}>Points Required</label><input type="number" style={field} value={f.pointsRequired} onChange={e=>setF({...f,pointsRequired:e.target.value})} placeholder="100" /></div>
            <div><label style={lbl}>Stock (-1 = ∞)</label><input type="number" style={field} value={f.stock} onChange={e=>setF({...f,stock:e.target.value})} placeholder="-1" /></div>
          </div>
          <button onClick={save} disabled={saving||!f.title||!f.pointsRequired} style={{padding:'11px',background:T.indigo,color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving||!f.title||!f.pointsRequired?0.6:1}}>{saving?'Saving…':reward?'Update Reward':'Create Reward'}</button>
        </div>
      </div>
    </div>
  )
}

// ═══ AWARD POINTS ═══
function AwardTab() {
  const [kabataan,setKabataan]=useState([])
  const [selected,setSelected]=useState([])
  const [points,setPoints]=useState('')
  const [reason,setReason]=useState('')
  const [search,setSearch]=useState('')
  const [loading,setLoading]=useState(true)
  const [msg,setMsg]=useState('')
  const [saving,setSaving]=useState(false)

  useEffect(()=>{ axios.get(`${API}/auth/members?role=kabataan`).then(r=>setKabataan(r.data.users)).catch(()=>{
    // fallback if admin route not accessible to SK — use members endpoint
    axios.get(`${API}/points/leaderboard`).then(r=>setKabataan(r.data.leaderboard||[])).catch(()=>{})
  }).finally(()=>setLoading(false)) },[])

  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(''),3500)}
  const shown=kabataan.filter(k=>search===''||`${k.firstName} ${k.lastName}`.toLowerCase().includes(search.toLowerCase()))
  const toggle=(id)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])
  const allShown=shown.length>0 && shown.every(k=>selected.includes(k._id))
  const toggleAll=()=>{ if(allShown) setSelected(s=>s.filter(id=>!shown.find(k=>k._id===id))); else setSelected(s=>[...new Set([...s,...shown.map(k=>k._id)])]) }

  const award=async()=>{
    if(selected.length===0)return flash('Select at least one kabataan.')
    if(!points||Number(points)<=0)return flash('Enter valid points.')
    if(!reason)return flash('Enter a reason.')
    setSaving(true)
    try{
      if(selected.length===1){
        await axios.post(`${API}/points/award`,{userId:selected[0],points:Number(points),reason})
      }else{
        await axios.post(`${API}/points/bulk-award`,{userIds:selected,points:Number(points),reason})
      }
      flash(`Awarded ${points} pts to ${selected.length} kabataan.`)
      setSelected([]); setPoints(''); setReason('')
    }catch(e){flash(e.response?.data?.message||'Error')}finally{setSaving(false)}
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:16}}>
      {/* Left: pick kabataan */}
      <div style={{background:T.card,border:`1px solid ${T.line}`,borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.line}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:14,fontWeight:700}}>Select Kabataan</div>
          <button onClick={toggleAll} style={{fontSize:11.5,fontWeight:600,color:T.indigo,background:'none',border:'none',cursor:'pointer'}}>{allShown?'Deselect all':'Select all'}</button>
        </div>
        <div style={{padding:12}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search kabataan…" style={{...field,marginBottom:10}} />
          <div style={{maxHeight:380,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
            {loading?<p style={{textAlign:'center',color:T.faint,padding:20,fontSize:12}}>Loading…</p>:
             shown.length===0?<p style={{textAlign:'center',color:T.faint,padding:20,fontSize:12}}>No kabataan found</p>:
             shown.map(k=>{
              const on=selected.includes(k._id)
              return (
                <div key={k._id} onClick={()=>toggle(k._id)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:10,cursor:'pointer',background:on?T.indigoSoft:T.bg,border:`1px solid ${on?T.indigo:'transparent'}`}}>
                  <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${on?T.indigo:T.line}`,background:on?T.indigo:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {on && <span style={{color:'#fff',fontSize:12,fontWeight:800}}>✓</span>}
                  </div>
                  <div style={{width:32,height:32,borderRadius:'50%',background:T.violetSoft,color:T.violet,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>{k.firstName?.[0]}{k.lastName?.[0]}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{k.firstName} {k.lastName}</div><div style={{fontSize:11,color:T.faint}}>{k.points||0} pts</div></div>
                </div>
              )
             })}
          </div>
        </div>
      </div>

      {/* Right: award form */}
      <div>
        <div style={{background:T.card,border:`1px solid ${T.line}`,borderRadius:16,padding:20,position:'sticky',top:20}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Award Points</div>
          <div style={{fontSize:11.5,color:T.faint,marginBottom:16}}>{selected.length} kabataan selected</div>
          {msg && <div style={{background:T.emeraldSoft,border:'1px solid #A7F3D0',color:T.emerald,padding:'9px 12px',borderRadius:8,marginBottom:14,fontSize:12,fontWeight:600}}>{msg}</div>}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Points to Award (each)</label><input type="number" style={field} value={points} onChange={e=>setPoints(e.target.value)} placeholder="e.g. 10" /></div>
            <div><label style={lbl}>Reason</label><textarea style={{...field,minHeight:70,resize:'vertical'}} value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Attended General Assembly / Volunteered in feeding program" /></div>
            <div style={{background:T.bg,borderRadius:8,padding:'10px 12px',fontSize:11,color:T.slate,lineHeight:1.5}}>
              💡 Use this for meeting attendance, volunteering, or special recognition (e.g. PWD participation). Everyone selected gets the same points.
            </div>
            <button onClick={award} disabled={saving||selected.length===0} style={{padding:'11px',background:T.violet,color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving||selected.length===0?0.6:1}}>
              {saving?'Awarding…':`Award to ${selected.length} kabataan`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══ LEADERBOARD ═══
function LeaderboardTab() {
  const [board,setBoard]=useState([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{ axios.get(`${API}/points/leaderboard`).then(r=>setBoard(r.data.leaderboard||[])).finally(()=>setLoading(false)) },[])

  const medal=(i)=>i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`

  return (
    <div style={{maxWidth:640}}>
      <div style={{background:T.card,border:`1px solid ${T.line}`,borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${T.line}`,background:`linear-gradient(135deg,${T.violet},${T.indigo})`}}>
          <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>🏆 Top Point Earners</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginTop:2}}>Kabataan ranked by total points</div>
        </div>
        {loading?<p style={{textAlign:'center',color:T.faint,padding:40}}>Loading…</p>:
         board.length===0?<p style={{textAlign:'center',color:T.faint,padding:40,fontSize:13}}>No points awarded yet</p>:
         board.map((k,i)=>(
          <div key={k._id||i} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 20px',borderBottom:i<board.length-1?`1px solid ${T.line}`:'none',background:i<3?T.violetSoft+'55':'transparent'}}>
            <div style={{width:34,textAlign:'center',fontSize:i<3?20:13,fontWeight:800,color:i<3?T.violet:T.faint}}>{medal(i)}</div>
            <div style={{width:38,height:38,borderRadius:'50%',background:T.violetSoft,color:T.violet,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}}>{k.firstName?.[0]}{k.lastName?.[0]}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600}}>{k.firstName} {k.lastName}</div>
              <div style={{fontSize:11,color:T.faint}}>{k.barangay||'Tawiran'}</div>
            </div>
            <div style={{fontSize:18,fontWeight:800,color:T.violet}}>{k.points||0}<span style={{fontSize:11,fontWeight:600,color:T.faint,marginLeft:3}}>pts</span></div>
          </div>
         ))}
      </div>
    </div>
  )
}