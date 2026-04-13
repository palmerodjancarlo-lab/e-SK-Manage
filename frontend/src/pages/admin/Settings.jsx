// Admin Settings — modern design
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function AdminSettings() {
  const { user }                  = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const [tab, setTab]             = useState('profile')
  const [profile, setProfile]     = useState({ firstName:'', lastName:'', municipality:'Boac', barangay:'' })
  const [profLoading, setProfLoading] = useState(false)
  const [profDirty, setProfDirty] = useState(false)

  // Load profile from user on mount
  useEffect(() => {
    if (user) setProfile({ firstName: user.firstName||'', lastName: user.lastName||'', municipality: user.municipality||'Boac', barangay: user.barangay||'' })
  }, [user])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!profile.firstName.trim()||!profile.lastName.trim()) { toast.error('Name is required.'); return }
    setProfLoading(true)
    try {
      await axios.put(`${API}/auth/profile`, profile)
      toast.success('Profile updated.')
      setProfDirty(false)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.') }
    finally { setProfLoading(false) }
  }
  const [showPw, setShowPw]       = useState({ cur:false, nw:false, cf:false })
  const [pwForm, setPwForm]       = useState({ currentPassword:'', newPassword:'', confirmPassword:'' })
  const [pwLoading, setPwLoading] = useState(false)

  const pwMatch = pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword
  const pwWrong = pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword

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

  const TABS = [
    { k:'profile',    label:'Profile',    icon:'user'    },
    { k:'security',   label:'Security',   icon:'lock'    },
    { k:'appearance', label:'Appearance', icon:'sun'     },
    { k:'system',     label:'System',     icon:'server'  },
  ]

  const sectionTitle = (title, desc) => (
    <div style={{ marginBottom:24 }}>
      <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-base)', marginBottom:4 }}>{title}</h3>
      <p style={{ fontSize:13, color:'var(--text-muted)' }}>{desc}</p>
    </div>
  )

  const field = (label, value) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--text-muted)', minWidth:140 }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600, color:'var(--text-base)', textAlign:'right' }}>{value || '—'}</span>
    </div>
  )

  const inp = (extra={}) => ({
    width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)',
    borderRadius:10, background:'var(--bg-card)', color:'var(--text-base)',
    fontSize:14, fontFamily:'inherit', outline:'none',
    transition:'border-color 0.15s, box-shadow 0.15s',
    ...extra,
  })

  return (
    <div style={{ maxWidth:760, margin:'0 auto' }}>

      {/* Page title */}
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text-base)', marginBottom:4 }}>Settings</h1>
        <p style={{ fontSize:14, color:'var(--text-muted)' }}>Manage your account, security, and system preferences.</p>
      </div>

      <div style={{ display:'flex', gap:24, alignItems:'flex-start' }}>

        {/* Sidebar nav */}
        <div style={{ width:200, flexShrink:0 }}>
          <nav style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {TABS.map(t => (
              <button key={t.k} onClick={()=>setTab(t.k)} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 14px', borderRadius:10, border:'none',
                background: tab===t.k ? 'var(--blue-100)' : 'transparent',
                color: tab===t.k ? 'var(--blue-800)' : 'var(--text-muted)',
                fontWeight: tab===t.k ? 700 : 500,
                fontSize:14, cursor:'pointer', textAlign:'left',
                transition:'all 0.15s', fontFamily:'inherit',
              }}>
                <Icon name={t.icon} size={16} color={tab===t.k?'var(--blue-800)':'var(--text-faint)'}/>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content area */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* ── PROFILE ── */}
          {tab==='profile' && (
            <form onSubmit={handleProfileSave}>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* Avatar header */}
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
                  <div style={{ background:'linear-gradient(135deg,#7F1D1D,#B91C1C)', padding:'24px', display:'flex', alignItems:'center', gap:18 }}>
                    <div style={{ width:64, height:64, borderRadius:20, background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'white', flexShrink:0 }}>
                      {(profile.firstName?.[0]||'?')}{(profile.lastName?.[0]||'')}
                    </div>
                    <div>
                      <p style={{ fontWeight:800, fontSize:18, color:'white', marginBottom:4 }}>{profile.firstName} {profile.lastName}</p>
                      <p style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginBottom:8 }}>{user?.email}</p>
                      <span style={{ padding:'3px 12px', borderRadius:999, background:'rgba(255,255,255,0.15)', color:'white', fontSize:12, fontWeight:700 }}>Administrator</span>
                    </div>
                  </div>
                </div>

                {/* Editable fields */}
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'22px 24px' }}>
                  {sectionTitle('Personal Information', 'Update your name and location.')}

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                    <div>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-muted)', marginBottom:7 }}>First Name</label>
                      <input style={inp()} value={profile.firstName}
                        onChange={e=>{setProfile(p=>({...p,firstName:e.target.value}));setProfDirty(true)}}
                        onFocus={e=>{e.target.style.borderColor='#0F1F5C';e.target.style.boxShadow='0 0 0 3px rgba(15,31,92,0.08)'}}
                        onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}} required/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-muted)', marginBottom:7 }}>Last Name</label>
                      <input style={inp()} value={profile.lastName}
                        onChange={e=>{setProfile(p=>({...p,lastName:e.target.value}));setProfDirty(true)}}
                        onFocus={e=>{e.target.style.borderColor='#0F1F5C';e.target.style.boxShadow='0 0 0 3px rgba(15,31,92,0.08)'}}
                        onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}} required/>
                    </div>
                  </div>

                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-muted)', marginBottom:7 }}>Email Address</label>
                    <input style={inp({background:'var(--bg-subtle)',color:'var(--text-faint)',cursor:'not-allowed'})} value={user?.email} disabled/>
                    <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:5 }}>Email cannot be changed.</p>
                  </div>

                  <div style={{ marginBottom:22 }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-muted)', marginBottom:7 }}>Municipality</label>
                    <select style={inp({cursor:'pointer'})} value={profile.municipality}
                      onChange={e=>{setProfile(p=>({...p,municipality:e.target.value}));setProfDirty(true)}}
                      onFocus={e=>{e.target.style.borderColor='#0F1F5C';e.target.style.boxShadow='0 0 0 3px rgba(15,31,92,0.08)'}}
                      onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}>
                      {['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos'].map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <button type="submit" disabled={profLoading||!profDirty} style={{ padding:'11px 24px', background:(!profDirty||profLoading)?'var(--bg-subtle)':'#0F1F5C', border:`1.5px solid ${(!profDirty||profLoading)?'var(--border)':'#0F1F5C'}`, borderRadius:10, color:(!profDirty||profLoading)?'var(--text-muted)':'white', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:(!profDirty||profLoading)?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
                    <Icon name="check" size={14} color={(!profDirty||profLoading)?'var(--text-muted)':'white'}/>
                    {profLoading?'Saving...':profDirty?'Save Changes':'No changes'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── SECURITY ── */}
          {tab==='security' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'24px' }}>
                {sectionTitle('Change Password', 'Use a strong password of at least 8 characters.')}
                <form onSubmit={handlePw} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  {[
                    { label:'Current password',     key:'currentPassword', show:showPw.cur, toggle:()=>setShowPw(p=>({...p,cur:!p.cur})) },
                    { label:'New password',          key:'newPassword',     show:showPw.nw,  toggle:()=>setShowPw(p=>({...p,nw:!p.nw})) },
                    { label:'Confirm new password',  key:'confirmPassword', show:showPw.cf,  toggle:()=>setShowPw(p=>({...p,cf:!p.cf})) },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-muted)', marginBottom:7 }}>{f.label}</label>
                      <div style={{ position:'relative' }}>
                        <input type={f.show?'text':'password'} required style={inp({paddingRight:44})}
                          value={pwForm[f.key]} onChange={e=>setPwForm({...pwForm,[f.key]:e.target.value})}
                          onFocus={e=>{e.target.style.borderColor='#0F1F5C';e.target.style.boxShadow='0 0 0 3px rgba(15,31,92,0.08)'}}
                          onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}} />
                        <button type="button" onClick={f.toggle} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', display:'flex', padding:4 }}>
                          <Icon name={f.show?'eyeOff':'eye'} size={16}/>
                        </button>
                      </div>
                      {f.key==='confirmPassword' && pwForm.confirmPassword && (
                        <p style={{ fontSize:12, marginTop:6, fontWeight:600, color:pwMatch?'var(--green-600)':'var(--red-600)' }}>
                          {pwMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
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

              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'24px' }}>
                {sectionTitle('Session', 'Your current login session.')}
                {field('Signed in as', user?.email)}
                {field('Role',         'Administrator')}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 0' }}>
                  <span style={{ fontSize:13, color:'var(--text-muted)' }}>Status</span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, color:'#15803D' }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'#15803D', display:'inline-block' }}/>
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── APPEARANCE ── */}
          {tab==='appearance' && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'24px' }}>
              {sectionTitle('Appearance', 'Customize how e-SK Manage looks for you.')}
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
                <button onClick={toggleTheme} aria-label="Toggle theme" style={{ width:52, height:28, borderRadius:999, border:'none', cursor:'pointer', background:darkMode?'#0F1F5C':'#CBD5E1', position:'relative', transition:'background 0.3s', flexShrink:0 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'white', position:'absolute', top:4, left:darkMode?28:4, transition:'left 0.3s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
                </button>
              </div>
            </div>
          )}

          {/* ── SYSTEM ── */}
          {tab==='system' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'24px' }}>
                {sectionTitle('Application', 'Technical details about this system.')}
                {field('Application',  'e-SK Manage')}
                {field('Version',      'v1.0.0')}
                {field('Stack',        'MongoDB · Express · React · Node.js')}
                {field('Database',     'MongoDB Atlas')}
                {field('API Base URL', API)}
                {field('Environment',  'Development')}
                {field('Developed by', 'CapsG4')}
                {field('School year',  '2025 – 2026')}
                {field('Province',     'Marinduque, MIMAROPA')}
              </div>

              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'24px' }}>
                {sectionTitle('Coverage', 'Municipalities and roles this platform serves.')}
                <div style={{ marginBottom:20 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Municipalities</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos'].map(m=>(
                      <span key={m} style={{ padding:'5px 14px', borderRadius:999, background:'var(--blue-100)', color:'var(--blue-800)', fontSize:13, fontWeight:600, border:'1px solid rgba(15,31,92,0.1)' }}>{m}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>User roles</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                    {[
                      { role:'Administrator', desc:'Full system access', bg:'#FEE8EA', c:'#C0111F', border:'rgba(192,17,31,0.2)' },
                      { role:'SK Officer',    desc:'Manage events, announcements and programs', bg:'#EBF0FF', c:'#0F1F5C', border:'rgba(15,31,92,0.2)' },
                      { role:'Kabataan User', desc:'View content, earn points, check-in at events', bg:'#DCFCE7', c:'#15803D', border:'rgba(21,128,61,0.2)' },
                    ].map(r=>(
                      <div key={r.role} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, color:'var(--text-base)', marginBottom:2 }}>{r.role}</p>
                          <p style={{ fontSize:12, color:'var(--text-muted)' }}>{r.desc}</p>
                        </div>
                        <span style={{ padding:'4px 12px', borderRadius:999, background:r.bg, color:r.c, fontSize:12, fontWeight:700, border:`1px solid ${r.border}`, flexShrink:0, marginLeft:12 }}>{r.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}