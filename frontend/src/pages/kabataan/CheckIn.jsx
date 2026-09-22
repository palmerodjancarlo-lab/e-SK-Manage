// kabataan/CheckIn.jsx — QR scan check-in to earn points
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export default function CheckIn() {
  const navigate = useNavigate()
  const { T } = useTheme()
  const [status,setStatus]=useState('idle')
  const [result,setResult]=useState(null)
  const [errorMsg,setErrorMsg]=useState('')
  const [manualToken,setManualToken]=useState('')
  const [showManual,setShowManual]=useState(false)
  const scannerRef=useRef(null)
  const scannerDivId='qr-reader-div'

  useEffect(()=>{ return ()=>{ stopScanner() } },[]) // eslint-disable-line

  const stopScanner=async()=>{
    if(scannerRef.current){
      try{ await scannerRef.current.stop(); await scannerRef.current.clear() }catch{ /* ignore */ }
      scannerRef.current=null
    }
  }
  const startScanner=async()=>{
    setStatus('scanning'); setErrorMsg('')
    try{
      const { Html5Qrcode }=await import('html5-qrcode')
      const scanner=new Html5Qrcode(scannerDivId)
      scannerRef.current=scanner
      await scanner.start({ facingMode:'environment' }, { fps:10, qrbox:{ width:230, height:230 } }, (decoded)=>{ doCheckIn(decoded) }, ()=>{})
    }catch{
      setStatus('error'); setErrorMsg('Cannot access camera. Please allow camera permission, or enter the code manually.')
    }
  }
  const doCheckIn=async(raw)=>{
    await stopScanner()
    setStatus('loading'); setErrorMsg('')
    let tok=(raw||'').trim()
    if(tok.includes('/checkin/')) tok=tok.split('/checkin/').pop().split('?')[0].trim()
    try{
      const { data }=await axios.post(`${API}/meetings/checkin`,{ qrToken:tok })
      setResult(data); setStatus('success')
      toast.success(`+${data.pointsAwarded} points earned!`)
    }catch(err){
      const res=err.response?.data
      if(res?.alreadyCheckedIn){ setResult({ pointsAwarded:res.pointsAwarded }); setStatus('already') }
      else { setErrorMsg(res?.message||'Check-in failed. Invalid or expired QR code.'); setStatus('error') }
    }
  }
  const reset=()=>{ setStatus('idle'); setResult(null); setErrorMsg(''); setManualToken(''); setShowManual(false) }

  return (
    <div style={{ minHeight:'100%' }}>
      <div style={{ background:`linear-gradient(135deg,${T.accent},${T.violet})`, padding:'24px 20px', color:'#fff', borderRadius:'0 0 20px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>Scan to Check In 📷</h1>
        <p style={{ fontSize:12.5, opacity:0.85, margin:'3px 0 0' }}>Scan the SK's QR code at events to earn points</p>
      </div>

      <div style={{ padding:16, maxWidth:440, margin:'0 auto' }}>
        {status==='idle' && (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:'32px 24px', textAlign:'center', boxShadow:T.shadow }}>
            <div style={{ width:96, height:96, borderRadius:26, background:`linear-gradient(135deg,${T.accentSoft},${T.violetSoft})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:44, margin:'0 auto 20px' }}>📷</div>
            <h2 style={{ fontSize:19, fontWeight:800, margin:'0 0 6px', color:T.text }}>Ready to check in?</h2>
            <p style={{ fontSize:13, color:T.text2, margin:'0 0 24px', lineHeight:1.5 }}>Point your camera at the QR code shown by an SK official at the event.</p>
            <button onClick={startScanner} style={{ width:'100%', padding:'14px', background:`linear-gradient(135deg,${T.accent},${T.violet})`, color:'#fff', border:'none', borderRadius:14, fontSize:15, fontWeight:700, cursor:'pointer' }}>Open Camera Scanner</button>
            <button onClick={()=>setShowManual(!showManual)} style={{ width:'100%', padding:'12px', background:'transparent', color:T.accentText, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', marginTop:8 }}>{showManual?'Hide':'Enter code manually instead'}</button>
            {showManual && (
              <div style={{ marginTop:12, display:'flex', gap:8 }}>
                <input value={manualToken} onChange={e=>setManualToken(e.target.value)} placeholder="Paste QR code" style={{ flex:1, padding:'12px', border:`1px solid ${T.border}`, borderRadius:12, fontSize:13, outline:'none', background:T.surface, color:T.text }} />
                <button onClick={()=>manualToken&&doCheckIn(manualToken)} style={{ padding:'12px 18px', background:T.text, color:T.surface, border:'none', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer' }}>Go</button>
              </div>
            )}
          </div>
        )}

        {status==='scanning' && (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:20, textAlign:'center', boxShadow:T.shadow }}>
            <div style={{ borderRadius:16, overflow:'hidden', background:'#000', marginBottom:16 }}><div id={scannerDivId} style={{ width:'100%' }} /></div>
            <p style={{ fontSize:13, color:T.text2, margin:'0 0 16px' }}>📍 Point at the QR code…</p>
            <button onClick={()=>{ stopScanner(); reset() }} style={{ width:'100%', padding:'12px', background:T.surface2, color:T.text2, border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer' }}>Cancel</button>
          </div>
        )}

        {status==='loading' && (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:'48px 24px', textAlign:'center', boxShadow:T.shadow }}>
            <div style={{ width:44, height:44, border:`3px solid ${T.border}`, borderTopColor:T.accent, borderRadius:'50%', animation:'sp .7s linear infinite', margin:'0 auto 16px' }} />
            <p style={{ fontSize:14, fontWeight:700, color:T.text2 }}>Checking you in…</p>
            <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {status==='success' && result && (
          <div style={{ background:`linear-gradient(135deg,${T.green},#10B981)`, borderRadius:24, padding:'40px 28px', textAlign:'center', color:'#fff', boxShadow:T.shadowMd }}>
            <div style={{ fontSize:64, marginBottom:12, animation:'pop .4s ease' }}>🎉</div>
            <h2 style={{ fontSize:24, fontWeight:800, margin:'0 0 6px' }}>Checked In!</h2>
            {result.meeting?.title && <p style={{ fontSize:14, opacity:0.9, margin:'0 0 20px' }}>{result.meeting.title}</p>}
            <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:18, padding:'18px', margin:'0 0 24px' }}>
              <p style={{ fontSize:13, opacity:0.9, margin:0 }}>You earned</p>
              <p style={{ fontSize:40, fontWeight:800, margin:'4px 0 0' }}>+{result.pointsAwarded} <span style={{ fontSize:18 }}>pts</span></p>
            </div>
            <button onClick={()=>navigate('/kabataan/points')} style={{ width:'100%', padding:'14px', background:'#fff', color:T.green, border:'none', borderRadius:14, fontSize:15, fontWeight:800, cursor:'pointer', marginBottom:8 }}>View My Points</button>
            <button onClick={reset} style={{ width:'100%', padding:'12px', background:'rgba(255,255,255,0.15)', color:'#fff', border:'none', borderRadius:14, fontSize:14, fontWeight:700, cursor:'pointer' }}>Scan Another</button>
            <style>{`@keyframes pop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
          </div>
        )}

        {status==='already' && (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:24, padding:'40px 28px', textAlign:'center', boxShadow:T.shadow }}>
            <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
            <h2 style={{ fontSize:21, fontWeight:800, margin:'0 0 6px', color:T.text }}>Already Checked In</h2>
            <p style={{ fontSize:13.5, color:T.text2, margin:'0 0 24px', lineHeight:1.5 }}>You've already earned your points for this event. No double points!</p>
            <button onClick={()=>navigate('/kabataan/points')} style={{ width:'100%', padding:'14px', background:`linear-gradient(135deg,${T.accent},${T.violet})`, color:'#fff', border:'none', borderRadius:14, fontSize:15, fontWeight:700, cursor:'pointer', marginBottom:8 }}>View My Points</button>
            <button onClick={reset} style={{ width:'100%', padding:'12px', background:T.surface2, color:T.text2, border:'none', borderRadius:14, fontSize:14, fontWeight:700, cursor:'pointer' }}>Scan Another</button>
          </div>
        )}

        {status==='error' && (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:24, padding:'40px 28px', textAlign:'center', boxShadow:T.shadow }}>
            <div style={{ width:80, height:80, borderRadius:22, background:T.redSoft, display:'flex', alignItems:'center', justifyContent:'center', fontSize:38, margin:'0 auto 16px' }}>😕</div>
            <h2 style={{ fontSize:20, fontWeight:800, margin:'0 0 6px', color:T.text }}>Check-in Failed</h2>
            <p style={{ fontSize:13.5, color:T.text2, margin:'0 0 24px', lineHeight:1.5 }}>{errorMsg}</p>
            <button onClick={reset} style={{ width:'100%', padding:'14px', background:`linear-gradient(135deg,${T.accent},${T.violet})`, color:'#fff', border:'none', borderRadius:14, fontSize:15, fontWeight:700, cursor:'pointer' }}>Try Again</button>
          </div>
        )}

        {status==='idle' && (
          <div style={{ marginTop:16, background:T.accentSoft, borderRadius:16, padding:'16px 18px' }}>
            <p style={{ fontSize:13, fontWeight:800, color:T.accentText, margin:'0 0 10px' }}>How it works</p>
            {['Attend an SK event or meeting','Ask the SK official to show the QR code','Scan it here to instantly earn points','Redeem your points for rewards!'].map((s,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:i<3?8:0 }}>
                <span style={{ width:22, height:22, borderRadius:'50%', background:T.accent, color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</span>
                <span style={{ fontSize:12.5, color:T.text2 }}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}