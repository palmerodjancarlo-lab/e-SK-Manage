// sk/Settings.jsx — SK official account settings
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const T = {
  bg:'#F7F8FA', card:'#FFFFFF', ink:'#111827', slate:'#6B7280', faint:'#9CA3AF',
  line:'#EEF0F3', indigo:'#4F46E5', emerald:'#059669', emeraldSoft:'#ECFDF5',
  rose:'#E11D48', roseSoft:'#FFF1F3',
}
const ROLE_LABEL = { sk_chairperson:'SK Chairperson', sk_secretary:'SK Secretary', sk_treasurer:'SK Treasurer', sk_kagawad:'SK Kagawad' }

const field = { width:'100%', padding:'10px 12px', border:`1px solid ${T.line}`, borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl   = { fontSize:11, fontWeight:700, color:T.slate, textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:6 }

function Card({ title, sub, children }) {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:16, overflow:'hidden', marginBottom:20 }}>
      <div style={{ padding:'16px 22px', borderBottom:`1px solid ${T.line}`, background:T.bg }}>
        <div style={{ fontSize:14, fontWeight:700 }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:T.slate, marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ padding:22 }}>{children}</div>
    </div>
  )
}

export default function SKSettings() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({ firstName:'', lastName:'', email:'', contactNumber:'' })
  const [pw, setPw] = useState({ currentPassword:'', newPassword:'', confirm:'' })
  const [msg, setMsg] = useState({ type:'', text:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) setProfile({ firstName:user.firstName||'', lastName:user.lastName||'', email:user.email||'', contactNumber:user.contactNumber||'' })
  }, [user])

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type:'', text:'' }), 4000) }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await axios.put(`${API}/auth/profile`, { firstName:profile.firstName, lastName:profile.lastName, contactNumber:profile.contactNumber })
      flash('success', 'Profile updated successfully.')
    } catch(e) { flash('error', e.response?.data?.message || 'Update failed.') }
    finally { setSaving(false) }
  }

  const changePassword = async () => {
    if (pw.newPassword !== pw.confirm) return flash('error', 'New passwords do not match.')
    if (pw.newPassword.length < 6) return flash('error', 'Password must be at least 6 characters.')
    setSaving(true)
    try {
      await axios.put(`${API}/auth/change-password`, { currentPassword:pw.currentPassword, newPassword:pw.newPassword })
      flash('success', 'Password changed successfully.')
      setPw({ currentPassword:'', newPassword:'', confirm:'' })
    } catch(e) { flash('error', e.response?.data?.message || 'Password change failed.') }
    finally { setSaving(false) }
  }

  const roleLabel = ROLE_LABEL[user?.role] || 'SK Official'

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:T.ink, maxWidth:640 }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0, letterSpacing:'-0.5px' }}>Settings</h1>
        <p style={{ fontSize:12.5, color:T.slate, marginTop:4 }}>Manage your account and security.</p>
      </div>

      {msg.text && (
        <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:20, fontSize:13, fontWeight:600,
          background: msg.type==='success'?T.emeraldSoft:T.roseSoft, color: msg.type==='success'?T.emerald:T.rose,
          border:`1px solid ${msg.type==='success'?'#A7F3D0':'#FECDD3'}` }}>
          {msg.type==='success'?'✓ ':'⚠ '}{msg.text}
        </div>
      )}

      {/* Banner */}
      <div style={{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)', borderRadius:16, padding:24, marginBottom:20, color:'#fff' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700 }}>
            {profile.firstName?.[0]}{profile.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:700 }}>{profile.firstName} {profile.lastName}</div>
            <div style={{ fontSize:12, opacity:0.85, marginTop:2 }}>{profile.email}</div>
            <span style={{ display:'inline-block', marginTop:6, fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:'rgba(255,255,255,0.2)', textTransform:'uppercase', letterSpacing:'0.4px' }}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      <Card title="Profile Information" sub="Update your name and contact details">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div><label style={lbl}>First Name</label><input style={field} value={profile.firstName} onChange={e=>setProfile({...profile,firstName:e.target.value})} /></div>
            <div><label style={lbl}>Last Name</label><input style={field} value={profile.lastName} onChange={e=>setProfile({...profile,lastName:e.target.value})} /></div>
          </div>
          <div><label style={lbl}>Contact Number</label><input style={field} value={profile.contactNumber} onChange={e=>setProfile({...profile,contactNumber:e.target.value})} placeholder="09xx-xxx-xxxx" /></div>
          <div>
            <label style={lbl}>Email Address</label>
            <input style={{...field, background:T.bg, color:T.slate}} value={profile.email} disabled />
            <p style={{ fontSize:11, color:T.faint, margin:'6px 0 0' }}>Contact your Admin to change your email.</p>
          </div>
          <button onClick={saveProfile} disabled={saving} style={{ padding:'10px 20px', background:T.indigo, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', alignSelf:'flex-start' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Card>

      <Card title="Change Password" sub="Keep your account secure">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div><label style={lbl}>Current Password</label><input type="password" style={field} value={pw.currentPassword} onChange={e=>setPw({...pw,currentPassword:e.target.value})} placeholder="Enter current password" /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div><label style={lbl}>New Password</label><input type="password" style={field} value={pw.newPassword} onChange={e=>setPw({...pw,newPassword:e.target.value})} placeholder="Min. 6 characters" /></div>
            <div><label style={lbl}>Confirm New</label><input type="password" style={field} value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})} placeholder="Re-enter" /></div>
          </div>
          <button onClick={changePassword} disabled={saving||!pw.currentPassword||!pw.newPassword} style={{ padding:'10px 20px', background:T.indigo, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', alignSelf:'flex-start', opacity:(!pw.currentPassword||!pw.newPassword)?0.6:1 }}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </Card>
    </div>
  )
}