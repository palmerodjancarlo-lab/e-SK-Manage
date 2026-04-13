// Register.jsx — polished desktop + mobile, 3-step
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../components/Icon'
import toast from 'react-hot-toast'
import skLogo from '../../assets/sk-logo.svg'

const MUNICIPALITIES = ['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos']
const BARANGAYS = {
  Boac:['Agot','Agumaymayan','Amoingon','Apitong','Balagasan','Balaring','Balimbing','Balogo','Bamban','Bangbangalon','Bantad','Bantay','Bayuti','Binunga','Boi','Boton','Buliasnin','Bunganay','Caganhao','Canat','Catubugan','Cawit','Daig','Daypay','Duyay','Hinapulan','Ihatub','Isok I','Isok II Poblacion','Laylay','Lupac','Mahinhin','Mainit','Malbog','Maligaya','Malusak','Mansiwat','Mataas na Bayan','Maybo','Mercado','Murallon','Ogbac','Pawa','Pili','Poctoy','Poras','Puting Buhangin','Puyog','Sabong','San Miguel','Santol','Sawi','Tabi','Tabigue','Tagwak','Tambunan','Tampus','Tanza','Tugos','Tumagabok','Tumapon'],
  Buenavista:['Bagacay','Bagtingon','Barangay I','Barangay II','Barangay III','Barangay IV','Bicas-bicas','Caigangan','Daykitin','Libas','Malbog','Sihi','Timbo','Tungib-Lipata','Yook'],
  Gasan:['Antipolo','Bachao Ibaba','Bachao Ilaya','Bacongbacong','Bahi','Bangbang','Banot','Banuyo','Barangay I','Barangay II','Barangay III','Bognuyan','Cabugao','Dawis','Dili','Libtangin','Mahunig','Mangiliol','Masiga','Matandang Gasan','Pangi','Pingan','Tabionan','Tapuyan','Tiguion'],
  Mogpog:['Anapog-Sibucao','Argao','Balanacan','Banto','Bintakay','Bocboc','Butansapa','Candahon','Capayang','Danao','Dulong Bayan','Gitnang Bayan','Guisian','Hinadharan','Hinanggayon','Ino','Janagdong','Lamesa','Laon','Magapua','Malayak','Malusak','Mampaitan','Mangyan-Mababad','Market Site','Mataas na Bayan','Mendez','Nangka I','Nangka II','Paye','Pili','Puting Buhangin','Sayao','Silangan','Sumangga','Tarug','Villa Mendez'],
  'Santa Cruz':['Alobo','Angas','Aturan','Bagong Silang Poblacion','Baguidbirin','Baliis','Balogo','Banahaw Poblacion','Bangcuangan','Banogbog','Biga','Botilao','Buyabod','Dating Bayan','Devilla','Dolores','Haguimit','Hupi','Ipil','Jolo','Kaganhao','Kalangkang','Kamandugan','Kasily','Kilo-kilo','Kiñaman','Labo','Lamesa','Landy','Lapu-lapu Poblacion','Libjo','Lipa','Lusok','Maharlika Poblacion','Makulapnit','Maniwaya','Manlibunan','Masaguisi','Masalukot','Matalaba','Mongpong','Morales','Napo','Pag-asa Poblacion','Pantayin','Polo','Pulong-Parang','Punong','San Antonio','San Isidro','Tagum','Tamayo','Tambangan','Tawiran','Taytay'],
  Torrijos:['Bangwayin','Bayakbakin','Bolo','Bonliw','Buangan','Cabuyo','Cagpo','Dampulan','Kay Duke','Mabuhay','Makawayan','Malibago','Malinao','Maranlig','Marlangga','Matuyatuya','Nangka','Pakaskasan','Payanas','Poblacion','Poctoy','Sibuyao','Suha','Talawan','Tigwi'],
}
const SK_POSITIONS = ['SK Chairperson','SK Secretary','SK Treasurer','SK Kagawad']

