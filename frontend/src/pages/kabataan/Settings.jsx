// Kabataan Settings — real editable profile, password change, delete account
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MUNICIPALITIES = ['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos']
const BARANGAYS = {
  Boac: ['Agot','Agumaymayan','Amoingon','Apitong','Balagasan','Balaring','Balimbing','Balogo','Bamban','Bangbangalon','Bantad','Bantay','Bayuti','Binunga','Boi','Boton','Buliasnin','Bunganay','Caganhao','Canat','Catubugan','Cawit','Daig','Daypay','Duyay','Hinapulan','Ihatub','Isok I','Isok II Poblacion','Laylay','Lupac','Mahinhin','Mainit','Malbog','Maligaya','Malusak','Mansiwat','Mataas na Bayan','Maybo','Mercado','Murallon','Ogbac','Pawa','Pili','Poctoy','Poras','Puting Buhangin','Puyog','Sabong','San Miguel','Santol','Sawi','Tabi','Tabigue','Tagwak','Tambunan','Tampus','Tanza','Tugos','Tumagabok','Tumapon'],
  Buenavista: ['Bagacay','Bagtingon','Barangay I','Barangay II','Barangay III','Barangay IV','Bicas-bicas','Caigangan','Daykitin','Libas','Malbog','Sihi','Timbo','Tungib-Lipata','Yook'],
  Gasan: ['Antipolo','Bachao Ibaba','Bachao Ilaya','Bacongbacong','Bahi','Bangbang','Banot','Banuyo','Barangay I','Barangay II','Barangay III','Bognuyan','Cabugao','Dawis','Dili','Libtangin','Mahunig','Mangiliol','Masiga','Matandang Gasan','Pangi','Pingan','Tabionan','Tapuyan','Tiguion'],
  Mogpog: ['Anapog-Sibucao','Argao','Balanacan','Banto','Bintakay','Bocboc','Butansapa','Candahon','Capayang','Danao','Dulong Bayan','Gitnang Bayan','Guisian','Hinadharan','Hinanggayon','Ino','Janagdong','Lamesa','Laon','Magapua','Malayak','Malusak','Mampaitan','Mangyan-Mababad','Market Site','Mataas na Bayan','Mendez','Nangka I','Nangka II','Paye','Pili','Puting Buhangin','Sayao','Silangan','Sumangga','Tarug','Villa Mendez'],
  'Santa Cruz': ['Alobo','Angas','Aturan','Bagong Silang Poblacion','Baguidbirin','Baliis','Balogo','Banahaw Poblacion','Bangcuangan','Banogbog','Biga','Botilao','Buyabod','Dating Bayan','Devilla','Dolores','Haguimit','Hupi','Ipil','Jolo','Kaganhao','Kalangkang','Kamandugan','Kasily','Kilo-kilo','Kiñaman','Labo','Lamesa','Landy','Lapu-lapu Poblacion','Libjo','Lipa','Lusok','Maharlika Poblacion','Makulapnit','Maniwaya','Manlibunan','Masaguisi','Masalukot','Matalaba','Mongpong','Morales','Napo','Pag-asa Poblacion','Pantayin','Polo','Pulong-Parang','Punong','San Antonio','San Isidro','Tagum','Tamayo','Tambangan','Tawiran','Taytay'],
  Torrijos: ['Bangwayin','Bayakbakin','Bolo','Bonliw','Buangan','Cabuyo','Cagpo','Dampulan','Kay Duke','Mabuhay','Makawayan','Malibago','Malinao','Maranlig','Marlangga','Matuyatuya','Nangka','Pakaskasan','Payanas','Poblacion','Poctoy','Sibuyao','Suha','Talawan','Tigwi'],
}

