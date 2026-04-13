// Kabataan CheckIn — QR scan + manual token entry
// Uses html5-qrcode for camera scanning
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Icon } from '../../components/Icon'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function CheckIn() {
  const navigate                        = useNavigate()
  const [status,      setStatus]        = useState('idle')  // idle | scanning | loading | success | already | error
  const [result,      setResult]        = useState(null)
  const [errorMsg,    setErrorMsg]      = useState('')
  const scannerRef                      = useRef(null)
  const [manualToken, setManualToken]   = useState('')
  const scannerDivId                    = 'qr-reader-div'

  // NOTE: Auto check-in via URL is disabled — must scan physically
  // useEffect(() => { if (token) doCheckIn(token) }, [token])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  const doCheckIn = async (raw) => {
    await stopScanner()
    setStatus('loading')
    setErrorMsg('')

    // Extract token if a full URL was passed
    let tok = (raw || '').trim()
    if (tok.includes('/checkin/')) {
      tok = tok.split('/checkin/').pop().split('?')[0].trim()
    }

    try {
      const { data } = await axios.post(`${API}/meetings/checkin`, { qrToken: tok })
      setResult(data)
      setStatus('success')
      toast.success(`+${data.pointsAwarded} points earned!`)
    } catch (err) {
      const res = err.response?.data
      if (res?.alreadyCheckedIn) {
        setResult({ pointsAwarded: res.pointsAwarded })
        setStatus('already')
      } else {
        setErrorMsg(res?.message || 'Check-in failed. Invalid or expired QR code.')
        setStatus('error')
      }
    }
  }

  const startScanner = async () => {
    setStatus('scanning')
    setErrorMsg('')

    try {
      // Dynamic import so it doesn't break if lib is missing
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(scannerDivId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          // QR detected — stop and check in
          doCheckIn(decoded)
        },
        () => {} // ignore per-frame errors
      )
    } catch (err) {
      console.error('Scanner error:', err)
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permission and try again.'
        : 'Camera not available. Please enter the token manually below.'
      setErrorMsg(msg)
      setStatus('idle')
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch { /* ignore */ }
      scannerRef.current = null
    }
  }

  const reset = async () => {
    await stopScanner()
    setStatus('idle')
    setResult(null)
    setErrorMsg('')
    setManualToken('')
  }

  const isIdle     = status === 'idle'
  const isScanning = status === 'scanning'
  const isLoading  = status === 'loading'
  const isSuccess  = status === 'success'
  const isAlready  = status === 'already'
  const isError    = status === 'error'

  return (
    <div style={{ paddingBottom:80 }}>

      {/* Header */}
      <div style={{ background:'#0F1F5C', padding:'18px 20px 22px', position:'relative', overflow:'hidden' }}>
        <div aria-hidden style={{ position:'absolute', bottom:-40, right:-40, width:140, height:140, borderRadius:'50%', background:'rgba(245,196,0,0.08)', pointerEvents:'none' }} />
        <button onClick={()=>navigate('/kabataan')} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'5px 12px', color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:600, cursor:'pointer', marginBottom:12, fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:5 }}>
          <Icon name="chevronLeft" size={13} color="rgba(255,255,255,0.8)"/> Home
        </button>
        <h1 style={{ color:'white', fontSize:20, fontWeight:800, marginBottom:3 }}>QR Check-in</h1>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>Physically attend the event and scan the QR code shown by your SK Officer</p>
      </div>

      <div style={{ padding:'16px', maxWidth:480, margin:'0 auto' }}>

        {/* ── SUCCESS ── */}
        {isSuccess && result && (
          <div style={{ background:'linear-gradient(135deg,#065F46,#059669)', borderRadius:20, padding:'32px 24px', textAlign:'center', marginBottom:16, color:'white' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <Icon name="check" size={30} color="white"/>
            </div>
            <h2 style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>Check-in Successful!</h2>
            {result.meeting?.title && <p style={{ fontSize:14, opacity:0.8, marginBottom:16 }}>{result.meeting.title}</p>}
            <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:14, padding:'14px 24px', display:'inline-block', marginBottom:20 }}>
              <p style={{ fontSize:12, opacity:0.7, marginBottom:4 }}>Points Earned</p>
              <p style={{ fontSize:44, fontWeight:800, color:'#FFE140', lineHeight:1 }}>+{result.pointsAwarded}</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Link to="/kabataan/points" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', background:'rgba(255,255,255,0.2)', color:'white', borderRadius:12, fontWeight:700, fontSize:14, textDecoration:'none', border:'1px solid rgba(255,255,255,0.3)' }}>
                View My Points <Icon name="arrowRight" size={15} color="white"/>
              </Link>
              <button onClick={reset} style={{ padding:'11px', borderRadius:12, border:'1px solid rgba(255,255,255,0.25)', background:'transparent', color:'rgba(255,255,255,0.7)', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                Scan Another Event
              </button>
            </div>
          </div>
        )}

        {/* ── ALREADY CHECKED IN ── */}
        {isAlready && (
          <div style={{ background:'#EBF0FF', border:'2px solid #0F1F5C', borderRadius:20, padding:'28px 24px', textAlign:'center', marginBottom:16 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'#0F1F5C', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <Icon name="check" size={24} color="white"/>
            </div>
            <h2 style={{ fontSize:18, fontWeight:800, color:'#0F1F5C', marginBottom:6 }}>Already Checked In!</h2>
            <p style={{ fontSize:13, color:'#5A6A8A', marginBottom: result?.pointsAwarded ? 8 : 16 }}>You already attended this event.</p>
            {result?.pointsAwarded > 0 && <p style={{ fontSize:14, fontWeight:700, color:'#D97706', marginBottom:16 }}>You earned {result.pointsAwarded} pts from this event.</p>}
            <button onClick={reset} style={{ width:'100%', padding:'12px', borderRadius:12, background:'#0F1F5C', border:'none', color:'white', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
              Scan Another Event
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {isError && (
          <div style={{ background:'#FEE8EA', border:'1.5px solid rgba(192,17,31,0.2)', borderRadius:16, padding:'16px', marginBottom:16 }}>
            <p style={{ fontWeight:700, fontSize:14, color:'#C0111F', marginBottom:4 }}>Check-in Failed</p>
            <p style={{ fontSize:13, color:'#5A6A8A' }}>{errorMsg}</p>
          </div>
        )}

        {/* ── LOADING ── */}
        {isLoading && (
          <div style={{ background:'white', borderRadius:20, border:'1px solid #E4E9F2', padding:'48px 24px', textAlign:'center', marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', border:'3px solid #E4E9F2', borderTopColor:'#0F1F5C', animation:'spin 0.65s linear infinite', margin:'0 auto 16px' }} />
            <p style={{ fontWeight:700, color:'#0D1B3E', fontSize:15 }}>Verifying check-in...</p>
          </div>
        )}

        {/* ── SCANNER + MANUAL ENTRY ── */}
        {(isIdle || isScanning || isError) && (
          <>
            {/* Camera Section */}
            <div style={{ background:'white', borderRadius:20, border:'1px solid #E4E9F2', overflow:'hidden', marginBottom:14, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>

              {/* The html5-qrcode library renders INTO this div */}
              <div
                id={scannerDivId}
                style={{
                  width: '100%',
                  minHeight: isScanning ? 280 : 0,
                  overflow: 'hidden',
                  background: isScanning ? '#000' : 'transparent',
                }}
              />

              <div style={{ padding:'16px 18px' }}>
                {!isScanning ? (
                  <button onClick={startScanner} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, width:'100%', padding:'14px', background:'#0F1F5C', border:'none', borderRadius:13, color:'white', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 14px rgba(15,31,92,0.3)' }}>
                    <Icon name="camera" size={18} color="white"/> Open Camera to Scan
                  </button>
                ) : (
                  <>
                    <p style={{ textAlign:'center', fontSize:13, color:'#5A6A8A', marginBottom:12 }}>
                      Point your camera at the QR code shown by your SK Officer
                    </p>
                    <button onClick={()=>{ stopScanner(); setStatus('idle') }} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'12px', border:'1.5px solid #E4E9F2', background:'transparent', borderRadius:12, color:'#5A6A8A', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                      <Icon name="x" size={13}/> Stop Scanner
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Manual token entry — for those whose camera doesn't work */}
            <div style={{ background:'white', borderRadius:20, border:'1px solid #E4E9F2', padding:'18px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ flex:1, height:1, background:'#E4E9F2' }} />
                <span style={{ fontSize:11, color:'#9DAAC4', fontWeight:600, whiteSpace:'nowrap' }}>CAMERA NOT WORKING?</span>
                <div style={{ flex:1, height:1, background:'#E4E9F2' }} />
              </div>
              <p style={{ fontSize:12, color:'#5A6A8A', marginBottom:12, lineHeight:1.65 }}>
                Ask your <strong> SK Officer at the venue</strong> for the token. Type it below — do not ask anyone outside the event.
              </p>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#5A6A8A', marginBottom:7 }}>Enter Token</label>
              <input
                style={{ width:'100%', padding:'11px 13px', border:'1.5px solid #E0E8F5', borderRadius:10, fontSize:13, fontFamily:'monospace', color:'#0D1B3E', outline:'none', marginBottom:10, background:'#F6F8FC', boxSizing:'border-box' }}
                placeholder="Type the token given by your SK Officer..."
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && manualToken.trim() && doCheckIn(manualToken)}
                onFocus={e => e.target.style.borderColor='#0F1F5C'}
                onBlur={e  => e.target.style.borderColor='#E0E8F5'}
              />
              <button
                onClick={() => doCheckIn(manualToken)}
                disabled={!manualToken.trim()}
                style={{ width:'100%', padding:'12px', borderRadius:12, border:'1.5px solid #E0E8F5', background:manualToken.trim()?'#F4F7FF':'#F6F8FC', color:manualToken.trim()?'#0F1F5C':'#9DAAC4', fontWeight:600, fontSize:13, cursor:manualToken.trim()?'pointer':'not-allowed', fontFamily:'inherit', transition:'all 0.15s' }}>
                Check In with Token
              </button>
            </div>
          </>
        )}

        {/* Points guide */}
        {(isIdle || isError) && (
          <div style={{ background:'white', borderRadius:20, border:'1px solid #E4E9F2', padding:'16px 18px', marginTop:14 }}>
            <h3 style={{ fontWeight:700, fontSize:13, marginBottom:12, color:'#0D1B3E' }}>Points Per Activity Type</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Meeting',10],['Workshop',15],['Event',20],['Seminar',15],['Livelihood',20],['Sports',15]].map(([type,pts])=>(
                <div key={type} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:'#F6F8FC', borderRadius:9, border:'1px solid #E4E9F2' }}>
                  <span style={{ fontSize:12, color:'#5A6A8A' }}>{type}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#0F1F5C' }}>{pts} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Force html5-qrcode video to fill the container properly */
        #${scannerDivId} video { width: 100% !important; object-fit: cover; }
        #${scannerDivId} img  { display: none !important; }
      `}</style>
    </div>
  )
}