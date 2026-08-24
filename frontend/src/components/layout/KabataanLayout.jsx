// KabataanLayout.jsx — RESPONSIVE youth portal
// Mobile: bottom tab bar. Desktop: left sidebar + wide content.

import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../components/Icon'
import skLogo from '../../assets/sk-logo.png'
import toast from 'react-hot-toast'

const NAV = [
  { to:'/kabataan',               icon:'home',      label:'Home',        exact:true },
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

// Mobile bottom bar: 4 core items + a "More" button (opens full menu)
const MOBILE_NAV = [
  NAV[0], // Home
  NAV[2], // Programs
  NAV[4], // Scan
  NAV[6], // Points
]

export default function KabataanLayout() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const handleLogout = () => { logout(); toast.success('Logged out.'); navigate('/login') }

  return (
    <div className="kb-shell">
      {/* ── Desktop sidebar ── */}
      <aside className="kb-sidebar">
        <div style={{ padding:'20px 18px', borderBottom:'1px solid #EAEDF3', display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#4F46E5,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src={skLogo} alt="SK" style={{ width:24, objectFit:'contain', filter:'brightness(0) invert(1)' }} />
          </div>
          <div>
            <p style={{ fontSize:15, fontWeight:800, color:'#0F1F5C', lineHeight:1 }}>e-SK Manage</p>
            <p style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>Kabataan · Tawiran</p>
          </div>
        </div>

        <nav style={{ flex:1, overflowY:'auto', padding:12 }}>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact}
              style={({isActive}) => ({
                display:'flex', alignItems:'center', gap:12, padding:'11px 13px', borderRadius:11, marginBottom:3,
                textDecoration:'none', fontSize:14, fontWeight: isActive?700:600,
                background: isActive ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : 'transparent',
                color: isActive ? '#fff' : '#64748B',
              })}>
              {({isActive}) => (
                <>
                  <Icon name={item.icon} size={18} color={isActive ? '#fff' : '#94A3B8'} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:12, borderTop:'1px solid #EAEDF3' }}>
          <div style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px', borderRadius:11, background:'#F4F6FB', marginBottom:6 }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#0F1F5C', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.firstName} {user?.lastName}</p>
              <p style={{ fontSize:11, color:'#94A3B8', margin:0 }}>Kabataan Member</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'10px 12px', borderRadius:11, border:'none', background:'transparent', color:'#E11D48', fontSize:13.5, fontWeight:600, cursor:'pointer' }}>
            <Icon name="logout" size={17} color="#E11D48" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="kb-main">
        {/* Mobile top bar */}
        <header className="kb-topbar">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#4F46E5,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src={skLogo} alt="SK" style={{ width:20, objectFit:'contain', filter:'brightness(0) invert(1)' }} />
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:'#0F1F5C', lineHeight:1 }}>e-SK Manage</p>
              <p style={{ fontSize:10.5, color:'#94A3B8', marginTop:1 }}>Kabataan · Tawiran</p>
            </div>
          </div>
          <button onClick={() => navigate('/kabataan/settings')} style={{ width:36, height:36, background:'linear-gradient(135deg,#4F46E5,#7C3AED)', border:'none', borderRadius:'50%', cursor:'pointer', color:'white', fontSize:12, fontWeight:800 }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </button>
        </header>

        <main className="kb-content"><Outlet /></main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="kb-bottom-nav">
        {MOBILE_NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.exact}
            style={({isActive}) => ({
              flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
              textDecoration:'none', fontSize:10.5, fontWeight:600,
              color: isActive ? '#4F46E5' : '#94A3B8', position:'relative',
            })}>
            {({isActive}) => (
              <>
                {isActive && <span style={{ position:'absolute', top:0, width:28, height:3, borderRadius:'0 0 3px 3px', background:'#4F46E5' }} />}
                <Icon name={item.icon} size={20} color={isActive ? '#4F46E5' : '#94A3B8'} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        {/* More button */}
        <button onClick={()=>setMoreOpen(true)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'none', border:'none', cursor:'pointer', fontSize:10.5, fontWeight:600, color:'#94A3B8', fontFamily:'inherit' }}>
          <Icon name="menu" size={20} color="#94A3B8" />
          <span>More</span>
        </button>
      </nav>

      {/* ── Mobile "More" bottom sheet ── */}
      {moreOpen && (
        <div onClick={()=>setMoreOpen(false)} className="kb-more-overlay">
          <div onClick={e=>e.stopPropagation()} className="kb-more-sheet">
            <div style={{ width:40, height:4, borderRadius:999, background:'#EAEDF3', margin:'0 auto 16px' }} />
            <p style={{ fontSize:15, fontWeight:800, color:'#0F1F5C', margin:'0 0 14px' }}>Menu</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {NAV.map(item => (
                <NavLink key={item.to} to={item.to} end={item.exact} onClick={()=>setMoreOpen(false)}
                  style={({isActive}) => ({
                    display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 8px',
                    borderRadius:16, textDecoration:'none',
                    background: isActive ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : '#F4F6FB',
                    color: isActive ? '#fff' : '#64748B',
                  })}>
                  {({isActive}) => (
                    <>
                      <Icon name={item.icon} size={22} color={isActive ? '#fff' : '#4F46E5'} />
                      <span style={{ fontSize:11.5, fontWeight:700 }}>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
            <button onClick={()=>{ setMoreOpen(false); handleLogout() }} style={{ width:'100%', marginTop:14, padding:'13px', background:'#FFF1F3', color:'#E11D48', border:'none', borderRadius:14, fontSize:14, fontWeight:700, cursor:'pointer' }}>Log Out</button>
          </div>
        </div>
      )}

      <style>{`
        .kb-shell {
          display:flex; height:100vh; overflow:hidden; background:#F4F6FB;
          font-family:'Plus Jakarta Sans','Inter',system-ui,sans-serif;
        }
        .kb-sidebar {
          width:248px; flex-shrink:0; background:#fff; border-right:1px solid #EAEDF3;
          display:flex; flex-direction:column;
        }
        .kb-main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
        .kb-topbar { display:none; }
        .kb-content { flex:1; overflow-y:auto; }
        .kb-bottom-nav { display:none; }
        .kb-more-overlay { display:none; }

        /* Desktop: comfortable centered column, headers round nicely */
        @media (min-width:769px) {
          .kb-content { padding:32px 32px 40px; }
          .kb-content > * {
            max-width:960px; margin:0 auto;
            border-radius:24px; overflow:hidden;
            box-shadow:0 4px 28px rgba(15,31,92,0.07);
            border:1px solid #EAEDF3; background:#fff;
          }
        }

        /* Mobile: hide sidebar, show top bar + bottom nav */
        @media (max-width:768px) {
          .kb-sidebar { display:none; }
          .kb-topbar {
            display:flex; padding:0 16px; height:56px; align-items:center;
            justify-content:space-between; background:#fff; border-bottom:1px solid #EAEDF3; flex-shrink:0;
          }
          .kb-content { padding-bottom:78px; }
          .kb-bottom-nav {
            display:flex; position:fixed; bottom:0; left:0; right:0; height:66px;
            background:#fff; border-top:1px solid #EAEDF3; align-items:stretch;
            justify-content:space-around; padding-bottom:env(safe-area-inset-bottom);
            z-index:50; box-shadow:0 -2px 16px rgba(15,31,92,0.06);
          }
          .kb-more-overlay {
            display:block; position:fixed; inset:0; background:rgba(15,31,92,0.4);
            z-index:100; animation:fadeIn 0.2s;
          }
          .kb-more-sheet {
            position:fixed; bottom:0; left:0; right:0; background:#fff;
            border-radius:24px 24px 0 0; padding:20px 18px calc(20px + env(safe-area-inset-bottom));
            animation:slideUp 0.28s cubic-bezier(0.16,1,0.3,1);
          }
          @keyframes fadeIn { from{opacity:0} to{opacity:1} }
          @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        }
      `}</style>
    </div>
  )
}