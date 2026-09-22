// pages/Landing.jsx — public landing page for e-SK Manage
// Full marketing page: hero, features, how-it-works, transparency, footer
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import skLogo from '../assets/sk-logo.png'

const C = {
  night:'#1E1B4B',   // deep institutional indigo
  ink:'#0F1F5C',
  indigo:'#4F46E5',
  violet:'#7C3AED',
  gold:'#EAB308',
  goldDeep:'#CA8A04',
  paper:'#FFFFFF',
  mist:'#F4F6FB',
  line:'#E7E9F2',
  slate:'#5A6478',
  faint:'#93A0B4',
}

export default function Landing() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // where a logged-in user should "enter"
  const enter = () => {
    if (!user) return nav('/login')
    if (user.role === 'admin') return nav('/admin/dashboard')
    if (['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad'].includes(user.role)) return nav('/sk/dashboard')
    return nav('/kabataan')
  }

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans','Inter',system-ui,sans-serif", color:C.ink, background:C.paper, overflowX:'hidden' }}>

      {/* ══ Nav ══ */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:50,
        padding:'0 clamp(16px,5vw,48px)', height:68,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.line}` : '1px solid transparent',
        transition:'all 0.3s',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'#fff', border:`1px solid ${C.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src={skLogo} alt="SK" style={{ width:26, objectFit:'contain' }} />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color: scrolled ? C.ink : '#fff', lineHeight:1, transition:'color 0.3s' }}>e-SK Manage</div>
            <div style={{ fontSize:10.5, fontWeight:600, color: scrolled ? C.faint : 'rgba(255,255,255,0.7)', transition:'color 0.3s' }}>Barangay Tawiran</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>nav('/login')} style={{
            padding:'9px 18px', borderRadius:10, fontSize:13.5, fontWeight:700, cursor:'pointer',
            background:'transparent', border:'none',
            color: scrolled ? C.ink : '#fff', transition:'color 0.3s',
          }}>Sign in</button>
          <button onClick={()=>nav('/register')} style={{
            padding:'9px 18px', borderRadius:10, fontSize:13.5, fontWeight:700, cursor:'pointer',
            background:C.gold, border:'none', color:C.night,
            boxShadow:'0 4px 14px rgba(234,179,8,0.35)',
          }}>Join as Kabataan</button>
        </div>
      </nav>

      {/* ══ Hero ══ */}
      <header style={{
        position:'relative',
        background:`radial-gradient(120% 120% at 80% 0%, #2D2A6E 0%, ${C.night} 45%, #17153B 100%)`,
        color:'#fff', padding:'132px clamp(16px,5vw,48px) 100px',
        overflow:'hidden',
      }}>
        {/* decorative gold arc */}
        <div style={{ position:'absolute', top:-140, right:-120, width:420, height:420, borderRadius:'50%', border:`1px solid rgba(234,179,8,0.18)` }} />
        <div style={{ position:'absolute', top:-90, right:-70, width:320, height:320, borderRadius:'50%', border:`1px solid rgba(234,179,8,0.12)` }} />
        <div style={{ position:'absolute', bottom:-100, left:-80, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.25), transparent 70%)' }} />

        <div style={{ position:'relative', maxWidth:1000, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 16px', borderRadius:999, background:'rgba(234,179,8,0.12)', border:'1px solid rgba(234,179,8,0.3)', marginBottom:28 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:C.gold }} />
            <span style={{ fontSize:12.5, fontWeight:700, color:'#FDE68A' }}>Sangguniang Kabataan · Santa Cruz, Marinduque</span>
          </div>

          <h1 style={{ fontSize:'clamp(34px,6vw,62px)', fontWeight:800, lineHeight:1.06, letterSpacing:'-1.5px', margin:'0 0 22px' }}>
            Youth governance,<br/>
            <span style={{ color:C.gold }}>open for everyone to see.</span>
          </h1>

          <p style={{ fontSize:'clamp(15px,2.2vw,19px)', lineHeight:1.6, color:'rgba(255,255,255,0.78)', maxWidth:620, margin:'0 auto 38px' }}>
            e-SK Manage brings the projects, budgets, and programs of your Sangguniang Kabataan into one clear place — so every peso is tracked and every young person can take part.
          </p>

          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={()=>nav('/register')} style={{
              padding:'15px 30px', borderRadius:13, fontSize:15.5, fontWeight:700, cursor:'pointer',
              background:C.gold, color:C.night, border:'none',
              boxShadow:'0 10px 30px rgba(234,179,8,0.4)',
            }}>Join as Kabataan</button>
            <button onClick={enter} style={{
              padding:'15px 30px', borderRadius:13, fontSize:15.5, fontWeight:700, cursor:'pointer',
              background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid rgba(255,255,255,0.25)',
            }}>{user ? 'Enter your dashboard' : 'Sign in'}</button>
          </div>
        </div>

        {/* stat band */}
        <div style={{ position:'relative', maxWidth:820, margin:'70px auto 0', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'clamp(12px,3vw,40px)', borderTop:'1px solid rgba(255,255,255,0.12)', paddingTop:34 }}>
          {[
            { big:'100%', small:'of funds recorded and traceable' },
            { big:'1-tap', small:'QR check-in earns youth points' },
            { big:'Open', small:'budget anyone can review' },
          ].map((s,i)=>(
            <div key={i} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'clamp(24px,4vw,34px)', fontWeight:800, color:C.gold, letterSpacing:'-1px' }}>{s.big}</div>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.65)', marginTop:5, lineHeight:1.4 }}>{s.small}</div>
            </div>
          ))}
        </div>
      </header>

      {/* ══ Features ══ */}
      <section style={{ padding:'clamp(60px,9vw,100px) clamp(16px,5vw,48px)', background:C.paper }}>
        <div style={{ maxWidth:1080, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <h2 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:800, letterSpacing:'-0.8px', margin:'0 0 14px' }}>Everything the council does, in one place</h2>
            <p style={{ fontSize:16, color:C.slate, maxWidth:560, margin:'0 auto', lineHeight:1.6 }}>Built for the officials who run it and the youth it serves.</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
            {[
              { icon:'💰', tint:'#ECFDF5', c:'#059669', title:'Transparent finances', body:'Every fund received and every expense is recorded with a receipt. Nothing is deleted — only voided with a reason, so the money trail is always honest.' },
              { icon:'📋', tint:'#EEF0FF', c:C.indigo, title:'Programs & projects', body:'Track the council\u2019s programs down to each project and activity, with budgets that roll up automatically and progress photos as proof.' },
              { icon:'⭐', tint:'#FEF3C7', c:C.goldDeep, title:'Points for taking part', body:'Youth earn points by joining meetings and volunteering. The SK decides the rewards — turning participation into something real.' },
              { icon:'📷', tint:'#F5F3FF', c:C.violet, title:'QR check-in', body:'At every event, members scan a QR code to check in and instantly earn their points. No sign-up sheets, no manual counting.' },
              { icon:'📢', tint:'#F0F9FF', c:'#0284C7', title:'Announcements & events', body:'Meetings, opportunities, and news reach every registered youth the moment they\u2019re posted.' },
              { icon:'🏆', tint:'#FFF7ED', c:'#EA580C', title:'Rewards you can claim', body:'Redeem your points for rewards the council offers — a simple way to recognize the members who show up.' },
            ].map((f,i)=>(
              <div key={i} style={{ background:C.paper, border:`1px solid ${C.line}`, borderRadius:18, padding:26 }}>
                <div style={{ width:52, height:52, borderRadius:14, background:f.tint, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:18 }}>{f.icon}</div>
                <h3 style={{ fontSize:18, fontWeight:800, margin:'0 0 9px', color:f.c }}>{f.title}</h3>
                <p style={{ fontSize:14, color:C.slate, lineHeight:1.6, margin:0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ How it works ══ */}
      <section style={{ padding:'clamp(60px,9vw,100px) clamp(16px,5vw,48px)', background:C.mist }}>
        <div style={{ maxWidth:940, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <h2 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:800, letterSpacing:'-0.8px', margin:'0 0 14px' }}>How youth take part</h2>
            <p style={{ fontSize:16, color:C.slate, maxWidth:520, margin:'0 auto', lineHeight:1.6 }}>Three steps from signing up to being recognized.</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:20 }}>
            {[
              { n:1, title:'Register your account', body:'Any youth of Barangay Tawiran can sign up in minutes — no paperwork, just your details.' },
              { n:2, title:'Join events & scan in', body:'Attend meetings and activities, scan the QR code shown by an SK official, and earn points on the spot.' },
              { n:3, title:'Redeem your rewards', body:'Watch your points grow on the leaderboard and exchange them for the rewards your council posts.' },
            ].map((s)=>(
              <div key={s.n} style={{ position:'relative', background:C.paper, border:`1px solid ${C.line}`, borderRadius:18, padding:'30px 24px 24px' }}>
                <div style={{ position:'absolute', top:-18, left:24, width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${C.indigo},${C.violet})`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, boxShadow:'0 6px 16px rgba(79,70,229,0.35)' }}>{s.n}</div>
                <h3 style={{ fontSize:17, fontWeight:800, margin:'12px 0 9px' }}>{s.title}</h3>
                <p style={{ fontSize:14, color:C.slate, lineHeight:1.6, margin:0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Transparency band ══ */}
      <section style={{ padding:'clamp(60px,9vw,100px) clamp(16px,5vw,48px)', background:`linear-gradient(135deg,${C.night},#2D2A6E)`, color:'#fff', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'50%', right:-100, transform:'translateY(-50%)', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle, rgba(234,179,8,0.15), transparent 70%)' }} />
        <div style={{ position:'relative', maxWidth:820, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:44, marginBottom:20 }}>🔍</div>
          <h2 style={{ fontSize:'clamp(26px,4.5vw,42px)', fontWeight:800, letterSpacing:'-1px', lineHeight:1.15, margin:'0 0 20px' }}>
            Public money, kept in <span style={{ color:C.gold }}>full view</span>
          </h2>
          <p style={{ fontSize:'clamp(15px,2vw,18px)', color:'rgba(255,255,255,0.78)', lineHeight:1.65, maxWidth:600, margin:'0 auto 36px' }}>
            The budget page is open to every registered youth. See what the council received, where it was spent, and how much is left — down to each program and activity. Accountability isn\u2019t a promise here; it\u2019s the design.
          </p>
          <button onClick={()=>nav('/register')} style={{
            padding:'15px 32px', borderRadius:13, fontSize:15.5, fontWeight:700, cursor:'pointer',
            background:C.gold, color:C.night, border:'none', boxShadow:'0 10px 30px rgba(234,179,8,0.4)',
          }}>Get started — it\u2019s free</button>
        </div>
      </section>

      {/* ══ Footer ══ */}
      <footer style={{ background:'#12102E', color:'rgba(255,255,255,0.7)', padding:'clamp(40px,6vw,64px) clamp(16px,5vw,48px) 32px' }}>
        <div style={{ maxWidth:1080, margin:'0 auto' }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:30, justifyContent:'space-between', alignItems:'flex-start', paddingBottom:36, borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ maxWidth:320 }}>
              <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:14 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <img src={skLogo} alt="SK" style={{ width:26, objectFit:'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>e-SK Manage</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>Barangay Tawiran</div>
                </div>
              </div>
              <p style={{ fontSize:13, lineHeight:1.6, margin:0 }}>A project and financial management system for the Sangguniang Kabataan of Sta. Cruz, Marinduque.</p>
            </div>

            <div style={{ display:'flex', gap:'clamp(30px,8vw,72px)', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:12.5, fontWeight:700, color:'#fff', marginBottom:14 }}>Get started</div>
                {[['Join as Kabataan','/register'],['Sign in','/login']].map(([label,to])=>(
                  <button key={label} onClick={()=>nav(to)} style={{ display:'block', background:'none', border:'none', color:'rgba(255,255,255,0.7)', fontSize:13.5, cursor:'pointer', padding:'5px 0', textAlign:'left', fontFamily:'inherit' }}>{label}</button>
                ))}
              </div>
              <div>
                <div style={{ fontSize:12.5, fontWeight:700, color:'#fff', marginBottom:14 }}>For officials</div>
                <button onClick={()=>nav('/login')} style={{ display:'block', background:'none', border:'none', color:'rgba(255,255,255,0.7)', fontSize:13.5, cursor:'pointer', padding:'5px 0', textAlign:'left', fontFamily:'inherit' }}>Council sign in</button>
                <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.4)', padding:'5px 0' }}>Accounts issued by admin</div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10, paddingTop:24, fontSize:12.5, color:'rgba(255,255,255,0.5)' }}>
            <span>© {new Date().getFullYear()} Sangguniang Kabataan · Barangay Tawiran</span>
            <span>Made for the youth of Santa Cruz, Marinduque 🇵🇭</span>
          </div>
        </div>
      </footer>
    </div>
  )
}