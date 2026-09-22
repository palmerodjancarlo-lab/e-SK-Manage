// auth/Login.jsx — sign in (matches Register design)
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import skLogo from '../../assets/sk-logo.png'
import authBg from '../../assets/auth-bg.svg'

const C = {
  night:'#1E1B4B', ink:'#0F1F5C', indigo:'#4F46E5', violet:'#7C3AED',
  gold:'#EAB308', mist:'#F4F6FB', line:'#E7E9F2', slate:'#5A6478', faint:'#93A0B4', rose:'#E11D48',
}
const field = { width:'100%', padding:'13px 14px', border:`1.5px solid ${C.line}`, borderRadius:12, fontSize:14.5, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl = { fontSize:12.5, fontWeight:700, color:C.ink, display:'block', marginBottom:7 }

export default function Login() {
  const { login, resendCode } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email:'', password:'' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { user } = await login(form.email.trim().toLowerCase(), form.password)
      toast.success(`Welcome back, ${user.firstName}!`)
      const SK_ROLES = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']
      if      (user.role === 'admin')        navigate('/admin/dashboard', { replace:true })
      else if (SK_ROLES.includes(user.role)) navigate('/sk/dashboard',    { replace:true })
      else                                   navigate('/kabataan',         { replace:true })
    } catch (err) {
      const data = err.response?.data
      // If unverified, send them a fresh code and bounce to register's verify step
      if (data?.needsVerification) {
        toast.error('Please verify your email first.')
        try { await resendCode(data.email || form.email.trim().toLowerCase()) } catch { /* ignore */ }
        navigate('/register', { state:{ verifyEmail: data.email || form.email.trim().toLowerCase() } })
        return
      }
      toast.error(data?.message || 'Invalid email or password.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Plus Jakarta Sans','Inter',sans-serif" }}>

      {/* Left brand panel */}
      <div className="log-brand" style={{
        flex:'1 1 46%', background:`url(${authBg}) center/cover, ${C.night}`,
        color:'#fff', padding:'48px 52px', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-100, right:-80, width:320, height:320, borderRadius:'50%', border:'1px solid rgba(234,179,8,0.15)' }} />
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src={skLogo} alt="SK" style={{ width:30, objectFit:'contain' }} />
          </div>
          <div>
            <div style={{ fontSize:17, fontWeight:800 }}>e-SK Manage</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)' }}>Barangay Tawiran</div>
          </div>
        </div>

        <div style={{ position:'relative' }}>
          <h1 style={{ fontSize:34, fontWeight:800, lineHeight:1.15, letterSpacing:'-1px', margin:'0 0 16px' }}>
            Welcome back to<br/><span style={{ color:C.gold }}>e-SK Manage.</span>
          </h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.78)', lineHeight:1.6, maxWidth:380 }}>
            Sign in to check your points, join events, and see how your council serves the barangay.
          </p>
          <div style={{ marginTop:28, paddingLeft:16, borderLeft:`3px solid ${C.gold}` }}>
            <p style={{ fontSize:17, fontWeight:700, color:'#fff', fontStyle:'italic', lineHeight:1.4, margin:0 }}>"Your voice. Your barangay. Your future."</p>
          </div>
        </div>

        <div style={{ position:'relative', fontSize:12.5, color:'rgba(255,255,255,0.5)' }}>
          © {new Date().getFullYear()} Sangguniang Kabataan · Santa Cruz, Marinduque
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex:'1 1 54%', background:C.mist, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}>
        <div style={{ width:'100%', maxWidth:400 }}>

          <div className="log-mobile-logo" style={{ display:'none', marginBottom:24 }}>
            <div style={{ background:`url(${authBg}) center/cover, ${C.night}`, borderRadius:18, padding:'26px 22px', position:'relative', overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:14 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                  <img src={skLogo} alt="SK" style={{ width:32, objectFit:'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>e-SK Manage</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>Barangay Tawiran</div>
                </div>
              </div>
              <p style={{ fontSize:14.5, fontWeight:700, color:'#fff', fontStyle:'italic', lineHeight:1.4, margin:0, borderLeft:`3px solid ${C.gold}`, paddingLeft:12 }}>"Your voice. Your barangay. Your future."</p>
            </div>
          </div>

          <h2 style={{ fontSize:26, fontWeight:800, color:C.ink, margin:'0 0 6px', letterSpacing:'-0.5px' }}>Sign in</h2>
          <p style={{ fontSize:14, color:C.slate, margin:'0 0 26px' }}>Enter your details to continue.</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Email address</label>
              <input type="email" style={field} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@email.com" required />
            </div>

            <div style={{ marginBottom:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                <label style={{ ...lbl, marginBottom:0 }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize:12.5, fontWeight:700, color:C.indigo, textDecoration:'none' }}>Forgot password?</Link>
              </div>
              <div style={{ position:'relative' }}>
                <input type={showPass?'text':'password'} style={field} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Your password" required />
                <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', fontSize:12.5, color:C.indigo, fontWeight:700, cursor:'pointer' }}>{showPass?'Hide':'Show'}</button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width:'100%', padding:'14px', border:'none', borderRadius:12, fontSize:15, fontWeight:700,
              cursor: loading ? 'default' : 'pointer',
              background: loading ? C.faint : `linear-gradient(135deg,${C.indigo},${C.violet})`,
              color:'#fff', boxShadow: loading ? 'none' : '0 8px 22px rgba(79,70,229,0.3)',
            }}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>

          <p style={{ textAlign:'center', fontSize:13.5, color:C.slate, margin:'22px 0 0' }}>
            New here? <Link to="/register" style={{ color:C.indigo, fontWeight:700, textDecoration:'none' }}>Create an account</Link>
          </p>
        </div>
      </div>

      <style>{`
        .log-brand { display:flex; }
        @media (max-width:820px) {
          .log-brand { display:none; }
          .log-mobile-logo { display:block !important; }
        }
      `}</style>
    </div>
  )
}