// kabataan/Settings.jsx — profile with avatar, residency, password
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom'
import AvatarUploader from '../../components/AvatarUploader'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export default function KabataanSettings() {
  const { user, setUser, logout } = useAuth()
  const { T, mode, setMode } = useTheme()
  const nav = useNavigate()
  const [tab,setTab]=useState('profile')
  const [profile,setProfile]=useState({ firstName:'', lastName:'', email:'', contactNumber:'', purok:'', address:'', photo:'' })
  const [pw,setPw]=useState({ currentPassword:'', newPassword:'', confirm:'' })
  const [saving,setSaving]=useState(false)

  useEffect(()=>{ if(user) setProfile({ firstName:user.firstName||'', lastName:user.lastName||'', email:user.email||'', contactNumber:user.contactNumber||'', purok:user.purok||'', address:user.address||'', photo:user.photo||'' }) },[user])

  const persistPhoto = async (url) => {
    setProfile(p=>({ ...p, photo:url }))
    try {
      await axios.put(`${API}/auth/profile`, { ...profile, photo:url })
      if(setUser) setUser(u=>({ ...u, photo:url }))
    } catch { toast.error('Could not save photo.') }
  }
  const saveProfile = async () => {
    setSaving(true)
    try {
      const { data } = await axios.put(`${API}/auth/profile`, { firstName:profile.firstName, lastName:profile.lastName, email:profile.email, contactNumber:profile.contactNumber, purok:profile.purok, address:profile.address, photo:profile.photo })
      if(setUser && data.user) setUser(data.user)
      toast.success('Profile updated!')
    } catch(e){ toast.error(e.response?.data?.message||'Update failed.') } finally { setSaving(false) }
  }
  const changePw = async () => {
    if(pw.newPassword!==pw.confirm) return toast.error('Passwords do not match.')
    if(pw.newPassword.length<6) return toast.error('Password must be at least 6 characters.')
    setSaving(true)
    try { await axios.put(`${API}/auth/change-password`, { currentPassword:pw.currentPassword, newPassword:pw.newPassword }); toast.success('Password changed!'); setPw({currentPassword:'',newPassword:'',confirm:''}) }
    catch(e){ toast.error(e.response?.data?.message||'Failed.') } finally { setSaving(false) }
  }
  const handleLogout=()=>{ logout(); nav('/login') }

  const field = { width:'100%', padding:'11px 13px', border:`1px solid ${T.border}`, borderRadius:11, fontSize:14, outline:'none', boxSizing:'border-box', background:T.surface, color:T.text, fontFamily:'inherit' }
  const lbl = { fontSize:11.5, fontWeight:700, color:T.text2, display:'block', marginBottom:6 }

  return (
    <div>
      {/* Profile hero */}
      <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, padding:'28px 20px', color:'#fff', textAlign:'center', borderRadius:'0 0 20px 20px' }}>
        <div style={{ width:74, height:74, borderRadius:'50%', background: profile.photo?`url(${profile.photo}) center/cover`:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:800, margin:'0 auto 12px', border:'3px solid rgba(255,255,255,0.3)' }}>
          {!profile.photo && `${profile.firstName?.[0]||''}${profile.lastName?.[0]||''}`}
        </div>
        <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>{profile.firstName} {profile.lastName}</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>{profile.email}</p>
        <span style={{ display:'inline-block', marginTop:8, fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:999, background:'rgba(255,255,255,0.2)' }}>⭐ {user?.points||0} points</span>
      </div>

      <div style={{ padding:16, maxWidth:640, margin:'0 auto' }}>
        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:18, borderBottom:`1px solid ${T.border}` }}>
          {[['profile','Profile','user'],['security','Security','lock'],['appearance','Theme','sun']].map(([k,label,icon])=>(
            <button key={k} onClick={()=>setTab(k)} style={{ padding:'10px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:tab===k?T.accentText:T.text2, borderBottom:tab===k?`2px solid ${T.accent}`:'2px solid transparent', marginBottom:-1, display:'flex', alignItems:'center', gap:6 }}><Icon name={icon} size={15}/> {label}</button>
          ))}
        </div>

        {tab==='profile' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card T={T} title="Profile Photo">
              <AvatarUploader T={T} currentPhoto={profile.photo} name={`${profile.firstName} ${profile.lastName}`} onUploaded={persistPhoto} />
            </Card>
            <Card T={T} title="My Information">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div><label style={lbl}>First Name</label><input style={field} value={profile.firstName} onChange={e=>setProfile({...profile,firstName:e.target.value})}/></div>
                <div><label style={lbl}>Last Name</label><input style={field} value={profile.lastName} onChange={e=>setProfile({...profile,lastName:e.target.value})}/></div>
              </div>
              <div style={{ marginBottom:14 }}><label style={lbl}>Email</label><input type="email" style={field} value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})}/></div>
              <div style={{ marginBottom:14 }}><label style={lbl}>Contact Number</label><input style={field} value={profile.contactNumber} onChange={e=>setProfile({...profile,contactNumber:e.target.value})} placeholder="09xx-xxx-xxxx"/></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div><label style={lbl}>Purok / Sitio</label><input style={field} value={profile.purok} onChange={e=>setProfile({...profile,purok:e.target.value})} placeholder="e.g. Purok 1"/></div>
                <div><label style={lbl}>Address</label><input style={field} value={profile.address} onChange={e=>setProfile({...profile,address:e.target.value})} placeholder="Brgy. Tawiran"/></div>
              </div>
              <button onClick={saveProfile} disabled={saving} style={{ width:'100%', padding:'12px', background:`linear-gradient(135deg,${T.accent},${T.violet})`, color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>{saving?'Saving...':'Save Changes'}</button>
            </Card>
          </div>
        )}

        {tab==='security' && (
          <Card T={T} title="Change Password">
            <div style={{ marginBottom:14 }}><label style={lbl}>Current Password</label><input type="password" style={field} value={pw.currentPassword} onChange={e=>setPw({...pw,currentPassword:e.target.value})}/></div>
            <div style={{ marginBottom:14 }}><label style={lbl}>New Password</label><input type="password" style={field} value={pw.newPassword} onChange={e=>setPw({...pw,newPassword:e.target.value})} placeholder="Min. 6 characters"/></div>
            <div style={{ marginBottom:16 }}><label style={lbl}>Confirm New Password</label><input type="password" style={field} value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})}/></div>
            <button onClick={changePw} disabled={saving||!pw.currentPassword||!pw.newPassword} style={{ width:'100%', padding:'12px', background:T.ink||T.text, color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', opacity:(!pw.currentPassword||!pw.newPassword)?0.6:1 }}>{saving?'Updating...':'Update Password'}</button>
          </Card>
        )}

        {tab==='appearance' && (
          <Card T={T} title="Appearance">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[{ m:'light', label:'Light' },{ m:'dark', label:'Dark' }].map(opt=>{
                const sel=mode===opt.m
                return (
                  <button key={opt.m} onClick={()=>setMode(opt.m)} style={{ padding:16, borderRadius:12, cursor:'pointer', textAlign:'left', border:sel?`2px solid ${T.accent}`:`1px solid ${T.border}`, background:sel?T.accentSoft:T.surface }}>
                    <div style={{ height:50, borderRadius:8, marginBottom:10, background:opt.m==='dark'?'#0A1017':'#EEF1F6', border:`1px solid ${T.border}` }}/>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <Icon name={opt.m==='dark'?'moon':'sun'} size={15} color={T.text}/>
                      <span style={{ fontSize:14, fontWeight:700, color:T.text }}>{opt.label}</span>
                      {sel && <span style={{ marginLeft:'auto', color:T.accent }}><Icon name="check" size={16}/></span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        )}

        <button onClick={handleLogout} style={{ width:'100%', padding:'13px', background:T.redSoft, color:T.red, border:'none', borderRadius:14, fontSize:14, fontWeight:700, cursor:'pointer', marginTop:16 }}>Log Out</button>
      </div>
    </div>
  )
}
function Card({ T, title, children }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, overflow:'hidden', boxShadow:T.shadow }}>
      <div style={{ padding:'15px 18px', borderBottom:`1px solid ${T.border}` }}><p style={{ fontSize:15, fontWeight:800, margin:0, color:T.text }}>{title}</p></div>
      <div style={{ padding:18 }}>{children}</div>
    </div>
  )
}