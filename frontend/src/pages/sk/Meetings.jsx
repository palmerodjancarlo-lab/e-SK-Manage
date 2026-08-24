// sk/Meetings.jsx — SK meetings/events management + QR activation
// SK creates meetings (auto-generates QR token), activates the QR at event time,
// and displays a full-screen QR for kabataan to scan and earn points.

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { QRCodeCanvas } from 'qrcode.react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const T = {
  bg:'#F7F8FA', card:'#FFFFFF', ink:'#111827', slate:'#6B7280', faint:'#9CA3AF',
  line:'#EEF0F3', indigo:'#4F46E5', indigoSoft:'#EEF0FF',
  emerald:'#059669', emeraldSoft:'#ECFDF5', amber:'#D97706', amberSoft:'#FFFBEB',
  rose:'#E11D48', roseSoft:'#FFF1F3',
}

const field = { width:'100%', padding:'10px 12px', border:`1px solid ${T.line}`, borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl   = { fontSize:11, fontWeight:700, color:T.slate, textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:6 }

const SK_MANAGE = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad','admin']

export default function SKMeetings() {
  const { user } = useAuth()
  const canManage = SK_MANAGE.includes(user?.role)

  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [modal,setModal]=useState(false)
  const [qrMeeting,setQrMeeting]=useState(null)
  const [msg,setMsg]=useState('')

  const load = async () => {
    try{ const r=await axios.get(`${API}/meetings`); setItems((r.data.meetings||[]).sort((a,b)=>new Date(b.date)-new Date(a.date))) }catch{ /* ignore */ }
    setLoading(false)
  }
  useEffect(()=>{
    let active = true
    axios.get(`${API}/meetings`)
      .then(r=>{ if(active) setItems((r.data.meetings||[]).sort((a,b)=>new Date(b.date)-new Date(a.date))) })
      .catch(()=>{})
      .finally(()=>{ if(active) setLoading(false) })
    return ()=>{ active=false }
  },[])
  const flash=(m)=>{ setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const del = async (id) => {
    if(!confirm('Delete this meeting?')) return
    await axios.delete(`${API}/meetings/${id}`); flash('Meeting deleted.'); load()
  }

  const now = new Date()
  const upcoming = items.filter(m=>new Date(m.date)>=now)
  const past     = items.filter(m=>new Date(m.date)<now)

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:T.ink }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, margin:0, letterSpacing:'-0.5px' }}>Meetings & Events</h1>
          <p style={{ fontSize:12.5, color:T.slate, margin:'4px 0 0' }}>Create events and activate QR check-in so kabataan earn points.</p>
        </div>
        {canManage && <button onClick={()=>setModal(true)} style={{ padding:'9px 16px', background:T.indigo, color:'#fff', border:'none', borderRadius:10, fontSize:12.5, fontWeight:600, cursor:'pointer' }}>+ New Meeting</button>}
      </div>

      {msg && <div style={{ background:T.emeraldSoft, border:'1px solid #A7F3D0', color:T.emerald, padding:'10px 16px', borderRadius:10, marginBottom:16, fontSize:13, fontWeight:600 }}>✓ {msg}</div>}

      {loading ? <p style={{ textAlign:'center', color:T.faint, padding:40 }}>Loading…</p> : (
        <>
          {/* Upcoming */}
          <h2 style={{ fontSize:14, fontWeight:700, color:T.slate, margin:'0 0 12px' }}>Upcoming ({upcoming.length})</h2>
          {upcoming.length===0
            ? <div style={{ background:T.card, border:`1px dashed ${T.line}`, borderRadius:14, padding:30, textAlign:'center', color:T.faint, fontSize:13, marginBottom:24 }}>No upcoming meetings</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:28 }}>
                {upcoming.map(m=><MeetingCard key={m._id} m={m} canManage={canManage} onDelete={()=>del(m._id)} onShowQR={()=>setQrMeeting(m)} onRefreshed={load} flash={flash} />)}
              </div>}

          {/* Past */}
          {past.length>0 && <>
            <h2 style={{ fontSize:14, fontWeight:700, color:T.slate, margin:'0 0 12px' }}>Past ({past.length})</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {past.map(m=><MeetingCard key={m._id} m={m} canManage={canManage} onDelete={()=>del(m._id)} onShowQR={()=>setQrMeeting(m)} onRefreshed={load} flash={flash} />)}
            </div>
          </>}
        </>
      )}

      {modal && <MeetingModal onClose={()=>setModal(false)} onSaved={()=>{ setModal(false); load(); flash('Meeting created with QR ready.') }} />}
      {qrMeeting && <QRModal meeting={qrMeeting} onClose={()=>{ setQrMeeting(null); load() }} flash={flash} />}
    </div>
  )
}

