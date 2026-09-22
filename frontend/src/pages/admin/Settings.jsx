// admin/Settings.jsx — account settings with avatar upload, security, appearance, system
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import AvatarUploader from '../../components/AvatarUploader'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export default function AdminSettings() {
  const { user, setUser } = useAuth()
  const { T, mode, setMode } = useTheme()
  const [tab,setTab]=useState('profile')
  const [profile,setProfile]=useState({ firstName:'', lastName:'', email:'', contactNumber:'', photo:'' })
  const [pw,setPw]=useState({ currentPassword:'', newPassword:'', confirm:'' })
  const [saving,setSaving]=useState(false)

  useEffect(()=>{ if(user) setProfile({ firstName:user.firstName||'', lastName:user.lastName||'', email:user.email||'', contactNumber:user.contactNumber||'', photo:user.photo||'' }) },[user])

  const persistPhoto = async (url) => {
    setProfile(p=>({ ...p, photo:url }))
    try {
      await axios.put(`${API}/auth/profile`, { firstName:profile.firstName, lastName:profile.lastName, email:profile.email, contactNumber:profile.contactNumber, photo:url })
      if(setUser) setUser(u=>({ ...u, photo:url }))
    } catch { toast.error('Could not save photo.') }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const { data } = await axios.put(`${API}/auth/profile`, { firstName:profile.firstName, lastName:profile.lastName, email:profile.email, contactNumber:profile.contactNumber, photo:profile.photo })
      if(setUser && data.user) setUser(data.user)
      toast.success('Profile updated.')
    } catch(e){ toast.error(e.response?.data?.message||'Update failed.') } finally { setSaving(false) }
  }
  const changePw = async () => {
    if(pw.newPassword!==pw.confirm) return toast.error('Passwords do not match.')
    if(pw.newPassword.length<6) return toast.error('Password must be at least 6 characters.')
    setSaving(true)
    try { await axios.put(`${API}/auth/change-password`, { currentPassword:pw.currentPassword, newPassword:pw.newPassword }); toast.success('Password changed.'); setPw({currentPassword:'',newPassword:'',confirm:''}) }
    catch(e){ toast.error(e.response?.data?.message||'Failed.') } finally { setSaving(false) }
  }

  const field = { width:'100%', padding:'11px 13px', border:`1px solid ${T.border}`, borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box', background:T.surface, color:T.text, fontFamily:'inherit' }
  const lbl = { fontSize:12, fontWeight:700, color:T.text2, display:'block', marginBottom:7 }

  const TABS = [
    { k:'profile', label:'Profile', icon:'user' },
    { k:'security', label:'Security', icon:'lock' },
    { k:'appearance', label:'Appearance', icon:'sun' },
    { k:'system', label:'System', icon:'cog' },
  ]

  return (
    <div style={{ maxWidth:760 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.accentText, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>System</div>
        <h1 style={{ fontSize:23, fontWeight:800, margin:0, color:T.text, letterSpacing:'-0.5px' }}>Settings</h1>
        <p style={{ fontSize:13, color:T.text2, margin:'5px 0 0' }}>Manage your account, security, and preferences.</p>
      </div>

      {/* Profile banner with live avatar */}
      <div style={{ background:T.sidebar, borderRadius:14, padding:22, marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
        <div style={{
          width:60, height:60, borderRadius:16, flexShrink:0,
          background: profile.photo ? `url(${profile.photo}) center/cover` : 'rgba(255,255,255,0.1)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'#fff',
        }}>
          {!profile.photo && `${profile.firstName?.[0]||''}${profile.lastName?.[0]||''}`}
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile.firstName} {profile.lastName}</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile.email}</div>
          <span style={{ display:'inline-block', marginTop:6, fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:999, background:'rgba(255,255,255,0.15)', color:T.gold, textTransform:'uppercase', letterSpacing:'0.5px' }}>Administrator</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:18, borderBottom:`1px solid ${T.border}`, flexWrap:'wrap' }}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            padding:'10px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight:700,
            color: tab===t.k?T.accentText:T.text2, borderBottom: tab===t.k?`2px solid ${T.accent}`:'2px solid transparent', marginBottom:-1,
            display:'flex', alignItems:'center', gap:7,
          }}><Icon name={t.icon} size={15}/> {t.label}</button>
        ))}
      </div>

      {tab==='profile' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Section T={T} title="Profile Photo" sub="Add a photo so people recognize you">
            <AvatarUploader T={T} currentPhoto={profile.photo} name={`${profile.firstName} ${profile.lastName}`} onUploaded={persistPhoto} />
          </Section>

          <Section T={T} title="Profile Information" sub="Update your name and contact details">
            <div className="set-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
              <div><label style={lbl}>First Name</label><input style={field} value={profile.firstName} onChange={e=>setProfile({...profile,firstName:e.target.value})}/></div>
              <div><label style={lbl}>Last Name</label><input style={field} value={profile.lastName} onChange={e=>setProfile({...profile,lastName:e.target.value})}/></div>
            </div>
            <div style={{ marginBottom:16 }}><label style={lbl}>Email Address</label><input type="email" style={field} value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})}/></div>
            <div style={{ marginBottom:20 }}><label style={lbl}>Contact Number</label><input style={field} value={profile.contactNumber} onChange={e=>setProfile({...profile,contactNumber:e.target.value})} placeholder="09xx-xxx-xxxx"/></div>
            <button onClick={saveProfile} disabled={saving} style={btn(T,saving)}>{saving?'Saving…':'Save Changes'}</button>
          </Section>
        </div>
      )}

      {tab==='security' && (
        <Section T={T} title="Change Password" sub="Keep your account secure">
          <div style={{ marginBottom:16 }}><label style={lbl}>Current Password</label><input type="password" style={field} value={pw.currentPassword} onChange={e=>setPw({...pw,currentPassword:e.target.value})}/></div>
          <div className="set-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
            <div><label style={lbl}>New Password</label><input type="password" style={field} value={pw.newPassword} onChange={e=>setPw({...pw,newPassword:e.target.value})} placeholder="Min. 6 characters"/></div>
            <div><label style={lbl}>Confirm New</label><input type="password" style={field} value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})}/></div>
          </div>
          <button onClick={changePw} disabled={saving||!pw.currentPassword||!pw.newPassword} style={btn(T,saving||!pw.currentPassword||!pw.newPassword)}>{saving?'Updating…':'Update Password'}</button>
        </Section>
      )}

      {tab==='appearance' && (
        <Section T={T} title="Appearance" sub="Choose how e-SK Manage looks for you">
          <div className="set-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[{ m:'light', label:'Light', desc:'Bright and clean' },{ m:'dark', label:'Dark', desc:'Easy on the eyes' }].map(opt=>{
              const sel = mode===opt.m
              return (
                <button key={opt.m} onClick={()=>setMode(opt.m)} style={{ padding:16, borderRadius:12, cursor:'pointer', textAlign:'left', border: sel?`2px solid ${T.accent}`:`1px solid ${T.border}`, background: sel?T.accentSoft:T.surface }}>
                  <div style={{ height:56, borderRadius:8, marginBottom:12, background: opt.m==='dark'?'#0A1017':'#EEF1F6', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:'60%', height:20, borderRadius:5, background: opt.m==='dark'?'#121A26':'#fff', border:`1px solid ${opt.m==='dark'?'#202C3C':'#E2E7EE'}` }}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <Icon name={opt.m==='dark'?'moon':'sun'} size={15} color={T.text}/>
                    <span style={{ fontSize:14, fontWeight:700, color:T.text }}>{opt.label}</span>
                    {sel && <span style={{ marginLeft:'auto', color:T.accent }}><Icon name="check" size={16}/></span>}
                  </div>
                  <div style={{ fontSize:11.5, color:T.text3, marginTop:3 }}>{opt.desc}</div>
                </button>
              )
            })}
          </div>
          <p style={{ fontSize:11.5, color:T.text3, margin:'14px 0 0', lineHeight:1.5 }}>Your preference is remembered while you're signed in. Each new sign-in starts in light mode.</p>
        </Section>
      )}

      {tab==='system' && (
        <Section T={T} title="System Information" sub="About this deployment">
          {[['Application','e-SK Manage'],['Scope','Barangay Tawiran, Santa Cruz, Marinduque'],['Your Role','Administrator'],['Version','1.0.0']].map(([k,v],i,arr)=>(
            <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom: i<arr.length-1?`1px solid ${T.border}`:'none', gap:12 }}>
              <span style={{ fontSize:13, color:T.text2 }}>{k}</span>
              <span style={{ fontSize:13, fontWeight:700, color:T.text, textAlign:'right' }}>{v}</span>
            </div>
          ))}
        </Section>
      )}

      <style>{`
        @media (max-width: 560px) {
          .set-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Section({ T, title, sub, children }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, overflow:'hidden', boxShadow:T.shadow }}>
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontSize:14.5, fontWeight:700, color:T.text }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  )
}
const btn = (T, disabled) => ({
  padding:'11px 22px', border:'none', borderRadius:10, fontSize:14, fontWeight:700,
  cursor: disabled?'default':'pointer', background: disabled?T.text3:T.accent, color:'#fff',
})