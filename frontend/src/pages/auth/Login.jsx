// Login.jsx — polished desktop + mobile
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../components/Icon'
import toast from 'react-hot-toast'
import skLogo from '../../assets/sk-logo.svg'

export default function Login() {
  const { login }               = useAuth()
  const navigate                = useNavigate()
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm]         = useState({ email:'', password:'' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { user } = await login(form.email, form.password)
      toast.success(`Welcome back, ${user.firstName}!`)
      if      (user.role === 'admin')      navigate('/admin/dashboard', { replace:true })
      else if (user.role === 'sk_officer') navigate('/sk/dashboard',    { replace:true })
      else                                 navigate('/kabataan',         { replace:true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password.')
    } finally { setLoading(false) }
  }

  const FEATURES = [
    { icon:'qrCode',    text:'QR event check-in and points' },
    { icon:'banknotes', text:'Budget transparency for everyone' },
    { icon:'megaphone', text:'SK news and announcements' },
    { icon:'star',      text:'Rewards for youth participation' },
  ]

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Plus Jakarta Sans',-apple-system,sans-serif", background:'#F4F7FF' }}>

      {/* ── LEFT PANEL — hidden on mobile ── */}
      <div className="auth-left" style={{
        width:460, flexShrink:0,
        background:'linear-gradient(160deg, #0A1628 0%, #0F2878 55%, #1535A0 100%)',
        display:'flex', flexDirection:'column',
        padding:'48px 52px', position:'relative', overflow:'hidden',
      }}>
        {[500,390,285,190,115].map((s,i) => (
          <div key={i} aria-hidden style={{ position:'absolute', bottom:-s*.48, right:-s*.42, width:s, height:s, borderRadius:'50%', border:`1px solid rgba(255,255,255,${.04+i*.028})`, pointerEvents:'none' }} />
        ))}
        <div aria-hidden style={{ position:'absolute', top:-80, left:-80, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(100,140,255,.06) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div aria-hidden style={{ position:'absolute', bottom:-60, left:40, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle, rgba(245,196,0,.07) 0%, transparent 65%)', pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100%' }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:72 }}>
            <div style={{ width:44, height:44, borderRadius:13, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src={skLogo} alt="SK" style={{ width:28, objectFit:'contain' }} />
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:'white', lineHeight:1.2 }}>e-SK Manage</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:1 }}>Province of Marinduque</p>
            </div>
          </div>

          <div style={{ flex:1 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:999, marginBottom:22 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#F5C400' }} />
              <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.65)', letterSpacing:'.3px' }}>SK Youth Management</span>
            </div>

            <h1 style={{ fontSize:42, fontWeight:800, color:'white', lineHeight:1.1, letterSpacing:'-1.2px', marginBottom:20 }}>
              Serving the<br />
              <span style={{ color:'#F5C400' }}>Youth of</span><br />
              Marinduque.
            </h1>

            <p style={{ fontSize:13, color:'rgba(255,255,255,.42)', lineHeight:1.9, maxWidth:290, marginBottom:44 }}>
              The official platform for Sangguniang Kabataan — managing activities, transparency, and youth engagement across all 6 municipalities.
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              {FEATURES.map(f => (
                <div key={f.text} style={{ display:'flex', alignItems:'center', gap:13 }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon name={f.icon} size={14} color="#F5C400" />
                  </div>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:500 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#ffffff', overflowY:'auto' }}>

        {/* ── MOBILE HEADER ── */}
        <div className="auth-mobile-header">
          <div style={{ background:'linear-gradient(160deg,#0A1628 0%,#0F2878 55%,#1535A0 100%)', padding:'28px 24px 36px', position:'relative', overflow:'hidden' }}>
            {[220,150,90].map((s,i) => (
              <div key={i} aria-hidden style={{ position:'absolute', bottom:-s*.45, right:-s*.4, width:s, height:s, borderRadius:'50%', border:`1px solid rgba(255,255,255,${.06+i*.035})`, pointerEvents:'none' }} />
            ))}
            <div aria-hidden style={{ position:'absolute', bottom:-30, left:-20, width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,196,0,.09) 0%,transparent 65%)', pointerEvents:'none' }} />
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <img src={skLogo} alt="SK" style={{ width:24, objectFit:'contain' }} />
                </div>
                <div>
                  <p style={{ fontSize:14, fontWeight:800, color:'white', lineHeight:1.2 }}>e-SK Manage</p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>Province of Marinduque</p>
                </div>
              </div>
              <h1 style={{ fontSize:26, fontWeight:800, color:'white', lineHeight:1.2, letterSpacing:'-.5px', marginBottom:6 }}>
                Serving the Youth<br />of <span style={{ color:'#F5C400' }}>Marinduque.</span>
              </h1>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.45)', lineHeight:1.7 }}>
                The official SK youth management platform.
              </p>
            </div>
          </div>
        </div>

        {/* ── FORM ── */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 40px' }} className="auth-form-wrap">
          <div style={{ width:'100%', maxWidth:400 }}>

            {/* Desktop brand */}
            <div className="auth-brand-row" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:36 }}>
              <img src={skLogo} alt="SK" style={{ width:24, objectFit:'contain' }} />
              <span style={{ fontSize:15, fontWeight:800, color:'#0A1628', letterSpacing:'-.3px' }}>e-SK Manage</span>
            </div>

            {/* Heading */}
            <h2 style={{ fontSize:26, fontWeight:800, color:'#0A1628', letterSpacing:'-.5px', marginBottom:6 }}>Welcome back!</h2>
            <p style={{ fontSize:14, color:'#94A3B8', marginBottom:32, lineHeight:1.5 }}>Sign in to your account to continue.</p>

            {/* Form fields */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:18 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:8 }}>Email address</label>
                <input type="email" autoFocus autoComplete="email" required placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({...form, email:e.target.value})}
                  style={{ width:'100%', padding:'12px 16px', border:'1.5px solid #E2E8F0', borderRadius:10, background:'#FAFBFF', color:'#0A1628', fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color .15s, box-shadow .15s', boxSizing:'border-box' }}
                  onFocus={e=>{ e.target.style.borderColor='#0F2878'; e.target.style.boxShadow='0 0 0 3px rgba(15,40,120,.08)' }}
                  onBlur={e=>{ e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none' }} />
              </div>

              <div style={{ marginBottom:8 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:8 }}>Password</label>
                <div style={{ position:'relative' }}>
                  <input type={showPass?'text':'password'} required autoComplete="current-password" placeholder="Enter your password"
                    value={form.password} onChange={e => setForm({...form, password:e.target.value})}
                    style={{ width:'100%', padding:'12px 48px 12px 16px', border:'1.5px solid #E2E8F0', borderRadius:10, background:'#FAFBFF', color:'#0A1628', fontSize:14, fontFamily:'inherit', outline:'none', transition:'border-color .15s, box-shadow .15s', boxSizing:'border-box' }}
                    onFocus={e=>{ e.target.style.borderColor='#0F2878'; e.target.style.boxShadow='0 0 0 3px rgba(15,40,120,.08)' }}
                    onBlur={e=>{ e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none' }} />
                  <button type="button" onClick={()=>setShowPass(p=>!p)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex', padding:4, borderRadius:6, transition:'color .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.color='#0F2878'}
                    onMouseLeave={e=>e.currentTarget.style.color='#94A3B8'}>
                    <Icon name={showPass?'eyeOff':'eye'} size={17}/>
                  </button>
                </div>
              </div>

              <div style={{ textAlign:'right', marginBottom:28 }}>
                <span style={{ fontSize:13, color:'#0F2878', fontWeight:700, cursor:'default' }}>Forgot password?</span>
              </div>

              <button type="submit" disabled={loading} style={{
                width:'100%', padding:'13px', background:loading?'#64748B':'#0A1628',
                border:'none', borderRadius:11, color:'white', fontSize:15, fontWeight:700,
                fontFamily:'inherit', cursor:loading?'not-allowed':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'all .2s', boxShadow:loading?'none':'0 4px 16px rgba(10,22,40,.22)',
              }}
              onMouseEnter={e=>{ if(!loading){ e.currentTarget.style.background='#0F2878'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(15,40,120,.3)' }}}
              onMouseLeave={e=>{ e.currentTarget.style.background=loading?'#64748B':'#0A1628'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=loading?'none':'0 4px 16px rgba(10,22,40,.22)' }}>
                {loading
                  ? <><div style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',animation:'spin .65s linear infinite' }}/> Signing in...</>
                  : 'Sign in'}
              </button>
            </form>

            {/* Divider + register link */}
            <div style={{ display:'flex', alignItems:'center', gap:12, margin:'24px 0' }}>
              <div style={{ flex:1, height:1, background:'#E2E8F0' }} />
              <span style={{ fontSize:12, color:'#CBD5E1', fontWeight:500 }}>or</span>
              <div style={{ flex:1, height:1, background:'#E2E8F0' }} />
            </div>

            <Link to="/register" style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              width:'100%', padding:'13px', border:'1.5px solid #E2E8F0',
              borderRadius:11, background:'white', color:'#0A1628',
              fontSize:14, fontWeight:600, textDecoration:'none',
              transition:'all .15s', boxSizing:'border-box',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor='#0F2878'; e.currentTarget.style.background='#F4F7FF' }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.background='white' }}>
              Don't have an account? <strong style={{ color:'#0F2878' }}>Create account</strong>
            </Link>
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
          .auth-form-wrap { padding:28px 24px !important; align-items:flex-start !important }
        }
        input::placeholder { color:#CBD5E1 }
      `}</style>
    </div>
  )
}