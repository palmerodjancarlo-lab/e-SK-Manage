// auth/ForgotPassword.jsx — request reset code, then set a new password
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import skLogo from '../../assets/sk-logo.png'
import authBg from '../../assets/auth-bg.svg'

const C = {
  night:'#1E1B4B', ink:'#0F1F5C', indigo:'#4F46E5', violet:'#7C3AED',
  gold:'#EAB308', mist:'#F4F6FB', line:'#E7E9F2', slate:'#5A6478', faint:'#93A0B4', rose:'#E11D48', emerald:'#059669',
}
const field = { width:'100%', padding:'13px 14px', border:`1.5px solid ${C.line}`, borderRadius:12, fontSize:14.5, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const lbl = { fontSize:12.5, fontWeight:700, color:C.ink, display:'block', marginBottom:7 }
const emailLooksValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('email') // 'email' | 'reset' | 'done'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // step 1 — request code
  const requestCode = async (e) => {
    e.preventDefault()
    if (!emailLooksValid(email)) return toast.error('Enter a valid email address.')
    setLoading(true)
    try {
      await forgotPassword(email.trim().toLowerCase())
      toast.success('If that email exists, a code was sent.')
      setStep('reset')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Plus Jakarta Sans','Inter',sans-serif" }}>

      {/* Brand panel */}
      <div className="fp-brand" style={{
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
            Forgot your<br/><span style={{ color:C.gold }}>password?</span>
          </h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.78)', lineHeight:1.6, maxWidth:380 }}>
            No worries. We'll email you a code to reset it and get you back in.
          </p>
          <div style={{ marginTop:28, paddingLeft:16, borderLeft:`3px solid ${C.gold}` }}>
            <p style={{ fontSize:17, fontWeight:700, color:'#fff', fontStyle:'italic', lineHeight:1.4, margin:0 }}>"We've got you — back in, in a minute."</p>
          </div>
        </div>
        <div style={{ position:'relative', fontSize:12.5, color:'rgba(255,255,255,0.5)' }}>
          © {new Date().getFullYear()} Sangguniang Kabataan · Santa Cruz, Marinduque
        </div>
      </div>

      {/* Form panel */}
      <div style={{ flex:'1 1 54%', background:C.mist, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}>
        <div style={{ width:'100%', maxWidth:420 }}>

          <div className="fp-mobile-logo" style={{ display:'none', marginBottom:24 }}>
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
              <p style={{ fontSize:14.5, fontWeight:700, color:'#fff', fontStyle:'italic', lineHeight:1.4, margin:0, borderLeft:`3px solid ${C.gold}`, paddingLeft:12 }}>"We've got you — back in, in a minute."</p>
            </div>
          </div>

          {step === 'email' && (
            <>
              <h2 style={{ fontSize:26, fontWeight:800, color:C.ink, margin:'0 0 6px', letterSpacing:'-0.5px' }}>Reset password</h2>
              <p style={{ fontSize:14, color:C.slate, margin:'0 0 26px' }}>Enter your email and we'll send you a reset code.</p>
              <form onSubmit={requestCode}>
                <div style={{ marginBottom:24 }}>
                  <label style={lbl}>Email address</label>
                  <input type="email" style={field} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" required />
                </div>
                <button type="submit" disabled={loading} style={{
                  width:'100%', padding:'14px', border:'none', borderRadius:12, fontSize:15, fontWeight:700,
                  cursor: loading ? 'default' : 'pointer',
                  background: loading ? C.faint : `linear-gradient(135deg,${C.indigo},${C.violet})`,
                  color:'#fff', boxShadow: loading ? 'none' : '0 8px 22px rgba(79,70,229,0.3)',
                }}>{loading ? 'Sending…' : 'Send reset code'}</button>
              </form>
              <p style={{ textAlign:'center', fontSize:13.5, color:C.slate, margin:'22px 0 0' }}>
                Remembered it? <Link to="/login" style={{ color:C.indigo, fontWeight:700, textDecoration:'none' }}>Back to sign in</Link>
              </p>
            </>
          )}

          {step === 'reset' && (
            <ResetStep email={email.trim().toLowerCase()} resetPassword={resetPassword}
              forgotPassword={forgotPassword} onDone={()=>setStep('done')} onBack={()=>setStep('email')} />
          )}

          {step === 'done' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ width:72, height:72, borderRadius:20, background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, margin:'0 auto 20px' }}>✅</div>
              <h2 style={{ fontSize:24, fontWeight:800, color:C.ink, margin:'0 0 8px', letterSpacing:'-0.5px' }}>Password reset!</h2>
              <p style={{ fontSize:14, color:C.slate, margin:'0 0 26px', lineHeight:1.6 }}>Your password has been changed. You can now sign in with your new password.</p>
              <button onClick={()=>navigate('/login')} style={{
                width:'100%', padding:'14px', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer',
                background:`linear-gradient(135deg,${C.indigo},${C.violet})`, color:'#fff', boxShadow:'0 8px 22px rgba(79,70,229,0.3)',
              }}>Go to sign in</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .fp-brand { display:flex; }
        @media (max-width:820px) {
          .fp-brand { display:none; }
          .fp-mobile-logo { display:block !important; }
        }
      `}</style>
    </div>
  )
}

// Step 2 — enter code + new password
function ResetStep({ email, resetPassword, forgotPassword, onDone, onBack }) {
  const [digits, setDigits] = useState(['','','','','',''])
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
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
  const onKey = (i, e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i-1]?.focus() }
  const onPaste = (e) => {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6).split('')
    if (p.length) { const next = ['','','','','','']; p.forEach((d,i)=>next[i]=d); setDigits(next); inputs.current[Math.min(p.length,5)]?.focus() }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (code.length !== 6) return toast.error('Enter the full 6-digit code.')
    if (pw.length < 6) return toast.error('Password must be at least 6 characters.')
    if (pw !== confirm) return toast.error('Passwords do not match.')
    setLoading(true)
    try {
      await resetPassword(email, code, pw)
      toast.success('Password changed!')
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed.')
    } finally { setLoading(false) }
  }

  const resend = async () => {
    if (cooldown > 0) return
    try { await forgotPassword(email); toast.success('New code sent!'); setCooldown(30) }
    catch { toast.error('Could not resend.') }
  }

  return (
    <>
      <button onClick={onBack} style={{ background:'none', border:'none', color:C.slate, fontSize:13, fontWeight:600, cursor:'pointer', padding:0, marginBottom:20 }}>← Back</button>
      <h2 style={{ fontSize:24, fontWeight:800, color:C.ink, margin:'0 0 8px', letterSpacing:'-0.5px' }}>Enter code & new password</h2>
      <p style={{ fontSize:14, color:C.slate, margin:'0 0 4px', lineHeight:1.6 }}>We sent a code to</p>
      <p style={{ fontSize:14, color:C.ink, fontWeight:700, margin:'0 0 22px' }}>{email}</p>

      <form onSubmit={submit}>
        <label style={lbl}>6-digit code</label>
        <div style={{ display:'flex', gap:8, marginBottom:18, justifyContent:'space-between' }} onPaste={onPaste}>
          {digits.map((d, i) => (
            <input key={i} ref={el=>inputs.current[i]=el} value={d} inputMode="numeric" maxLength={1}
              onChange={e=>setDigit(i, e.target.value)} onKeyDown={e=>onKey(i, e)}
              style={{
                width:'100%', aspectRatio:'1', maxWidth:50, textAlign:'center', fontSize:22, fontWeight:800,
                border:`1.5px solid ${d ? C.indigo : C.line}`, borderRadius:12, outline:'none', color:C.ink,
                background: d ? '#F5F7FF' : '#fff',
              }} />
          ))}
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={lbl}>New password</label>
          <div style={{ position:'relative' }}>
            <input type={showPass?'text':'password'} style={field} value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 6 characters" required />
            <button type="button" onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', fontSize:12.5, color:C.indigo, fontWeight:700, cursor:'pointer' }}>{showPass?'Hide':'Show'}</button>
          </div>
        </div>

        <div style={{ marginBottom:22 }}>
          <label style={lbl}>Confirm new password</label>
          <input type={showPass?'text':'password'} style={field} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter password" required />
        </div>

        <button type="submit" disabled={loading} style={{
          width:'100%', padding:'14px', border:'none', borderRadius:12, fontSize:15, fontWeight:700,
          cursor: loading ? 'default' : 'pointer',
          background: loading ? C.faint : `linear-gradient(135deg,${C.indigo},${C.violet})`,
          color:'#fff', boxShadow: loading ? 'none' : '0 8px 22px rgba(79,70,229,0.3)',
        }}>{loading ? 'Resetting…' : 'Reset password'}</button>
      </form>

      <p style={{ textAlign:'center', fontSize:13.5, color:C.slate, margin:'20px 0 0' }}>
        Didn't get it?{' '}
        <button onClick={resend} disabled={cooldown>0} style={{ background:'none', border:'none', color: cooldown>0 ? C.faint : C.indigo, fontWeight:700, cursor: cooldown>0?'default':'pointer', fontFamily:'inherit', fontSize:13.5 }}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </p>
    </>
  )
}