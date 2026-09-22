// auth/Register.jsx — sign up + email verification (6-digit code)
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import skLogo from '../../assets/sk-logo.png'
import authBg from '../../assets/auth-bg.svg'

const C = {
  night:'#1E1B4B', ink:'#0F1F5C', indigo:'#4F46E5', violet:'#7C3AED',
  gold:'#EAB308', mist:'#F4F6FB', line:'#E7E9F2', slate:'#5A6478', faint:'#93A0B4',
  rose:'#E11D48', emerald:'#059669',
}
const field = { width:'100%', padding:'13px 14px', border:`1.5px solid ${C.line}`, borderRadius:12, fontSize:14.5, outline:'none', boxSizing:'border-box', fontFamily:'inherit', transition:'border 0.15s' }
const lbl = { fontSize:12.5, fontWeight:700, color:C.ink, display:'block', marginBottom:7 }

const emailLooksValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export default function Register() {
  const { register, verifyEmail, resendCode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const preVerifyEmail = location.state?.verifyEmail

  const [step, setStep] = useState(preVerifyEmail ? 'verify' : 'form')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ firstName:'', lastName:'', email:preVerifyEmail||'', purok:'', address:'', password:'', confirm:'' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim())  e.lastName = 'Required'
    if (!form.email.trim())     e.email = 'Required'
    else if (!emailLooksValid(form.email)) e.email = 'Enter a valid email address'
    if (!form.purok.trim())     e.purok = 'Required'
    if (!form.address.trim())   e.address = 'Required'
    if (!form.password)         e.password = 'Required'
    else if (form.password.length < 6) e.password = 'At least 6 characters'
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submitForm = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim().toLowerCase(),
        purok:     form.purok.trim(),
        address:   form.address.trim(),
        password:  form.password,
      })
      toast.success('Code sent! Check your email.')
      setStep('verify')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create account.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Plus Jakarta Sans','Inter',sans-serif" }}>

      <div className="reg-brand" style={{
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
            Be part of your<br/><span style={{ color:C.gold }}>youth council.</span>
          </h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.78)', lineHeight:1.6, maxWidth:380 }}>
            Join events, earn points for taking part, and see exactly how your SK serves the barangay.
          </p>
          <div style={{ marginTop:28, paddingLeft:16, borderLeft:`3px solid ${C.gold}` }}>
            <p style={{ fontSize:17, fontWeight:700, color:'#fff', fontStyle:'italic', lineHeight:1.4, margin:0 }}>"Every young voice shapes Tawiran."</p>
          </div>
        </div>

        <div style={{ position:'relative', fontSize:12.5, color:'rgba(255,255,255,0.5)' }}>
          © {new Date().getFullYear()} Sangguniang Kabataan · Santa Cruz, Marinduque
        </div>
      </div>

      <div style={{ flex:'1 1 54%', background:C.mist, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}>
        <div style={{ width:'100%', maxWidth:420 }}>

          <div className="reg-mobile-logo" style={{ display:'none', marginBottom:24 }}>
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
              <p style={{ fontSize:14.5, fontWeight:700, color:'#fff', fontStyle:'italic', lineHeight:1.4, margin:0, borderLeft:`3px solid ${C.gold}`, paddingLeft:12 }}>"Every young voice shapes Tawiran."</p>
            </div>
          </div>

          {step === 'form' ? (
            <FormStep {...{ form, setForm, errors, showPass, setShowPass, loading, submitForm }} />
          ) : (
            <VerifyStep email={form.email.trim().toLowerCase()} firstName={form.firstName}
              verifyEmail={verifyEmail} resendCode={resendCode} navigate={navigate}
              onBack={()=>setStep('form')} />
          )}
        </div>
      </div>

      <style>{`
        .reg-brand { display:flex; }
        @media (max-width:820px) {
          .reg-brand { display:none; }
          .reg-mobile-logo { display:block !important; }
        }
      `}</style>
    </div>
  )
}

