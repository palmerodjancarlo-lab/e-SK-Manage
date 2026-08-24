// kabataan/Settings.jsx — profile, password, account
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const C = { bg:'#F4F6FB', card:'#fff', ink:'#0F1F5C', slate:'#64748B', faint:'#94A3B8', line:'#EAEDF3', indigo:'#4F46E5', violet:'#7C3AED', emerald:'#059669', emeraldSoft:'#ECFDF5', rose:'#E11D48', roseSoft:'#FFF1F3' }
const field = { width:'100%', padding:'11px 13px', border:`1px solid ${C.line}`, borderRadius:11, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl = { fontSize:11.5, fontWeight:700, color:C.slate, display:'block', marginBottom:6 }

export default function KabataanSettings() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [profile,setProfile]=useState({ firstName:'', lastName:'', email:'', contactNumber:'' })
  const [pw,setPw]=useState({ currentPassword:'', newPassword:'', confirm:'' })
  const [msg,setMsg]=useState({ type:'', text:'' })
  const [saving,setSaving]=useState(false)

  useEffect(()=>{ if(user)setProfile({ firstName:user.firstName||'', lastName:user.lastName||'', email:user.email||'', contactNumber:user.contactNumber||'' }) },[user])
  const flash=(type,text)=>{ setMsg({type,text}); setTimeout(()=>setMsg({type:'',text:''}),4000) }

  const saveProfile=async()=>{
    setSaving(true)
    try{ await axios.put(`${API}/auth/profile`,{ firstName:profile.firstName, lastName:profile.lastName, email:profile.email, contactNumber:profile.contactNumber }); flash('success','Profile updated!') }
    catch(e){ flash('error',e.response?.data?.message||'Update failed.') } finally{ setSaving(false) }
  }
  const changePw=async()=>{
    if(pw.newPassword!==pw.confirm) return flash('error','Passwords do not match.')
    if(pw.newPassword.length<6) return flash('error','Password must be at least 6 characters.')
    setSaving(true)
    try{ await axios.put(`${API}/auth/change-password`,{ currentPassword:pw.currentPassword, newPassword:pw.newPassword }); flash('success','Password changed!'); setPw({currentPassword:'',newPassword:'',confirm:''}) }
    catch(e){ flash('error',e.response?.data?.message||'Failed.') } finally{ setSaving(false) }
  }
  const handleLogout=()=>{ logout(); nav('/login') }

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','Inter',sans-serif", color:C.ink }}>
      {/* profile hero */}
      <div style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', padding:'28px 20px', color:'#fff', textAlign:'center' }}>
        <div style={{ width:74, height:74, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:800, margin:'0 auto 12px', border:'3px solid rgba(255,255,255,0.3)' }}>
          {profile.firstName?.[0]}{profile.lastName?.[0]}
        </div>
        <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>{profile.firstName} {profile.lastName}</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>{profile.email}</p>
        <span style={{ display:'inline-block', marginTop:8, fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:999, background:'rgba(255,255,255,0.2)' }}>⭐ {user?.points||0} points</span>
      </div>

      <div style={{ padding:16 }}>
        {msg.text && <div style={{ padding:'12px 16px', borderRadius:12, marginBottom:16, fontSize:13, fontWeight:600, background:msg.type==='success'?C.emeraldSoft:C.roseSoft, color:msg.type==='success'?C.emerald:C.rose }}>{msg.type==='success'?'✓ ':'⚠ '}{msg.text}</div>}

        {/* profile */}
        <Card title="My Profile">
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label style={lbl}>First Name</label><input style={field} value={profile.firstName} onChange={e=>setProfile({...profile,firstName:e.target.value})}/></div>
              <div><label style={lbl}>Last Name</label><input style={field} value={profile.lastName} onChange={e=>setProfile({...profile,lastName:e.target.value})}/></div>
            </div>
            <div><label style={lbl}>Email</label><input type="email" style={field} value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})}/></div>
            <div><label style={lbl}>Contact Number</label><input style={field} value={profile.contactNumber} onChange={e=>setProfile({...profile,contactNumber:e.target.value})} placeholder="09xx-xxx-xxxx"/></div>
            <button onClick={saveProfile} disabled={saving} style={{ padding:'12px', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>{saving?'Saving...':'Save Changes'}</button>
          </div>
        </Card>

        {/* password */}
        <Card title="Change Password">
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label style={lbl}>Current Password</label><input type="password" style={field} value={pw.currentPassword} onChange={e=>setPw({...pw,currentPassword:e.target.value})}/></div>
            <div><label style={lbl}>New Password</label><input type="password" style={field} value={pw.newPassword} onChange={e=>setPw({...pw,newPassword:e.target.value})} placeholder="Min. 6 characters"/></div>
            <div><label style={lbl}>Confirm New Password</label><input type="password" style={field} value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})}/></div>
            <button onClick={changePw} disabled={saving||!pw.currentPassword||!pw.newPassword} style={{ padding:'12px', background:C.ink, color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', opacity:(!pw.currentPassword||!pw.newPassword)?0.6:1 }}>{saving?'Updating...':'Update Password'}</button>
          </div>
        </Card>

        <button onClick={handleLogout} style={{ width:'100%', padding:'13px', background:C.roseSoft, color:C.rose, border:'none', borderRadius:14, fontSize:14, fontWeight:700, cursor:'pointer', marginTop:4 }}>Log Out</button>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #EAEDF3', borderRadius:18, overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'15px 18px', borderBottom:'1px solid #EAEDF3' }}><p style={{ fontSize:15, fontWeight:800, margin:0 }}>{title}</p></div>
      <div style={{ padding:18 }}>{children}</div>
    </div>
  )
}