export default function KabataanSettings() {
  const { user, logout, setUser } = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const navigate                  = useNavigate()
  const [tab, setTab]             = useState('profile')

  // Profile form
  const [profile, setProfile]     = useState({ firstName:'', lastName:'', municipality:'Boac', barangay:'' })
  const [profLoading, setProfLoading] = useState(false)
  const [profDirty, setProfDirty] = useState(false)

  // Password form
  const [showPw, setShowPw]       = useState({ cur:false, nw:false, cf:false })
  const [pwForm, setPwForm]       = useState({ currentPassword:'', newPassword:'', confirmPassword:'' })
  const [pwLoading, setPwLoading] = useState(false)

  // Delete account
  const [showDelete, setShowDelete] = useState(false)
  const [deletePass, setDeletePass] = useState('')
  const [showDelPass, setShowDelPass] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const pwMatch = pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword
  const pwWrong = pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword

  useEffect(() => {
    if (user) {
      setProfile({
        firstName:    user.firstName    || '',
        lastName:     user.lastName     || '',
        municipality: user.municipality || 'Boac',
        barangay:     user.barangay     || '',
      })
    }
  }, [user])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!profile.firstName.trim() || !profile.lastName.trim()) { toast.error('Name is required.'); return }
    setProfLoading(true)
    try {
      const { data } = await axios.put(`${API}/auth/profile`, profile)
      if (setUser) setUser(data.user)
      toast.success('Profile updated!')
      setProfDirty(false)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update.') }
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
    if (!deletePass.trim()) { toast.error('Enter your password to confirm.'); return }
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
    { k:'profile',    icon:'user',    l:'Profile'    },
    { k:'security',   icon:'lock',    l:'Security'   },
    { k:'appearance', icon:'sun',     l:'Appearance' },
    { k:'danger',     icon:'trash',   l:'Account'    },
  ]

  const inp = (extra={}) => ({
    width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)',
    borderRadius:10, background:'var(--bg-card)', color:'var(--text-base)',
    fontSize:14, fontFamily:'inherit', outline:'none',
    transition:'border-color 0.15s, box-shadow 0.15s', ...extra,
  })
  const focIn  = e => { e.target.style.borderColor='#0F1F5C'; e.target.style.boxShadow='0 0 0 3px rgba(15,31,92,0.08)' }
  const focOut = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none' }
  const lbl = { display:'block', fontSize:13, fontWeight:600, color:'var(--text-muted)', marginBottom:7 }

  return (
    <div style={{ paddingBottom:80 }}>

      {/* Header */}
      <div style={{ background:'#0F1F5C', padding:'18px 20px 22px', position:'relative', overflow:'hidden' }}>
        <div aria-hidden style={{ position:'absolute', bottom:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(245,196,0,0.08)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <h1 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:3 }}>Settings</h1>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:13 }}>Manage your account and preferences</p>
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* Tab pills */}
        <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-subtle)', padding:4, borderRadius:12, border:'1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t.k} onClick={()=>setTab(t.k)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'9px 6px', borderRadius:9, border:'none', background:tab===t.k?'var(--bg-card)':'transparent', color:tab===t.k?(t.k==='danger'?'#C0111F':'var(--blue-800)'):'var(--text-muted)', fontWeight:tab===t.k?700:500, fontSize:12, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', boxShadow:tab===t.k?'0 1px 4px rgba(0,0,0,0.08)':'' }}>
              <Icon name={t.icon} size={13} color={tab===t.k?(t.k==='danger'?'#C0111F':'var(--blue-800)'):'var(--text-faint)'}/>
              {t.l}
            </button>
          ))}
        </div>

        {/* ── PROFILE ── */}
        {tab==='profile' && (
          <form onSubmit={handleProfileSave}>

            {/* Avatar */}
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', marginBottom:16 }}>
              <div style={{ background:'linear-gradient(135deg,#0F1F5C,#1535A0)', padding:'20px', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:60, height:60, borderRadius:18, background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'white', flexShrink:0 }}>
                  {(profile.firstName?.[0]||'?')}{(profile.lastName?.[0]||'')}
                </div>
                <div>
                  <p style={{ fontWeight:800, fontSize:16, color:'white', marginBottom:3 }}>{profile.firstName} {profile.lastName}</p>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px', marginBottom:16 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-base)', marginBottom:16 }}>Personal Information</h3>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div>
                  <label style={lbl}>First Name</label>
                  <input style={inp()} value={profile.firstName}
                    onChange={e=>{setProfile(p=>({...p,firstName:e.target.value}));setProfDirty(true)}}
                    onFocus={focIn} onBlur={focOut} required/>
                </div>
                <div>
                  <label style={lbl}>Last Name</label>
                  <input style={inp()} value={profile.lastName}
                    onChange={e=>{setProfile(p=>({...p,lastName:e.target.value}));setProfDirty(true)}}
                    onFocus={focIn} onBlur={focOut} required/>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Email Address</label>
                <input style={inp({background:'var(--bg-subtle)',color:'var(--text-faint)',cursor:'not-allowed'})} value={user?.email} disabled/>
                <p style={{ fontSize:11, color:'var(--text-faint)', marginTop:5 }}>Email cannot be changed.</p>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Municipality</label>
                <select style={inp({cursor:'pointer'})} value={profile.municipality}
                  onChange={e=>{setProfile(p=>({...p,municipality:e.target.value,barangay:''}));setProfDirty(true)}}
                  onFocus={focIn} onBlur={focOut}>
                  {MUNICIPALITIES.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={lbl}>Barangay</label>
                <select style={inp({cursor:'pointer'})} value={profile.barangay}
                  onChange={e=>{setProfile(p=>({...p,barangay:e.target.value}));setProfDirty(true)}}
                  onFocus={focIn} onBlur={focOut}>
                  <option value="">Select barangay...</option>
                  {(BARANGAYS[profile.municipality]||[]).map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <button type="submit" disabled={profLoading||!profDirty} style={{ width:'100%', padding:'13px', background:(!profDirty||profLoading)?'var(--bg-subtle)':'#0F1F5C', border:`1.5px solid ${(!profDirty||profLoading)?'var(--border)':'#0F1F5C'}`, borderRadius:11, color:(!profDirty||profLoading)?'var(--text-muted)':'white', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:(!profDirty||profLoading)?'not-allowed':'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Icon name="check" size={15} color={(!profDirty||profLoading)?'var(--text-muted)':'white'}/>
                {profLoading ? 'Saving...' : profDirty ? 'Save Changes' : 'No changes'}
              </button>
            </div>
          </form>
        )}

        {/* ── SECURITY ── */}
        {tab==='security' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-base)', marginBottom:4 }}>Change Password</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Use a strong password to keep your account safe.</p>
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
                <button type="submit" disabled={pwLoading||!!pwWrong} style={{ width:'100%', padding:'13px', background:'#0F1F5C', border:'none', borderRadius:11, color:'white', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:pwLoading||pwWrong?'not-allowed':'pointer', opacity:pwWrong?0.6:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <Icon name="lock" size={14} color="white"/> {pwLoading?'Saving...':'Update password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── APPEARANCE ── */}
        {tab==='appearance' && (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-base)', marginBottom:4 }}>Appearance</h3>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:18 }}>Choose how e-SK Manage looks for you.</p>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:'var(--bg-subtle)', borderRadius:12, border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:11, background:darkMode?'#1e2d5a':'#FFF8DC', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)' }}>
                  <Icon name={darkMode?'moon':'sun'} size={18} color={darkMode?'#93B4FF':'#E09400'}/>
                </div>
                <div>
                  <p style={{ fontWeight:700, fontSize:14, color:'var(--text-base)', marginBottom:1 }}>{darkMode?'Dark mode':'Light mode'}</p>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>Toggle between light and dark</p>
                </div>
              </div>
              <button onClick={toggleTheme} style={{ width:50, height:26, borderRadius:999, border:'none', cursor:'pointer', background:darkMode?'#0F1F5C':'#CBD5E1', position:'relative', transition:'background 0.3s', flexShrink:0 }}>
                <div style={{ width:18, height:18, borderRadius:'50%', background:'white', position:'absolute', top:4, left:darkMode?28:4, transition:'left 0.3s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
              </button>
            </div>
          </div>
        )}

        {/* ── DANGER ZONE ── */}
        {tab==='danger' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Account info summary */}
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'20px' }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-base)', marginBottom:16 }}>Your Account</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {[
                  { l:'Name',  v:`${user?.firstName} ${user?.lastName}` },
                  { l:'Email', v:user?.email },
                  { l:'Role',  v:'Kabataan User' },
                  { l:'Points', v:`${user?.points || 0} pts` },
                ].map(i=>(
                  <div key={i.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:13, color:'var(--text-muted)' }}>{i.l}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text-base)' }}>{i.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete account */}
            <div style={{ background:'var(--bg-card)', border:'1.5px solid rgba(192,17,31,0.2)', borderRadius:16, padding:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:'#FEE8EA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name="trash" size={17} color="#C0111F"/>
                </div>
                <div>
                  <p style={{ fontWeight:700, fontSize:15, color:'#C0111F', marginBottom:2 }}>Delete Account</p>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>Permanently remove your account and all your data.</p>
                </div>
              </div>

              {!showDelete ? (
                <button onClick={()=>setShowDelete(true)} style={{ width:'100%', padding:'12px', background:'transparent', border:'1.5px solid rgba(192,17,31,0.3)', borderRadius:10, color:'#C0111F', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#FEE8EA'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                  Delete my account
                </button>
              ) : (
                <div>
                  <div style={{ background:'#FEE8EA', border:'1px solid rgba(192,17,31,0.15)', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
                    <p style={{ fontSize:13, color:'#C0111F', fontWeight:600, marginBottom:4 }}>⚠ This action cannot be undone.</p>
                    <p style={{ fontSize:12, color:'#C0111F', opacity:0.8, lineHeight:1.6 }}>Your account, points, and all data will be permanently deleted. Enter your password to confirm.</p>
                  </div>

                  <label style={lbl}>Enter your password to confirm</label>
                  <div style={{ position:'relative', marginBottom:12 }}>
                    <input type={showDelPass?'text':'password'} placeholder="Your current password"
                      style={inp({paddingRight:44, borderColor:'rgba(192,17,31,0.3)'})}
                      value={deletePass} onChange={e=>setDeletePass(e.target.value)}
                      onFocus={e=>{e.target.style.borderColor='#C0111F';e.target.style.boxShadow='0 0 0 3px rgba(192,17,31,0.08)'}}
                      onBlur={e=>{e.target.style.borderColor='rgba(192,17,31,0.3)';e.target.style.boxShadow='none'}}/>
                    <button type="button" onClick={()=>setShowDelPass(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', display:'flex', padding:4 }}>
                      <Icon name={showDelPass?'eyeOff':'eye'} size={16}/>
                    </button>
                  </div>

                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={()=>{setShowDelete(false);setDeletePass('')}} style={{ flex:1, padding:'12px', border:'1.5px solid var(--border)', background:'var(--bg-card)', borderRadius:10, color:'var(--text-muted)', fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}>
                      Cancel
                    </button>
                    <button onClick={handleDeleteAccount} disabled={deleteLoading||!deletePass.trim()} style={{ flex:2, padding:'12px', background:deleteLoading||!deletePass.trim()?'#f5a0a0':'#C0111F', border:'none', borderRadius:10, color:'white', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:deleteLoading||!deletePass.trim()?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <Icon name="trash" size={14} color="white"/>
                      {deleteLoading?'Deleting...':'Yes, delete my account'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}