function FormStep({ form, setForm, errors, showPass, setShowPass, loading, submitForm }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const err = (k) => errors[k] && <p style={{ fontSize:11.5, color:C.rose, margin:'5px 0 0', fontWeight:600 }}>{errors[k]}</p>
  const bd = (k) => ({ ...field, borderColor: errors[k] ? C.rose : C.line })

  return (
    <>
      <h2 style={{ fontSize:26, fontWeight:800, color:C.ink, margin:'0 0 6px', letterSpacing:'-0.5px' }}>Create your account</h2>
      <p style={{ fontSize:14, color:C.slate, margin:'0 0 26px' }}>For kabataan of Barangay Tawiran.</p>

      <form onSubmit={submitForm} noValidate>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
          <div>
            <label style={lbl}>First name</label>
            <input style={bd('firstName')} value={form.firstName} onChange={set('firstName')} placeholder="Juan" />
            {err('firstName')}
          </div>
          <div>
            <label style={lbl}>Last name</label>
            <input style={bd('lastName')} value={form.lastName} onChange={set('lastName')} placeholder="Dela Cruz" />
            {err('lastName')}
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Email address</label>
          <input type="email" style={bd('email')} value={form.email} onChange={set('email')} placeholder="you@email.com" />
          {errors.email ? err('email') : <p style={{ fontSize:11.5, color:C.faint, margin:'5px 0 0' }}>We'll send a verification code here.</p>}
        </div>

        <div style={{ background:'#F4F6FB', borderRadius:12, padding:14, marginBottom:16, border:`1px solid ${C.line}` }}>
          <div style={{ fontSize:11.5, fontWeight:700, color:C.ink, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
            📍 Residency in Barangay Tawiran
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={lbl}>Purok / Sitio</label>
            <input style={bd('purok')} value={form.purok} onChange={set('purok')} placeholder="e.g. Purok 1" />
            {err('purok')}
          </div>
          <div>
            <label style={lbl}>Complete Address</label>
            <input style={bd('address')} value={form.address} onChange={set('address')} placeholder="House no., street, Brgy. Tawiran" />
            {err('address')}
          </div>
          <p style={{ fontSize:10.5, color:C.faint, margin:'8px 0 0', lineHeight:1.5 }}>This portal is for the youth of Barangay Tawiran only. Your details help the SK verify residency.</p>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Password</label>
          <div style={{ position:'relative' }}>
            <input type={showPass?'text':'password'} style={bd('password')} value={form.password} onChange={set('password')} placeholder="At least 6 characters" />
            <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', fontSize:12.5, color:C.indigo, fontWeight:700, cursor:'pointer' }}>{showPass?'Hide':'Show'}</button>
          </div>
          {err('password')}
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={lbl}>Confirm password</label>
          <input type={showPass?'text':'password'} style={bd('confirm')} value={form.confirm} onChange={set('confirm')} placeholder="Re-enter password" />
          {err('confirm')}
        </div>

        <button type="submit" disabled={loading} style={{
          width:'100%', padding:'14px', background: loading ? C.faint : `linear-gradient(135deg,${C.indigo},${C.violet})`,
          color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: loading ? 'default' : 'pointer',
          boxShadow: loading ? 'none' : '0 8px 22px rgba(79,70,229,0.3)',
        }}>{loading ? 'Sending code…' : 'Create account'}</button>
      </form>

      <p style={{ textAlign:'center', fontSize:13.5, color:C.slate, margin:'22px 0 0' }}>
        Already have an account? <Link to="/login" style={{ color:C.indigo, fontWeight:700, textDecoration:'none' }}>Sign in</Link>
      </p>
    </>
  )
}

function VerifyStep({ email, verifyEmail, resendCode, navigate, onBack }) {
  const [digits, setDigits] = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputs = useRef([])

  useEffect(() => { inputs.current[0]?.focus() }, [])
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const code = digits.join('')

  const setDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[i] = v; setDigits(next)
    if (v && i < 5) inputs.current[i+1]?.focus()
  }
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i-1]?.focus()
  }
  const onPaste = (e) => {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6).split('')
    if (p.length) { const next = ['','','','','','']; p.forEach((d,i)=>next[i]=d); setDigits(next); inputs.current[Math.min(p.length,5)]?.focus() }
  }

  const submit = async () => {
    if (code.length !== 6) return toast.error('Enter the full 6-digit code.')
    setLoading(true)
    try {
      await verifyEmail(email, code)
      toast.success('Verified! Welcome 🎉')
      navigate('/kabataan', { replace:true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed.')
      setDigits(['','','','','','']); inputs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  const resend = async () => {
    if (cooldown > 0) return
    try { await resendCode(email); toast.success('New code sent!'); setCooldown(30) }
    catch (err) { toast.error(err.response?.data?.message || 'Could not resend.') }
  }

  return (
    <>
      <button onClick={onBack} style={{ background:'none', border:'none', color:C.slate, fontSize:13, fontWeight:600, cursor:'pointer', padding:0, marginBottom:20 }}>← Back</button>

      <div style={{ width:56, height:56, borderRadius:16, background:'#EEF0FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, marginBottom:18 }}>📧</div>
      <h2 style={{ fontSize:24, fontWeight:800, color:C.ink, margin:'0 0 8px', letterSpacing:'-0.5px' }}>Check your email</h2>
      <p style={{ fontSize:14, color:C.slate, margin:'0 0 4px', lineHeight:1.6 }}>We sent a 6-digit code to</p>
      <p style={{ fontSize:14, color:C.ink, fontWeight:700, margin:'0 0 26px' }}>{email}</p>

      <div style={{ display:'flex', gap:8, marginBottom:22, justifyContent:'space-between' }} onPaste={onPaste}>
        {digits.map((d, i) => (
          <input key={i} ref={el=>inputs.current[i]=el} value={d} inputMode="numeric" maxLength={1}
            onChange={e=>setDigit(i, e.target.value)} onKeyDown={e=>onKey(i, e)}
            style={{
              width:'100%', aspectRatio:'1', maxWidth:52, textAlign:'center', fontSize:24, fontWeight:800,
              border:`1.5px solid ${d ? C.indigo : C.line}`, borderRadius:12, outline:'none', color:C.ink,
              background: d ? '#F5F7FF' : '#fff', transition:'all 0.15s',
            }} />
        ))}
      </div>

      <button onClick={submit} disabled={loading || code.length !== 6} style={{
        width:'100%', padding:'14px', border:'none', borderRadius:12, fontSize:15, fontWeight:700,
        cursor: (loading || code.length !== 6) ? 'default' : 'pointer',
        background: (loading || code.length !== 6) ? C.faint : `linear-gradient(135deg,${C.indigo},${C.violet})`,
        color:'#fff', boxShadow: (loading || code.length !== 6) ? 'none' : '0 8px 22px rgba(79,70,229,0.3)',
      }}>{loading ? 'Verifying…' : 'Verify & continue'}</button>

      <p style={{ textAlign:'center', fontSize:13.5, color:C.slate, margin:'22px 0 0' }}>
        Didn't get it?{' '}
        <button onClick={resend} disabled={cooldown>0} style={{ background:'none', border:'none', color: cooldown>0 ? C.faint : C.indigo, fontWeight:700, cursor: cooldown>0?'default':'pointer', fontFamily:'inherit', fontSize:13.5 }}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </p>
    </>
  )
}