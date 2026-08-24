// admin/Settings.jsx — Admin account settings
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const C = {
  navy:'#0C2340', navyL:'#E8EEF8', gold:'#B8860B', goldL:'#FDF8EC',
  green:'#14532D', greenL:'#F0FDF4', red:'#7F1D1D', redL:'#FFF1F2',
  border:'#E2E8F0', white:'#FFFFFF', text:'#0F172A', muted:'#64748B', faint:'#94A3B8', bg:'#F8FAFC',
}

const field = { width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl   = { fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.4px', display:'block', marginBottom:6 }

function Card({ title, sub, children }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', marginBottom:20 }}>
      <div style={{ padding:'16px 22px', borderBottom:`1px solid ${C.border}`, background:C.bg }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ padding:22 }}>{children}</div>
    </div>
  )
}

export default function AdminSettings() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({ firstName:'', lastName:'', email:'' })
  const [pw, setPw] = useState({ currentPassword:'', newPassword:'', confirm:'' })
  const [msg, setMsg] = useState({ type:'', text:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) setProfile({ firstName:user.firstName||'', lastName:user.lastName||'', email:user.email||'' })
  }, [user])

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type:'', text:'' }), 4000) }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await axios.put(`${API}/auth/profile`, { firstName:profile.firstName, lastName:profile.lastName, email:profile.email })
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

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text, maxWidth:640 }}>

      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <div style={{ width:16, height:3, background:C.gold, borderRadius:2 }} />
          <span style={{ fontSize:10, fontWeight:700, color:C.gold, letterSpacing:'2px', textTransform:'uppercase' }}>Account Settings</span>
        </div>
        <h1 style={{ fontSize:22, fontWeight:800, color:C.navy, margin:0 }}>Settings</h1>
        <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>Manage your administrator account and security.</p>
      </div>

      {msg.text && (
        <div style={{
          padding:'12px 16px', borderRadius:8, marginBottom:20, fontSize:13, fontWeight:600,
          background: msg.type === 'success' ? C.greenL : C.redL,
          color:      msg.type === 'success' ? C.green  : C.red,
          border: `1px solid ${msg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
        }}>
          {msg.type === 'success' ? '✓ ' : '⚠ '}{msg.text}
        </div>
      )}

      {/* Account info banner */}
      <div style={{ background:`linear-gradient(135deg, ${C.navy}, #1A3A6B)`, borderRadius:12, padding:24, marginBottom:20, color:C.white }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700 }}>
            {profile.firstName?.[0]}{profile.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:700 }}>{profile.firstName} {profile.lastName}</div>
            <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>{profile.email}</div>
            <span style={{ display:'inline-block', marginTop:6, fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:C.gold, color:C.white, textTransform:'uppercase', letterSpacing:'0.4px' }}>
              Administrator / IT Staff
            </span>
          </div>
        </div>
      </div>

      {/* Profile */}
      <Card title="Profile Information" sub="Update your name and personal details">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div><label style={lbl}>First Name</label><input style={field} value={profile.firstName} onChange={e=>setProfile({...profile,firstName:e.target.value})} /></div>
            <div><label style={lbl}>Last Name</label><input style={field} value={profile.lastName} onChange={e=>setProfile({...profile,lastName:e.target.value})} /></div>
          </div>
          <div>
            <label style={lbl}>Email Address</label>
            <input type="email" style={field} value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="admin@eskmanage.com" />
            <p style={{ fontSize:11, color:C.faint, margin:'6px 0 0' }}>This is your login email. Changing it will change how you sign in.</p>
          </div>
          <button onClick={saveProfile} disabled={saving} style={{ padding:'10px 20px', background:C.navy, color:C.white, border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', alignSelf:'flex-start' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Card>

      {/* Password */}
      <Card title="Change Password" sub="Update your password to keep your account secure">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div><label style={lbl}>Current Password</label><input type="password" style={field} value={pw.currentPassword} onChange={e=>setPw({...pw,currentPassword:e.target.value})} placeholder="Enter current password" /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div><label style={lbl}>New Password</label><input type="password" style={field} value={pw.newPassword} onChange={e=>setPw({...pw,newPassword:e.target.value})} placeholder="Min. 6 characters" /></div>
            <div><label style={lbl}>Confirm New Password</label><input type="password" style={field} value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})} placeholder="Re-enter new password" /></div>
          </div>
          <button onClick={changePassword} disabled={saving || !pw.currentPassword || !pw.newPassword} style={{ padding:'10px 20px', background:C.navy, color:C.white, border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', alignSelf:'flex-start', opacity: (!pw.currentPassword||!pw.newPassword)?0.6:1 }}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </Card>

      {/* System info */}
      <Card title="System Information">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {[
            { label:'System',       value:'e-SK Manage' },
            { label:'Scope',        value:'Brgy. Tawiran, Sta. Cruz' },
            { label:'Your Role',    value:'Administrator / IT Staff' },
            { label:'Version',      value:'2.0.0' },
          ].map((x,i) => (
            <div key={i}>
              <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>{x.label}</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{x.value}</div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}