export default function Register() {
  const { register }            = useAuth()
  const navigate                = useNavigate()
  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [form, setForm]         = useState({
    firstName:'', lastName:'', email:'', password:'', confirmPassword:'',
    municipality:'Boac', barangay:'', accountType:'kabataan',
    skPosition:'', skProof:'', skNote:'',
  })
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const validate1 = () => {
    if (!form.firstName.trim())   { toast.error('First name is required.'); return false }
    if (!form.lastName.trim())    { toast.error('Last name is required.'); return false }
    if (!form.email.trim())       { toast.error('Email is required.'); return false }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters.'); return false }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match.'); return false }
    return true
  }
  const validate2 = () => {
    if (!form.barangay) { toast.error('Please select your barangay.'); return false }
    return true
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    const isSK = form.accountType === 'sk_official'
    if (isSK && !form.skPosition)     { toast.error('Please select your SK position.'); return }
    if (isSK && !form.skProof.trim()) { toast.error('Please describe your proof of position.'); return }
    setLoading(true)
    try {
      await register({
        firstName:form.firstName, lastName:form.lastName,
        email:form.email, password:form.password,
        municipality:form.municipality, barangay:form.barangay,
        isApplyingSK:isSK,
        appliedPosition:isSK?form.skPosition:undefined,
        proofDescription:isSK?form.skProof:undefined,
        whyApply:isSK?form.skNote:undefined,
      })
      toast.success(isSK?'Submitted! Admin will verify your SK position.':'Account created! Welcome.', {duration:5000})
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message||'Registration failed.')
    } finally { setLoading(false) }
  }

  const passMatch = form.confirmPassword && form.password === form.confirmPassword
  const passWrong = form.confirmPassword && form.password !== form.confirmPassword

  const inp = (extra={}) => ({
    width:'100%', padding:'12px 16px',
    border:'1.5px solid #E2E8F0', borderRadius:10,
    background:'#FAFBFF', color:'#0A1628',
    fontSize:14, fontFamily:'inherit', outline:'none',
    transition:'border-color .15s, box-shadow .15s',
    boxSizing:'border-box', ...extra,
  })
  const focIn  = e => { e.target.style.borderColor='#0F2878'; e.target.style.boxShadow='0 0 0 3px rgba(15,40,120,.08)' }
  const focOut = e => { e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none' }
  const lbl = { display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:8 }

  const STEPS = [{n:1,l:'Personal'},{n:2,l:'Location'},{n:3,l:'Account'}]

  // Left panel content
  const LeftPanel = () => (
    <>
      {[500,390,285,190,115].map((s,i)=>(
        <div key={i} aria-hidden style={{ position:'absolute', bottom:-s*.48, right:-s*.42, width:s, height:s, borderRadius:'50%', border:`1px solid rgba(255,255,255,${.04+i*.028})`, pointerEvents:'none' }} />
      ))}
      <div aria-hidden style={{ position:'absolute', top:-80,left:-80, width:280,height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(100,140,255,.06) 0%,transparent 70%)', pointerEvents:'none' }} />
      <div aria-hidden style={{ position:'absolute', bottom:-60,left:40, width:260,height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,196,0,.07) 0%,transparent 65%)', pointerEvents:'none' }} />
      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:72 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src={skLogo} alt="SK" style={{ width:28, objectFit:'contain' }} />
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:'white', lineHeight:1.2 }}>e-SK Manage</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:1 }}>Province of Marinduque</p>
          </div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:999, marginBottom:22 }}>
            <div style={{ width:6,height:6,borderRadius:'50%',background:'#F5C400' }} />
            <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.65)', letterSpacing:'.3px' }}>Join the Youth Platform</span>
          </div>
          <h1 style={{ fontSize:40, fontWeight:800, color:'white', lineHeight:1.1, letterSpacing:'-1.2px', marginBottom:20 }}>
            Be Part of<br /><span style={{ color:'#F5C400' }}>the Change.</span>
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.42)', lineHeight:1.9, maxWidth:290, marginBottom:44 }}>
            Create your account and start participating in SK activities, earning points, and engaging with your community.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
            {[{icon:'star',text:'Earn points by attending SK events'},{icon:'qrCode',text:'QR check-in at activities'},{icon:'banknotes',text:'View SK budget transparency'},{icon:'megaphone',text:'Get the latest announcements'}].map(f=>(
              <div key={f.text} style={{ display:'flex', alignItems:'center', gap:13 }}>
                <div style={{ width:34,height:34,borderRadius:9,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <Icon name={f.icon} size={14} color="#F5C400" />
                </div>
                <span style={{ fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Plus Jakarta Sans',-apple-system,sans-serif", background:'#F4F7FF' }}>

      {/* ── LEFT PANEL ── */}
      <div className="auth-left" style={{ width:460,flexShrink:0, background:'linear-gradient(160deg,#0A1628 0%,#0F2878 55%,#1535A0 100%)', display:'flex',flexDirection:'column', padding:'48px 52px',position:'relative',overflow:'hidden' }}>
        <LeftPanel />
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#ffffff', overflowY:'auto' }}>

        {/* Mobile header */}
        <div className="auth-mobile-header">
          <div style={{ background:'linear-gradient(160deg,#0A1628 0%,#0F2878 55%,#1535A0 100%)', padding:'28px 24px 36px', position:'relative', overflow:'hidden' }}>
            {[220,150,90].map((s,i)=>(
              <div key={i} aria-hidden style={{ position:'absolute',bottom:-s*.45,right:-s*.4,width:s,height:s,borderRadius:'50%',border:`1px solid rgba(255,255,255,${.06+i*.035})`,pointerEvents:'none' }} />
            ))}
            <div aria-hidden style={{ position:'absolute',bottom:-30,left:-20,width:150,height:150,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,196,0,.09) 0%,transparent 65%)',pointerEvents:'none' }} />
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <div style={{ width:38,height:38,borderRadius:11,background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <img src={skLogo} alt="SK" style={{ width:24, objectFit:'contain' }} />
                </div>
                <div>
                  <p style={{ fontSize:14, fontWeight:800, color:'white', lineHeight:1.2 }}>e-SK Manage</p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>Province of Marinduque</p>
                </div>
              </div>
              <h1 style={{ fontSize:24, fontWeight:800, color:'white', lineHeight:1.2, letterSpacing:'-.5px', marginBottom:6 }}>
                Be Part of <span style={{ color:'#F5C400' }}>the Change.</span>
              </h1>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.45)', lineHeight:1.7 }}>Create your account and join the SK youth platform.</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'44px 40px' }} className="auth-form-wrap">
          <div style={{ width:'100%', maxWidth:440 }}>

            {/* Desktop brand */}
            <div className="auth-brand-row" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
              <img src={skLogo} alt="SK" style={{ width:24, objectFit:'contain' }} />
              <span style={{ fontSize:15, fontWeight:800, color:'#0A1628', letterSpacing:'-.3px' }}>e-SK Manage</span>
            </div>

            {/* Heading + sign in link */}
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:24, fontWeight:800, color:'#0A1628', letterSpacing:'-.5px', marginBottom:6 }}>Create your account</h2>
            </div>

            {/* Step indicator */}
            <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
              {STEPS.map((s,i)=>(
                <div key={s.n} style={{ display:'flex', alignItems:'center', flex:i<STEPS.length-1?1:'none' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                    <div style={{
                      width:30, height:30, borderRadius:'50%',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, fontWeight:700, transition:'all .2s',
                      background:step>s.n?'#DCFCE7':step===s.n?'#0A1628':'#F1F5F9',
                      color:step>s.n?'#15803D':step===s.n?'white':'#94A3B8',
                      border:step>s.n?'1.5px solid #86EFAC':step===s.n?'none':'1.5px solid #E2E8F0',
                      boxShadow:step===s.n?'0 2px 8px rgba(10,22,40,.2)':'none',
                    }}>
                      {step>s.n?<Icon name="check" size={13}/>:s.n}
                    </div>
                    <span style={{ fontSize:10, fontWeight:600, color:step>=s.n?'#475569':'#94A3B8', whiteSpace:'nowrap' }}>{s.l}</span>
                  </div>
                  {i<STEPS.length-1&&<div style={{ flex:1, height:1.5, margin:'0 8px 14px', background:step>s.n?'#86EFAC':'#E2E8F0', transition:'background .2s' }}/>}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit}>

              {/* ── STEP 1 ── */}
              {step===1&&(
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                    <div>
                      <label style={lbl}>First Name</label>
                      <input style={inp()} placeholder="Juan" required value={form.firstName} onChange={e=>set('firstName',e.target.value)} onFocus={focIn} onBlur={focOut}/>
                    </div>
                    <div>
                      <label style={lbl}>Last Name</label>
                      <input style={inp()} placeholder="Dela Cruz" required value={form.lastName} onChange={e=>set('lastName',e.target.value)} onFocus={focIn} onBlur={focOut}/>
                    </div>
                  </div>

                  <div style={{ marginBottom:16 }}>
                    <label style={lbl}>Email Address</label>
                    <input type="email" style={inp()} placeholder="you@example.com" required value={form.email} onChange={e=>set('email',e.target.value)} onFocus={focIn} onBlur={focOut}/>
                  </div>

                  <div style={{ marginBottom:16 }}>
                    <label style={lbl}>Password</label>
                    <div style={{ position:'relative' }}>
                      <input type={showPass?'text':'password'} style={inp({paddingRight:46})} placeholder="Min. 6 characters" required value={form.password} onChange={e=>set('password',e.target.value)} onFocus={focIn} onBlur={focOut}/>
                      <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94A3B8',display:'flex',padding:4,borderRadius:6 }} onMouseEnter={e=>e.currentTarget.style.color='#0F2878'} onMouseLeave={e=>e.currentTarget.style.color='#94A3B8'}>
                        <Icon name={showPass?'eyeOff':'eye'} size={17}/>
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom:28 }}>
                    <label style={lbl}>Confirm Password</label>
                    <div style={{ position:'relative' }}>
                      <input type={showConf?'text':'password'} style={inp({paddingRight:46, borderColor:passWrong?'#F87171':passMatch?'#4ADE80':'#E2E8F0'})} placeholder="Re-enter password" required value={form.confirmPassword} onChange={e=>set('confirmPassword',e.target.value)}
                        onFocus={e=>{e.target.style.borderColor=passWrong?'#F87171':passMatch?'#4ADE80':'#0F2878';e.target.style.boxShadow='0 0 0 3px rgba(15,40,120,.08)'}}
                        onBlur={e=>{e.target.style.borderColor=passWrong?'#F87171':passMatch?'#4ADE80':'#E2E8F0';e.target.style.boxShadow='none'}}/>
                      <button type="button" onClick={()=>setShowConf(p=>!p)} style={{ position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94A3B8',display:'flex',padding:4,borderRadius:6 }} onMouseEnter={e=>e.currentTarget.style.color='#0F2878'} onMouseLeave={e=>e.currentTarget.style.color='#94A3B8'}>
                        <Icon name={showConf?'eyeOff':'eye'} size={17}/>
                      </button>
                    </div>
                    {passWrong&&<p style={{ fontSize:12,color:'#EF4444',marginTop:6,fontWeight:600 }}>✗ Passwords do not match</p>}
                    {passMatch&&<p style={{ fontSize:12,color:'#16A34A',marginTop:6,fontWeight:600 }}>✓ Passwords match</p>}
                  </div>

                  <button type="button" onClick={()=>validate1()&&setStep(2)} style={{ width:'100%',padding:'13px',background:'#0A1628',border:'none',borderRadius:11,color:'white',fontSize:15,fontWeight:700,fontFamily:'inherit',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 16px rgba(10,22,40,.22)',transition:'all .2s' }} onMouseEnter={e=>{e.currentTarget.style.background='#0F2878';e.currentTarget.style.transform='translateY(-1px)'}} onMouseLeave={e=>{e.currentTarget.style.background='#0A1628';e.currentTarget.style.transform='none'}}>
                    Continue <Icon name="arrowRight" size={16}/>
                  </button>
                </>
              )}

              {/* ── STEP 2 ── */}
              {step===2&&(
                <>
                  <div style={{ marginBottom:16 }}>
                    <label style={lbl}>Municipality</label>
                    <select style={inp({cursor:'pointer'})} value={form.municipality} onChange={e=>{set('municipality',e.target.value);set('barangay','')}} onFocus={focIn} onBlur={focOut}>
                      {MUNICIPALITIES.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={lbl}>Barangay</label>
                    <select style={inp({cursor:'pointer'})} value={form.barangay} onChange={e=>set('barangay',e.target.value)} onFocus={focIn} onBlur={focOut}>
                      <option value="">Select your barangay...</option>
                      {(BARANGAYS[form.municipality]||[]).map(b=><option key={b} value={b}>{b}</option>)}
                    </select>
                    <p style={{ fontSize:12,color:'#94A3B8',marginTop:6 }}>{(BARANGAYS[form.municipality]||[]).length} barangays in {form.municipality}</p>
                  </div>
                  <div style={{ height:20 }}/>
                  <div style={{ display:'flex', gap:10 }}>
                    <button type="button" onClick={()=>setStep(1)} style={{ flex:1,padding:'12px',border:'1.5px solid #E2E8F0',background:'white',borderRadius:11,color:'#64748B',fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all .15s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='#0F2878'} onMouseLeave={e=>e.currentTarget.style.borderColor='#E2E8F0'}>
                      <Icon name="chevronLeft" size={14}/> Back
                    </button>
                    <button type="button" onClick={()=>validate2()&&setStep(3)} style={{ flex:2,padding:'12px',background:'#0A1628',border:'none',borderRadius:11,color:'white',fontSize:14,fontWeight:700,fontFamily:'inherit',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 14px rgba(10,22,40,.2)' }}>
                      Continue <Icon name="arrowRight" size={15}/>
                    </button>
                  </div>
                </>
              )}

              {/* ── STEP 3 ── */}
              {step===3&&(
                <>
                  <p style={{ fontSize:12,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:12 }}>Select Account Type</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                    {/* Kabataan */}
                    <button type="button" onClick={()=>set('accountType','kabataan')} style={{ display:'flex',alignItems:'flex-start',gap:14,padding:'14px 16px',borderRadius:12,cursor:'pointer',textAlign:'left', border:form.accountType==='kabataan'?'2px solid #0A1628':'1.5px solid #E2E8F0', background:form.accountType==='kabataan'?'#EFF6FF':'#FAFBFF',transition:'all .15s' }}>
                      <div style={{ width:40,height:40,borderRadius:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:form.accountType==='kabataan'?'#0A1628':'#E2E8F0',transition:'all .15s' }}>
                        <Icon name="star" size={17} color={form.accountType==='kabataan'?'#F5C400':'#94A3B8'}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontWeight:700,fontSize:14,color:'#0A1628',marginBottom:3 }}>Kabataan User</p>
                        <p style={{ fontSize:12,color:'#64748B',lineHeight:1.6 }}>Earn points, join events, view announcements and budget reports.</p>
                      </div>
                      {form.accountType==='kabataan'&&<div style={{ width:20,height:20,borderRadius:'50%',background:'#DCFCE7',border:'1.5px solid #86EFAC',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}><Icon name="check" size={11} color="#15803D"/></div>}
                    </button>

                    {/* SK Official */}
                    <button type="button" onClick={()=>set('accountType','sk_official')} style={{ display:'flex',alignItems:'flex-start',gap:14,padding:'14px 16px',borderRadius:12,cursor:'pointer',textAlign:'left', border:form.accountType==='sk_official'?'2px solid #C49A2E':'1.5px solid #E2E8F0', background:form.accountType==='sk_official'?'#FFFCF0':'#FAFBFF',transition:'all .15s' }}>
                      <div style={{ width:40,height:40,borderRadius:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:form.accountType==='sk_official'?'#F5C400':'#E2E8F0',transition:'all .15s' }}>
                        <Icon name="identification" size={17} color={form.accountType==='sk_official'?'#0A1628':'#94A3B8'}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontWeight:700,fontSize:14,color:'#0A1628',marginBottom:3 }}>I am an SK Official</p>
                        <p style={{ fontSize:12,color:'#64748B',lineHeight:1.6 }}>I hold an SK position and need access to the SK portal.</p>
                      </div>
                      {form.accountType==='sk_official'&&<div style={{ width:20,height:20,borderRadius:'50%',background:'#FFF8DC',border:'1.5px solid #F5C400',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}><Icon name="check" size={11} color="#8B6914"/></div>}
                    </button>
                  </div>

                  {form.accountType==='sk_official'&&(
                    <div style={{ background:'#FFFCF0',border:'1.5px solid rgba(196,154,46,.2)',borderRadius:12,padding:'16px',marginBottom:14 }}>
                      <div style={{ background:'#EFF6FF',border:'1px solid rgba(15,40,120,.1)',borderRadius:9,padding:'10px 13px',marginBottom:13,display:'flex',gap:9,alignItems:'flex-start' }}>
                        <Icon name="shield" size={14} color="#0F2878"/>
                        <p style={{ fontSize:12,color:'#1E40AF',lineHeight:1.6 }}>Your account starts as <strong>Kabataan User</strong>. Admin will verify and upgrade your access.</p>
                      </div>
                      <div style={{ marginBottom:12 }}>
                        <label style={lbl}>Your SK Position</label>
                        <select style={inp({cursor:'pointer'})} required={form.accountType==='sk_official'} value={form.skPosition} onChange={e=>set('skPosition',e.target.value)} onFocus={focIn} onBlur={focOut}>
                          <option value="">Select position...</option>
                          {SK_POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div style={{ marginBottom:12 }}>
                        <label style={lbl}>Proof of Position</label>
                        <textarea rows={3} style={{ ...inp(),resize:'vertical',lineHeight:1.65 }} placeholder="e.g. I was elected SK Chairperson of Brgy. Isok I during the 2023 elections." required={form.accountType==='sk_official'} value={form.skProof} onChange={e=>set('skProof',e.target.value)} onFocus={focIn} onBlur={focOut}/>
                        <p style={{ fontSize:11,color:'#94A3B8',marginTop:5 }}>Admin will use this to verify your identity.</p>
                      </div>
                      <div>
                        <label style={lbl}>Additional note <span style={{ fontWeight:400,color:'#94A3B8' }}>(optional)</span></label>
                        <textarea rows={2} style={{ ...inp(),resize:'vertical',lineHeight:1.65 }} placeholder="Any additional details for the Admin..." value={form.skNote} onChange={e=>set('skNote',e.target.value)} onFocus={focIn} onBlur={focOut}/>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div style={{ background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:10,padding:'12px 14px',marginBottom:18 }}>
                    <p style={{ fontSize:10,fontWeight:700,color:'#CBD5E1',marginBottom:6,textTransform:'uppercase',letterSpacing:'.5px' }}>Summary</p>
                    <p style={{ fontSize:13,color:'#475569',lineHeight:1.8 }}>
                      <span style={{ fontWeight:700,color:'#0A1628' }}>{form.firstName||'—'} {form.lastName}</span>
                      <span style={{ color:'#CBD5E1' }}> · </span>
                      <span>{form.barangay||'—'}, {form.municipality}</span>
                      <span style={{ color:'#CBD5E1' }}> · </span>
                      <span style={{ fontWeight:600,color:form.accountType==='sk_official'?'#8B6914':'#15803D' }}>
                        {form.accountType==='sk_official'?`SK Official${form.skPosition?` — ${form.skPosition}`:'`'}` :'Kabataan User'}
                      </span>
                    </p>
                  </div>

                  <div style={{ display:'flex', gap:10 }}>
                    <button type="button" onClick={()=>setStep(2)} style={{ flex:1,padding:'12px',border:'1.5px solid #E2E8F0',background:'white',borderRadius:11,color:'#64748B',fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all .15s' }} onMouseEnter={e=>e.currentTarget.style.borderColor='#0F2878'} onMouseLeave={e=>e.currentTarget.style.borderColor='#E2E8F0'}>
                      <Icon name="chevronLeft" size={14}/> Back
                    </button>
                    <button type="submit" disabled={loading} style={{ flex:2,padding:'12px',background:loading?'#64748B':'#0A1628',border:'none',borderRadius:11,color:'white',fontSize:14,fontWeight:700,fontFamily:'inherit',cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:loading?'none':'0 4px 14px rgba(10,22,40,.2)' }}>
                      {loading
                        ?<><div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',animation:'spin .65s linear infinite' }}/> Creating...</>
                        :<>{form.accountType==='sk_official'?'Submit for Verification':'Create Account'} <Icon name="check" size={14}/></>
                      }
                    </button>
                  </div>
                </>
              )}
            </form>

            {/* Already have account — bottom of form */}
            {step===1&&(
              <>
                <div style={{ display:'flex',alignItems:'center',gap:12,margin:'22px 0' }}>
                  <div style={{ flex:1,height:1,background:'#E2E8F0' }}/>
                  <span style={{ fontSize:12,color:'#CBD5E1',fontWeight:500 }}>or</span>
                  <div style={{ flex:1,height:1,background:'#E2E8F0' }}/>
                </div>
                <Link to="/login" style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',padding:'13px',border:'1.5px solid #E2E8F0',borderRadius:11,background:'white',color:'#0A1628',fontSize:14,fontWeight:600,textDecoration:'none',transition:'all .15s',boxSizing:'border-box' }} onMouseEnter={e=>{e.currentTarget.style.borderColor='#0F2878';e.currentTarget.style.background='#F4F7FF'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.background='white'}}>
                  Already have an account? <strong style={{ color:'#0F2878' }}>Sign in</strong>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        .auth-mobile-header { display:none }
        @media (max-width:768px) {
          .auth-left { display:none !important }
          .auth-mobile-header { display:block !important }
          .auth-brand-row { display:none !important }
          .auth-form-wrap { padding:28px 20px !important; align-items:flex-start !important }
        }
        input::placeholder, textarea::placeholder { color:#CBD5E1 }
        select option { color:#0A1628 }
      `}</style>
    </div>
  )
}