function MeetingCard({ m, canManage, onDelete, onShowQR }) {
  const d = new Date(m.date)
  const pts = m.pointsReward || m.points || 0
  return (
    <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:14, padding:16, display:'flex', gap:16, alignItems:'center' }}>
      <div style={{ width:56, height:56, borderRadius:12, background:T.indigoSoft, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontSize:20, fontWeight:800, color:T.indigo, lineHeight:1 }}>{d.getDate()}</span>
        <span style={{ fontSize:10, color:T.slate, textTransform:'uppercase' }}>{d.toLocaleDateString('en-PH',{month:'short'})}</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <h3 style={{ fontSize:15, fontWeight:700, margin:0 }}>{m.title}</h3>
          {m.qrActive && <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:999, background:T.emeraldSoft, color:T.emerald }}>QR LIVE</span>}
        </div>
        <p style={{ fontSize:12, color:T.faint, margin:'4px 0 0' }}>
          {d.toLocaleDateString('en-PH',{weekday:'short',month:'long',day:'numeric'})} · {d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}
          {m.location && ` · ${m.location}`}{pts>0 && ` · ⭐ ${pts} pts`}
        </p>
      </div>
      {canManage && (
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <button onClick={onShowQR} style={{ padding:'8px 14px', background:m.qrActive?T.emerald:T.indigo, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
            {m.qrActive?'Show QR':'Activate QR'}
          </button>
          <button onClick={onDelete} style={{ padding:'8px 12px', background:T.roseSoft, color:T.rose, border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>Delete</button>
        </div>
      )}
    </div>
  )
}

// ── QR full-screen display ──
function QRModal({ meeting, onClose, flash }) {
  const [qr,setQr]=useState({ token:meeting.qrToken, active:meeting.qrActive })
  const [duration,setDuration]=useState(60)
  const [checkins,setCheckins]=useState([])
  const [loading,setLoading]=useState(false)

  const loadCheckins = async () => {
    try{ const r=await axios.get(`${API}/meetings/${meeting._id}/checkins`); setCheckins(r.data.checkins||r.data.attendees||[]) }catch{ /* ignore */ }
  }
  useEffect(()=>{ loadCheckins(); const t=setInterval(loadCheckins,5000); return ()=>clearInterval(t) },[]) // eslint-disable-line

  const activate = async () => {
    setLoading(true)
    try{
      const r=await axios.post(`${API}/meetings/${meeting._id}/generate-qr`,{ durationMinutes:Number(duration) })
      setQr({ token:r.data.qrToken, active:true }); flash('QR activated!')
    }catch(e){ alert(e.response?.data?.message||'Error') } finally{ setLoading(false) }
  }
  const deactivate = async () => {
    setLoading(true)
    try{ await axios.put(`${API}/meetings/${meeting._id}/deactivate-qr`); setQr(q=>({...q,active:false})); flash('QR deactivated.') }
    catch(e){ alert(e.response?.data?.message||'Error') } finally{ setLoading(false) }
  }

  // The value kabataan scans — the token itself
  const qrValue = qr.token || ''

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:440, maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${T.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontSize:17, fontWeight:800, margin:0 }}>{meeting.title}</h3>
            <p style={{ fontSize:12, color:T.faint, margin:'2px 0 0' }}>QR Check-in</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, color:T.slate, cursor:'pointer' }}>×</button>
        </div>

        <div style={{ padding:24, textAlign:'center' }}>
          {qr.active && qrValue ? (
            <>
              <div style={{ display:'inline-block', padding:20, background:'#fff', borderRadius:16, border:`3px solid ${T.indigo}`, marginBottom:16 }}>
                <QRCodeCanvas value={qrValue} size={240} level="M" includeMargin={false} />
              </div>
              <p style={{ fontSize:14, fontWeight:700, color:T.emerald, margin:'0 0 4px' }}>✓ QR is LIVE — ready to scan</p>
              <p style={{ fontSize:12, color:T.slate, margin:'0 0 20px' }}>Kabataan: open the Scan tab and point your camera here.</p>
              <button onClick={deactivate} disabled={loading} style={{ padding:'10px 20px', background:T.roseSoft, color:T.rose, border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>Stop / Deactivate QR</button>
            </>
          ) : (
            <>
              <div style={{ width:240, height:240, margin:'0 auto 20px', borderRadius:16, border:`2px dashed ${T.line}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:T.faint, background:T.bg }}>
                <span style={{ fontSize:48 }}>📷</span>
                <span style={{ fontSize:13, marginTop:8 }}>QR not active yet</span>
              </div>
              <div style={{ marginBottom:16, textAlign:'left' }}>
                <label style={lbl}>QR active for (minutes)</label>
                <input type="number" style={field} value={duration} onChange={e=>setDuration(e.target.value)} />
              </div>
              <button onClick={activate} disabled={loading} style={{ padding:'12px 24px', background:T.indigo, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', width:'100%' }}>
                {loading?'Activating…':'🚀 Activate QR Check-in'}
              </button>
            </>
          )}

          {/* Live check-ins */}
          <div style={{ marginTop:24, textAlign:'left', borderTop:`1px solid ${T.line}`, paddingTop:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:700 }}>Checked in ({checkins.length})</span>
              <span style={{ fontSize:10, color:T.faint }}>Auto-refreshing…</span>
            </div>
            {checkins.length===0
              ? <p style={{ fontSize:12, color:T.faint, textAlign:'center', padding:'16px 0' }}>No check-ins yet</p>
              : <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:180, overflowY:'auto' }}>
                  {checkins.map((c,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:T.bg, borderRadius:8 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:T.indigo, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
                        {(c.user?.firstName||c.firstName||'?')[0]}{(c.user?.lastName||c.lastName||'')[0]}
                      </div>
                      <span style={{ fontSize:12.5, fontWeight:600 }}>{c.user?.firstName||c.firstName} {c.user?.lastName||c.lastName}</span>
                      <span style={{ fontSize:11, color:T.emerald, marginLeft:'auto', fontWeight:700 }}>✓</span>
                    </div>
                  ))}
                </div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function MeetingModal({ onClose, onSaved }) {
  const [f,setF]=useState({ title:'', description:'', date:'', time:'', location:'', pointsValue:'10' })
  const [saving,setSaving]=useState(false)
  const save=async()=>{
    setSaving(true)
    try{
      const datetime=new Date(`${f.date}T${f.time||'00:00'}`).toISOString()
      await axios.post(`${API}/meetings`,{ title:f.title, description:f.description, date:datetime, venue:f.location, pointsReward:Number(f.pointsValue)||0 })
      onSaved()
    }catch(e){ alert(e.response?.data?.message||'Error') } finally{ setSaving(false) }
  }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(17,24,39,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:16, fontWeight:700, margin:0 }}>New Meeting / Event</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:T.slate, cursor:'pointer' }}>×</button>
        </div>
        <div style={{ padding:22, display:'flex', flexDirection:'column', gap:14 }}>
          <div><label style={lbl}>Title</label><input style={field} value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="e.g. General Assembly" /></div>
          <div><label style={lbl}>Description</label><textarea style={{...field,minHeight:60,resize:'vertical'}} value={f.description} onChange={e=>setF({...f,description:e.target.value})} /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={lbl}>Date</label><input type="date" style={field} value={f.date} onChange={e=>setF({...f,date:e.target.value})} /></div>
            <div><label style={lbl}>Time</label><input type="time" style={field} value={f.time} onChange={e=>setF({...f,time:e.target.value})} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
            <div><label style={lbl}>Location</label><input style={field} value={f.location} onChange={e=>setF({...f,location:e.target.value})} placeholder="Barangay Hall" /></div>
            <div><label style={lbl}>Points ⭐</label><input type="number" style={field} value={f.pointsValue} onChange={e=>setF({...f,pointsValue:e.target.value})} /></div>
          </div>
          <p style={{ fontSize:11, color:T.slate, margin:0, background:T.indigoSoft, padding:'9px 12px', borderRadius:8 }}>
            📷 A QR code is auto-created. Activate it at the event so kabataan can scan and earn the points.
          </p>
          <button onClick={save} disabled={saving||!f.title||!f.date} style={{ padding:'11px', background:T.indigo, color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving||!f.title||!f.date?0.6:1 }}>{saving?'Creating…':'Create Meeting'}</button>
        </div>
      </div>
    </div>
  )
}