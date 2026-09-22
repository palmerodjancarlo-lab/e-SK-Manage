// layouts/KabataanLayout.jsx — Kabataan portal (youth-friendly, themed, responsive)
// Desktop: left sidebar. Mobile: bottom tab bar (4 core) + "More" sheet.
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import skLogo from '../../assets/sk-logo.svg'
import toast from 'react-hot-toast'

const NAV = [
  { to:'/kabataan',               icon:'home',      label:'Home', exact:true },
  { to:'/kabataan/announcements', icon:'megaphone', label:'News' },
  { to:'/kabataan/programs',      icon:'trophy',    label:'Programs' },
  { to:'/kabataan/meetings',      icon:'calendar',  label:'Events' },
  { to:'/kabataan/checkin',       icon:'qrCode',    label:'Scan' },
  { to:'/kabataan/rewards',       icon:'gift',      label:'Rewards' },
  { to:'/kabataan/points',        icon:'star',      label:'Points' },
  { to:'/kabataan/officials',     icon:'building',  label:'Officials' },
  { to:'/kabataan/transparency',  icon:'banknotes', label:'Budget' },
  { to:'/kabataan/settings',      icon:'cog',       label:'Settings' },
]
const MOBILE_NAV = [ NAV[0], NAV[2], NAV[4], NAV[6] ] // Home, Programs, Scan, Points

