// sk/Announcements.jsx — Secretary & Chairperson manage; others view
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const T = {
  bg:'#F7F8FA', card:'#FFFFFF', ink:'#111827', slate:'#6B7280', faint:'#9CA3AF',
  line:'#EEF0F3', indigo:'#4F46E5', indigoSoft:'#EEF0FF', emerald:'#059669', emeraldSoft:'#ECFDF5',
  rose:'#E11D48', roseSoft:'#FFF1F3', amber:'#D97706', amberSoft:'#FFFBEB', sky:'#0284C7',
}

const CATEGORIES = {
  general:  { label:'General',   color:T.indigo, bg:T.indigoSoft },
  event:    { label:'Event',     color:T.sky,    bg:'#F0F9FF' },
  urgent:   { label:'Urgent',    color:T.rose,   bg:T.roseSoft },
  reminder: { label:'Reminder',  color:T.amber,  bg:T.amberSoft },
}

const field = { width:'100%', padding:'10px 12px', border:`1px solid ${T.line}`, borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl   = { fontSize:11, fontWeight:700, color:T.slate, textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:6 }

export default function SKAnnouncements() {
  const { user } = useAuth()
  const canManage = ['sk_chairperson','sk_secretary'].includes(user?.role)

  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(true)
  const [modal,setModal]=useState(false)
  const [msg,setMsg]=useState('')

  const load=async()=>{
    try{ const r=await axios.get(`${API}/announcements`); setItems(r.data.announcements||[]) }catch { /* ignore */ }
    setLoading(false)
  }
  useEffect(()=>{ load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  const flash=m=>{ setMsg(m); setTimeout(()=>setMsg(''),3000) }

  const remove=async(id)=>{
    if(!window.confirm('Delete this announcement?')) return
    await axios.delete(`${API}/announcements/${id}`)
    flash('Announcement deleted.'); load()
  }

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:T.ink }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, margin:0, letterSpacing:'-0.5px' }}>Announcements</h1>
          <p style={{ fontSize:12.5, color:T.slate, marginTop:4 }}>
            {canManage ? 'Post updates for SK members and kabataan.' : 'Latest updates from the SK.'}
          </p>
        </div>
        {canManage && <button onClick={()=>setModal(true)} style={{ padding:'10px 16px', background:T.indigo, color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>+ New Announcement</button>}
      </div>

      {msg && <div style={{ background:T.emeraldSoft, border:'1px solid #A7F3D0', color:T.emerald, padding:'10px 16px', borderRadius:10, marginBottom:16, fontSize:13, fontWeight:600 }}>✓ {msg}</div>}

      {loading ? <div style={{ textAlign:'center', padding:60, color:T.faint }}>Loading...</div>
        : items.length===0 ? (
          <div style={{ textAlign:'center', padding:60, background:T.card, border:`1px dashed ${T.line}`, borderRadius:14 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>📢</div>
            <p style={{ fontSize:14, fontWeight:600, margin:'0 0 4px' }}>No announcements yet</p>
            <p style={{ fontSize:12, color:T.slate, margin:0 }}>{canManage?'Post the first one.':'Check back later.'}</p>
          </div>
        ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {items.map(a=>{
            const cat=CATEGORIES[a.category]||CATEGORIES.general
            return (
              <div key={a._id} style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:14, padding:20, borderLeft:`4px solid ${cat.color}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:cat.bg, color:cat.color, textTransform:'uppercase' }}>{cat.label}</span>
                      <span style={{ fontSize:11, color:T.faint }}>{new Date(a.createdAt).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}</span>
                    </div>
                    <h3 style={{ fontSize:16, fontWeight:700, margin:'0 0 6px' }}>{a.title}</h3>
                    <p style={{ fontSize:13, color:T.slate, margin:0, lineHeight:1.6 }}>{a.content}</p>
                  </div>
                  {canManage && <button onClick={()=>remove(a._id)} style={{ padding:'5px 12px', fontSize:11, fontWeight:700, border:`1px solid ${T.line}`, borderRadius:8, background:'#fff', color:T.rose, cursor:'pointer', flexShrink:0 }}>Delete</button>}
                </div>
                {a.author && <div style={{ fontSize:11, color:T.faint, marginTop:8 }}>Posted by {a.author.firstName} {a.author.lastName}</div>}
              </div>
            )
          })}
        </div>
      )}

      {modal && <AnnouncementModal onClose={()=>setModal(false)} onSaved={()=>{setModal(false);load();flash('Announcement posted.')}}/>}
    </div>
  )
}

function AnnouncementModal({ onClose, onSaved }) {
  const [f,setF]=useState({ title:'', content:'', category:'general' })
  const [saving,setSaving]=useState(false)
  const save=async()=>{
    setSaving(true)
    try{ await axios.post(`${API}/announcements`,f); onSaved() }
    catch(e){ alert(e.response?.data?.message||'Error') } finally{ setSaving(false) }
  }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:500 }}>
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${T.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:16, fontWeight:700, margin:0 }}>New Announcement</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:T.slate, cursor:'pointer' }}>×</button>
        </div>
        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
          <div><label style={lbl}>Title</label><input style={field} value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Announcement title" /></div>
          <div><label style={lbl}>Category</label>
            <select style={field} value={f.category} onChange={e=>setF({...f,category:e.target.value})}>
              {Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Content</label><textarea style={{...field,minHeight:120,resize:'vertical'}} value={f.content} onChange={e=>setF({...f,content:e.target.value})} placeholder="Write the announcement..." /></div>
          <button onClick={save} disabled={saving||!f.title||!f.content} style={{ padding:'11px', background:T.indigo, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving||!f.title||!f.content?0.6:1 }}>{saving?'Posting...':'Post Announcement'}</button>
        </div>
      </div>
    </div>
  )
}