// SK Officer Settings — real editable profile, password, delete account
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MUNICIPALITIES = ['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos']

export default function SKSettings() {
  const { user, logout, setUser } = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const navigate                  = useNavigate()
  const [tab, setTab]             = useState('profile')

  const [profile, setProfile]         = useState({ firstName:'', lastName:'', municipality:'Boac', barangay:'' })
  const [profLoading, setProfLoading]  = useState(false)
  const [profDirty, setProfDirty]      = useState(false)
  const [showPw, setShowPw]           = useState({ cur:false, nw:false, cf:false })
  const [pwForm, setPwForm]           = useState({ currentPassword:'', newPassword:'', confirmPassword:'' })
  const [pwLoading, setPwLoading]     = useState(false)
  const [showDelete, setShowDelete]   = useState(false)
  const [deletePass, setDeletePass]   = useState('')
  const [showDelPass, setShowDelPass] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const pwMatch = pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword
  const pwWrong = pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword

  useEffect(() => {
    if (user) setProfile({ firstName: user.firstName||'', lastName: user.lastName||'', municipality: user.municipality||'Boac', barangay: user.barangay||'' })
  }, [user])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!profile.firstName.trim()||!profile.lastName.trim()) { toast.error('Name is required.'); return }
    setProfLoading(true)
    try {
      const { data } = await axios.put(`${API}/auth/profile`, profile)
      if (setUser) setUser(data.user)
      toast.success('Profile updated!')
      setProfDirty(false)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.') }
    finally { setProfLoading(false) }
  }

  const handlePw = async (e) => {
    e.preventDefault()
    if (pwWrong) { toast.error('Passwords do not match.'); return }
    if (pwForm.newPassword.length < 6) { toast.error('Min 6 characters.'); return }
    setPwLoading(true)
    try {
      await axios.put(`${API}/auth/change-password`, { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Password updated.')
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.') }
    finally { setPwLoading(false) }
  }

  const handleDeleteAccount = async () => {
    if (!deletePass.trim()) { toast.error('Enter your password.'); return }
    setDeleteLoading(true)
    try {
      await axios.delete(`${API}/auth/account`, { data: { password: deletePass } })
      toast.success('Account deleted.')
      logout()
      navigate('/login', { replace: true })
    } catch (err) { toast.error(err.response?.data?.message || 'Incorrect password.') }
    finally { setDeleteLoading(false) }
  }

  const TABS = [
    { k:'profile',    icon:'user',  l:'Profile'    },
    { k:'security',   icon:'lock',  l:'Security'   },
    { k:'appearance', icon:'sun',   l:'Appearance' },
    { k:'danger',     icon:'trash', l:'Account'    },
  ]

  const inp = (extra={}) => ({ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:10, background:'var(--bg-card)', color:'var(--text-base)', fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color 0.15s, box-shadow 0.15s', ...extra })
  const focIn  = e => { e.target.style.borderColor='#0F1F5C'; e.target.style.boxShadow='0 0 0 3px rgba(15,31,92,0.08)' }
  const focOut = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none' }
  const lbl = { display:'block', fontSize:13, fontWeight:600, color:'var(--text-muted)', marginBottom:7 }

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text-base)', marginBottom:4 }}>Settings</h1>
        <p style={{ fontSize:14, color:'var(--text-muted)' }}>Manage your account and preferences.</p>
      </div>

      <div style={{ display:'flex', gap:24, alignItems:'flex-start' }}>

        {/* Sidebar */}
        <div style={{ width:190, flexShrink:0 }}>
          <nav style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {TABS.map(t => (
              <button key={t.k} onClick={()=>setTab(t.k)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:'none', background:tab===t.k?(t.k==='danger'?'#FEE8EA':'var(--blue-100)'):'transparent', color:tab===t.k?(t.k==='danger'?'#C0111F':'var(--blue-800)'):'var(--text-muted)', fontWeight:tab===t.k?700:500, fontSize:14, cursor:'pointer', textAlign:'left', transition:'all 0.15s', fontFamily:'inherit' }}>
                <Icon name={t.icon} size={15} color={tab===t.k?(t.k==='danger'?'#C0111F':'var(--blue-800)'):'var(--text-faint)'}/>
                {t.l}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* ── PROFILE ── */}
          {tab==='profile' && (
            <form onSubmit={handleProfileSave}>
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', marginBottom:16 }}>
                <div style={{ background:'linear-gradient(135deg,#0F1F5C,#1535A0)', padding:'20px 24px', display:'flex', alignItems:'center', gap:18 }}>
                  <div style={{ width:60, height:60, borderRadius:18, background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'white', flexShrink:0 }}>
                    {(profile.firstName?.[0]||'?')}{(profile.lastName?.[0]||'')}
                  </div>
                  <div>
                    <p style={{ fontWeight:800, fontSize:17, color:'white', marginBottom:3 }}>{profile.firstName} {profile.lastName}</p>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.55)', marginBottom:8 }}>{user?.email}</p>
                    <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(255,255,255,0.15)', color:'white', fontSize:11, fontWeight:700 }}>{user?.position || 'SK Officer'}</span>
                  </div>
                </div>
              </div>

              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'22px' }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-base)', marginBottom:18 }}>Personal Information</h3>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                  <div>
                    <label style={lbl}>First Name</label>
                    <input style={inp()} value={profile.firstName} onChange={e=>{setProfile(p=>({...p,firstName:e.target.value}));setProfDirty(true)}} onFocus={focIn} onBlur={focOut} required/>
                  </div>
                  <div>
                    <label style={lbl}>Last Name</label>
                    <input style={inp()} value={profile.lastName} onChange={e=>{setProfile(p=>({...p,lastName:e.target.value}));setProfDirty(true)}} onFocus={focIn} onBlur={focOut} required/>
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={lbl}>Email Address</label>
                  <input style={inp({background:'var(--bg-subtle)',color:'var(--text-faint)',cursor:'not-allowed'})} value={user?.email} disabled/>
                  <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:5 }}>Email cannot be changed. Contact Admin.</p>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={lbl}>Municipality</label>
                  <select style={inp({cursor:'pointer'})} value={profile.municipality} onChange={e=>{setProfile(p=>({...p,municipality:e.target.value}));setProfDirty(true)}} onFocus={focIn} onBlur={focOut}>
                    {MUNICIPALITIES.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom:22 }}>
                  <label style={lbl}>Barangay</label>
                  <input style={inp()} placeholder="Your barangay" value={profile.barangay} onChange={e=>{setProfile(p=>({...p,barangay:e.target.value}));setProfDirty(true)}} onFocus={focIn} onBlur={focOut}/>
                </div>

                <button type="submit" disabled={profLoading||!profDirty} style={{ padding:'11px 24px', background:(!profDirty||profLoading)?'var(--bg-subtle)':'#0F1F5C', border:`1.5px solid ${(!profDirty||profLoading)?'var(--border)':'#0F1F5C'}`, borderRadius:10, color:(!profDirty||profLoading)?'var(--text-muted)':'white', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:(!profDirty||profLoading)?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
                  <Icon name="check" size={14} color={(!profDirty||profLoading)?'var(--text-muted)':'white'}/>
                  {profLoading?'Saving...':profDirty?'Save Changes':'No changes'}
                </button>
              </div>
            </form>
          )}

          {/* ── SECURITY ── */}
          {tab==='security' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'22px' }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-base)', marginBottom:4 }}>Change Password</h3>
                <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Use a strong password to protect your account.</p>
                <form onSubmit={handlePw} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {[
                    { label:'Current password',    key:'currentPassword', show:showPw.cur, toggle:()=>setShowPw(p=>({...p,cur:!p.cur})) },
                    { label:'New password',         key:'newPassword',     show:showPw.nw,  toggle:()=>setShowPw(p=>({...p,nw:!p.nw})) },
                    { label:'Confirm new password', key:'confirmPassword', show:showPw.cf,  toggle:()=>setShowPw(p=>({...p,cf:!p.cf})) },
                  ].map(f=>(
                    <div key={f.key}>
                      <label style={lbl}>{f.label}</label>
                      <div style={{ position:'relative' }}>
                        <input type={f.show?'text':'password'} required style={inp({paddingRight:44})}
                          value={pwForm[f.key]} onChange={e=>setPwForm({...pwForm,[f.key]:e.target.value})}
                          onFocus={focIn} onBlur={focOut}/>
                        <button type="button" onClick={f.toggle} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', display:'flex', padding:4 }}>
                          <Icon name={f.show?'eyeOff':'eye'} size={16}/>
                        </button>
                      </div>
                      {f.key==='confirmPassword' && pwForm.confirmPassword && (
                        <p style={{ fontSize:12, marginTop:5, fontWeight:600, color:pwMatch?'#16A34A':'#DC2626' }}>
                          {pwMatch?'✓ Passwords match':'✗ Passwords do not match'}
                        </p>
                      )}
                    </div>
                  ))}
                  <div>
                    <button type="submit" disabled={pwLoading||!!pwWrong} style={{ padding:'11px 24px', background:'#0F1F5C', border:'none', borderRadius:10, color:'white', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:pwLoading||pwWrong?'not-allowed':'pointer', opacity:pwWrong?0.6:1, display:'inline-flex', alignItems:'center', gap:8 }}>
                      <Icon name="lock" size={14} color="white"/> {pwLoading?'Saving...':'Update password'}
                    </button>
                  </div>
                </form>
              </div>

              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'22px' }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-base)', marginBottom:14 }}>Session</h3>
                {[{ l:'Signed in as', v:user?.email },{ l:'Role', v:'SK Officer' }].map(i=>(
                  <div key={i.l} style={{ display:'flex', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:13, color:'var(--text-muted)' }}>{i.l}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text-base)' }}>{i.v}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 0' }}>
                  <span style={{ fontSize:13, color:'var(--text-muted)' }}>Status</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#16A34A', display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'#16A34A', display:'inline-block' }}/>Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── APPEARANCE ── */}
          {tab==='appearance' && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'22px' }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-base)', marginBottom:4 }}>Appearance</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Customize how e-SK Manage looks.</p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px', background:'var(--bg-subtle)', borderRadius:12, border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:42, height:42, borderRadius:11, background:darkMode?'#1e2d5a':'#FFF8DC', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)' }}>
                    <Icon name={darkMode?'moon':'sun'} size={20} color={darkMode?'#93B4FF':'#E09400'}/>
                  </div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, color:'var(--text-base)', marginBottom:2 }}>{darkMode?'Dark mode':'Light mode'}</p>
                    <p style={{ fontSize:12, color:'var(--text-muted)' }}>Toggle between light and dark interface</p>
                  </div>
                </div>
                <button onClick={toggleTheme} style={{ width:52, height:28, borderRadius:999, border:'none', cursor:'pointer', background:darkMode?'#0F1F5C':'#CBD5E1', position:'relative', transition:'background 0.3s', flexShrink:0 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'white', position:'absolute', top:4, left:darkMode?28:4, transition:'left 0.3s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
                </button>
              </div>
            </div>
          )}

          {/* ── DANGER ZONE ── */}
          {tab==='danger' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'22px' }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-base)', marginBottom:14 }}>Account Overview</h3>
                {[{ l:'Name', v:`${user?.firstName} ${user?.lastName}` },{ l:'Email', v:user?.email },{ l:'Position', v:user?.position||'SK Officer' },{ l:'Role', v:'SK Officer' }].map(i=>(
                  <div key={i.l} style={{ display:'flex', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:13, color:'var(--text-muted)' }}>{i.l}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text-base)' }}>{i.v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background:'var(--bg-card)', border:'1.5px solid rgba(192,17,31,0.2)', borderRadius:16, padding:'22px' }}>
                <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:16 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'#FEE8EA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon name="trash" size={17} color="#C0111F"/>
                  </div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:15, color:'#C0111F', marginBottom:3 }}>Delete Account</p>
                    <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>Permanently remove your SK Officer account and all associated data. This action cannot be undone.</p>
                  </div>
                </div>

                {!showDelete ? (
                  <button onClick={()=>setShowDelete(true)} style={{ padding:'11px 20px', background:'transparent', border:'1.5px solid rgba(192,17,31,0.3)', borderRadius:10, color:'#C0111F', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#FEE8EA'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    Delete my account
                  </button>
                ) : (
                  <div>
                    <div style={{ background:'#FEE8EA', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
                      <p style={{ fontSize:13, color:'#C0111F', fontWeight:600, marginBottom:3 }}>⚠ This cannot be undone.</p>
                      <p style={{ fontSize:12, color:'#C0111F', opacity:0.8, lineHeight:1.6 }}>Your account and all data will be permanently deleted.</p>
                    </div>
                    <label style={lbl}>Enter your password to confirm</label>
                    <div style={{ position:'relative', marginBottom:14 }}>
                      <input type={showDelPass?'text':'password'} placeholder="Your current password"
                        style={inp({paddingRight:44,borderColor:'rgba(192,17,31,0.3)'})}
                        value={deletePass} onChange={e=>setDeletePass(e.target.value)}
                        onFocus={e=>{e.target.style.borderColor='#C0111F';e.target.style.boxShadow='0 0 0 3px rgba(192,17,31,0.08)'}}
                        onBlur={e=>{e.target.style.borderColor='rgba(192,17,31,0.3)';e.target.style.boxShadow='none'}}/>
                      <button type="button" onClick={()=>setShowDelPass(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', display:'flex', padding:4 }}>
                        <Icon name={showDelPass?'eyeOff':'eye'} size={16}/>
                      </button>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={()=>{setShowDelete(false);setDeletePass('')}} style={{ flex:1, padding:'11px', border:'1.5px solid var(--border)', background:'var(--bg-card)', borderRadius:10, color:'var(--text-muted)', fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}>Cancel</button>
                      <button onClick={handleDeleteAccount} disabled={deleteLoading||!deletePass.trim()} style={{ flex:2, padding:'11px', background:deleteLoading||!deletePass.trim()?'#f5a0a0':'#C0111F', border:'none', borderRadius:10, color:'white', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:deleteLoading||!deletePass.trim()?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                        <Icon name="trash" size={14} color="white"/>{deleteLoading?'Deleting...':'Yes, delete my account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}