export default function KabataanLayout() {
  const { user, logout } = useAuth()
  const { T, mode, toggle } = useTheme()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const handleLogout = () => { logout(); toast.success('Logged out.'); navigate('/login') }
  const initials = `${user?.firstName?.[0]||''}${user?.lastName?.[0]||''}`

  return (
    <div style={{ background:T.appBg, minHeight:'100vh', fontFamily:"'Plus Jakarta Sans','Inter',system-ui,sans-serif", color:T.text }}>

      {/* ── Desktop sidebar ── */}
      <aside className="kb-sidebar" style={{ display:'none', width:248, background:T.surface, borderRight:`1px solid ${T.border}`, position:'fixed', left:0, top:0, height:'100vh', flexDirection:'column' }}>
        <div style={{ padding:'20px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:'#fff', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            <img src={skLogo} alt="SK" style={{ width:30, height:30, objectFit:'contain' }} />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:T.text, letterSpacing:'-0.3px' }}>e-SK Manage</div>
            <div style={{ fontSize:10, color:T.accentText, fontWeight:700, letterSpacing:'0.5px' }}>Kabataan · Tawiran</div>
          </div>
        </div>

        <nav style={{ flex:1, overflowY:'auto', padding:'12px 12px' }}>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:12, padding:'11px 13px', borderRadius:10, marginBottom:3,
                textDecoration:'none', fontSize:13.5, fontWeight:600,
                color: isActive ? '#fff' : T.text2,
                background: isActive ? T.accent : 'transparent',
              })}>
              <Icon name={item.icon} size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:'12px 14px', borderTop:`1px solid ${T.border}` }}>
          <div onClick={()=>navigate('/kabataan/settings')} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, cursor:'pointer' }}>
            <Avatar photo={user?.photo} initials={initials} accent={T.accent} violet={T.violet} size={36} />
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.firstName} {user?.lastName}</div>
              <div style={{ fontSize:10.5, color:T.text3 }}>{user?.points||0} points</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width:'100%', padding:'9px', background:'transparent', border:`1px solid ${T.border}`, borderRadius:8, color:T.text2, fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <Icon name="logout" size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="kb-topbar" style={{ display:'none', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:T.surface, borderBottom:`1px solid ${T.border}`, position:'sticky', top:0, zIndex:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'#fff', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            <img src={skLogo} alt="SK" style={{ width:24, height:24, objectFit:'contain' }} />
          </div>
          <span style={{ fontSize:14.5, fontWeight:800, color:T.text }}>e-SK Manage</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={toggle} style={{ width:34, height:34, border:`1px solid ${T.border}`, borderRadius:8, background:T.surface2, color:T.text2, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name={mode==='dark'?'sun':'moon'} size={15} />
          </button>
          <button onClick={()=>navigate('/kabataan/settings')} style={{ padding:0, border:'none', background:'none', cursor:'pointer' }}><Avatar photo={user?.photo} initials={initials} accent={T.accent} violet={T.violet} size={34} /></button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="kb-main">
        <div className="kb-content"><Outlet /></div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="kb-bottom-nav" style={{ display:'none' }}>
        {MOBILE_NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.exact}
            style={({ isActive }) => ({
              flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
              textDecoration:'none', fontSize:10.5, fontWeight:600,
              color: isActive ? T.accent : T.text3,
            })}>
            {({ isActive }) => (<><Icon name={item.icon} size={20} color={isActive?T.accent:T.text3} /><span>{item.label}</span></>)}
          </NavLink>
        ))}
        <button onClick={()=>setMoreOpen(true)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'none', border:'none', cursor:'pointer', fontSize:10.5, fontWeight:600, color:T.text3, fontFamily:'inherit' }}>
          <Icon name="menu" size={20} color={T.text3} /><span>More</span>
        </button>
      </nav>

      {/* ── Mobile "More" sheet ── */}
      {moreOpen && (
        <div onClick={()=>setMoreOpen(false)} style={{ position:'fixed', inset:0, background:T.overlay, zIndex:100 }}>
          <div onClick={e=>e.stopPropagation()} style={{ position:'fixed', bottom:0, left:0, right:0, background:T.surface, borderRadius:'22px 22px 0 0', padding:'18px 16px calc(20px + env(safe-area-inset-bottom))', animation:'kbUp 0.28s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ width:40, height:4, borderRadius:999, background:T.border, margin:'0 auto 16px' }} />
            <p style={{ fontSize:15, fontWeight:800, color:T.text, margin:'0 0 14px' }}>Menu</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {NAV.map(item => (
                <NavLink key={item.to} to={item.to} end={item.exact} onClick={()=>setMoreOpen(false)}
                  style={({ isActive }) => ({
                    display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'15px 8px',
                    borderRadius:14, textDecoration:'none',
                    background: isActive ? T.accent : T.surface2,
                    color: isActive ? '#fff' : T.text2,
                  })}>
                  {({ isActive }) => (<><Icon name={item.icon} size={21} color={isActive?'#fff':T.accent} /><span style={{ fontSize:11, fontWeight:700 }}>{item.label}</span></>)}
                </NavLink>
              ))}
            </div>
            <button onClick={()=>{ setMoreOpen(false); handleLogout() }} style={{ width:'100%', marginTop:14, padding:'13px', background:T.redSoft, color:T.red, border:'none', borderRadius:14, fontSize:14, fontWeight:700, cursor:'pointer' }}>Sign Out</button>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        html, body { max-width:100%; overflow-x:hidden; }
        .kb-main { min-height:100vh; }
        .kb-content { max-width:1000px; margin:0 auto; }
        @keyframes kbUp { from{transform:translateY(100%)} to{transform:translateY(0)} }

        /* Desktop */
        @media (min-width:769px) {
          .kb-sidebar { display:flex !important; }
          .kb-main { margin-left:248px; }
          .kb-content { padding:28px; }
        }
        /* Mobile / tablet portrait */
        @media (max-width:768px) {
          .kb-topbar { display:flex !important; }
          .kb-bottom-nav {
            display:flex !important; position:fixed; bottom:0; left:0; right:0; height:64px;
            background:${T.surface}; border-top:1px solid ${T.border};
            padding-bottom:env(safe-area-inset-bottom); z-index:50;
          }
          .kb-content { padding:0 0 80px; }
        }
        @media (max-width:768px) and (min-width:521px) {
          .kb-content { padding:0 0 80px; }
        }
      `}</style>
    </div>
  )
}

// Avatar — declared outside render so it isn't recreated each render
function Avatar({ photo, initials, accent, violet, size }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background: photo ? `url(${photo}) center/cover` : `linear-gradient(135deg,${accent},${violet})`,
      display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:size*0.38, fontWeight:800,
    }}>{!photo && initials}</div>
  )
}