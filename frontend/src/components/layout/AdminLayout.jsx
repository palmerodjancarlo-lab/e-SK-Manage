// layouts/AdminLayout.jsx — e-SK Manage Admin Console
// Institutional design, full responsive, real dark mode via ThemeContext.
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/theme-utils'
import { Icon } from '../../components/Icon'
import skLogo from '../../assets/sk-logo.svg'

const NAV = [
  { section:'Overview', items:[
    { to:'/admin/dashboard', label:'Dashboard', icon:'home' },
  ]},
  { section:'User Management', items:[
    { to:'/admin/users',     label:'All Users',         icon:'users' },
    { to:'/admin/create-sk', label:'Create SK Account', icon:'identification' },
  ]},
  { section:'Oversight', items:[
    { to:'/admin/programs', label:'Programs & Projects', icon:'clipboardList' },
    { to:'/admin/finance',  label:'Financial Records',   icon:'banknotes' },
  ]},
  { section:'System', items:[
    { to:'/admin/logs',     label:'Audit Trail', icon:'listBullet' },
    { to:'/admin/settings', label:'Settings',    icon:'cog' },
  ]},
]

function Sidebar({ T, onNavigate, onLogout, user }) {
  return (
    <div style={{ width:256, background:T.sidebar, height:'100vh', display:'flex', flexDirection:'column', position:'fixed', left:0, top:0 }}>
      {/* Brand */}
      <div style={{ padding:'20px 20px', borderBottom:`1px solid rgba(255,255,255,0.07)` }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            <img src={skLogo} alt="SK" style={{ width:30, height:30, objectFit:'contain' }} />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.3px' }}>e-SK Manage</div>
            <div style={{ fontSize:9, color:T.gold, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase' }}>Admin Console</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 12px' }}>
        {NAV.map(group => (
          <div key={group.section} style={{ marginBottom:18 }}>
            <div style={{ fontSize:9.5, fontWeight:700, color:T.sidebarText, textTransform:'uppercase', letterSpacing:'1.2px', padding:'0 10px', marginBottom:8, opacity:0.55 }}>{group.section}</div>
            {group.items.map(item => (
              <NavLink key={item.to} to={item.to} onClick={onNavigate}
                style={({ isActive }) => ({
                  display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:8, marginBottom:2,
                  textDecoration:'none', fontSize:13.5, fontWeight:600,
                  color: isActive ? '#fff' : T.sidebarText,
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${T.gold}` : '3px solid transparent',
                  transition:'all 0.12s',
                })}>
                <Icon name={item.icon} size={17} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* User + logout */}
      <div style={{ padding:'14px 14px', borderTop:`1px solid rgba(255,255,255,0.07)` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{
            width:36, height:36, borderRadius:'50%', flexShrink:0,
            background: user?.photo ? `url(${user.photo}) center/cover` : 'rgba(255,255,255,0.1)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff',
          }}>
            {!user?.photo && <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:12.5, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize:10, color:T.gold, fontWeight:600 }}>Administrator</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width:'100%', padding:'9px', background:'transparent', border:`1px solid rgba(255,255,255,0.12)`, borderRadius:7, color:T.sidebarText, fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
          <Icon name="logout" size={14} /> Sign Out
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const { T, mode, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ background:T.appBg, minHeight:'100vh', fontFamily:"'Plus Jakarta Sans','Inter','Segoe UI',system-ui,sans-serif", color:T.text }}>

      {/* Desktop sidebar */}
      <div className="adm-desktop-sidebar" style={{ display:'none' }}>
        <Sidebar T={T} user={user} onLogout={handleLogout} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={()=>setMobileOpen(false)} style={{ position:'fixed', inset:0, background:T.overlay, zIndex:60 }} />
          <div style={{ position:'fixed', left:0, top:0, zIndex:70 }}>
            <Sidebar T={T} user={user} onLogout={handleLogout} onNavigate={()=>setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main */}
      <div className="adm-main">
        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'12px 16px', background:T.surface, borderBottom:`1px solid ${T.border}`, position:'sticky', top:0, zIndex:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button className="adm-burger" onClick={()=>setMobileOpen(true)} style={{ display:'none', background:'none', border:'none', color:T.text, cursor:'pointer', padding:4 }}>
              <Icon name="menu" size={22} />
            </button>
            <span className="adm-topbar-brand" style={{ fontSize:15, fontWeight:800, color:T.text, display:'none' }}>e-SK Manage</span>
          </div>
          <button onClick={toggle} title="Toggle theme" style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:8, width:38, height:38, cursor:'pointer', color:T.text2, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name={mode==='dark' ? 'sun' : 'moon'} size={17} />
          </button>
        </div>

        <div className="adm-content" style={{ padding:'24px', maxWidth:1400, margin:'0 auto' }}>
          <Outlet />
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body { max-width: 100%; overflow-x: hidden; }
        .adm-main { margin-left: 0; min-height: 100vh; min-width: 0; }
        /* Desktop: fixed sidebar */
        @media (min-width: 1024px) {
          .adm-desktop-sidebar { display: block !important; }
          .adm-main { margin-left: 256px; }
          .adm-burger { display: none !important; }
          .adm-topbar-brand { display: none !important; }
        }
        /* Tablet + phone: drawer sidebar, burger shown */
        @media (max-width: 1023px) {
          .adm-burger { display: flex !important; }
          .adm-topbar-brand { display: inline !important; }
          .adm-content { padding: 20px !important; }
        }
        /* Small tablets / large phones landscape */
        @media (max-width: 768px) {
          .adm-content { padding: 18px !important; }
        }
        /* Phones */
        @media (max-width: 560px) {
          .adm-content { padding: 14px !important; }
        }
        /* Very small / phone portrait */
        @media (max-width: 380px) {
          .adm-content { padding: 12px !important; }
        }
      `}</style>
    </div>
  )
}