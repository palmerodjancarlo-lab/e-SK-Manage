// layouts/AdminLayout.jsx — e-SK Manage Admin Portal
// Professional government dashboard with fixed sidebar

import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const C = {
  navy:'#0C2340', navyD:'#081A30', navyM:'#1A3A6B', navyL:'#E8EEF8',
  gold:'#B8860B', goldBright:'#D4A72C',
  border:'#1E3A5F', white:'#FFFFFF', text:'#0F172A',
  muted:'#64748B', sidebarText:'#94A3B8', sidebarActive:'#FFFFFF',
  bg:'#F1F5F9',
}

// Navigation structure
const NAV = [
  {
    section: 'Overview',
    items: [
      { to:'/admin/dashboard', label:'Dashboard',  icon:'▨' },
    ]
  },
  {
    section: 'User Management',
    items: [
      { to:'/admin/users',      label:'All Users',        icon:'◈' },
      { to:'/admin/create-sk',  label:'Create SK Account', icon:'✛' },
    ]
  },
  {
    section: 'Operations',
    items: [
      { to:'/admin/programs',   label:'Programs & Projects', icon:'◱' },
      { to:'/admin/finance',    label:'Financial Records',   icon:'₱' },
    ]
  },
  {
    section: 'System',
    items: [
      { to:'/admin/logs',       label:'Audit Trail',  icon:'≡' },
      { to:'/admin/settings',   label:'Settings',     icon:'⚙' },
    ]
  },
]

function Sidebar({ onNavigate }) {
  const nav = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    nav('/login')
  }

  return (
    <div style={{
      width:250, background:C.navy, height:'100vh',
      display:'flex', flexDirection:'column', position:'fixed', left:0, top:0,
      borderRight:`1px solid ${C.border}`,
    }}>

      {/* Brand */}
      <div style={{ padding:'20px 22px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:38, height:38, borderRadius:8,
            background:`linear-gradient(135deg, ${C.gold}, ${C.goldBright})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, fontWeight:800, color:C.navy,
          }}>e</div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:C.white, letterSpacing:'-0.3px' }}>e-SK Manage</div>
            <div style={{ fontSize:9, color:C.gold, fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' }}>Admin Console</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 12px' }}>
        {NAV.map(group => (
          <div key={group.section} style={{ marginBottom:20 }}>
            <div style={{ fontSize:9, fontWeight:700, color:C.sidebarText, textTransform:'uppercase', letterSpacing:'1.2px', padding:'0 10px', marginBottom:8, opacity:0.6 }}>
              {group.section}
            </div>
            {group.items.map(item => (
              <NavLink key={item.to} to={item.to} onClick={onNavigate}
                style={({ isActive }) => ({
                  display:'flex', alignItems:'center', gap:12,
                  padding:'9px 12px', borderRadius:7, marginBottom:2,
                  textDecoration:'none', fontSize:13, fontWeight:600,
                  color: isActive ? C.sidebarActive : C.sidebarText,
                  background: isActive ? C.navyM : 'transparent',
                  borderLeft: isActive ? `3px solid ${C.gold}` : '3px solid transparent',
                  transition:'all 0.12s',
                })}>
                <span style={{ fontSize:15, width:18, textAlign:'center' }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* User + Logout */}
      <div style={{ padding:'14px 16px', borderTop:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{
            width:34, height:34, borderRadius:'50%', background:C.navyM,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:700, color:C.white,
          }}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.white, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ fontSize:10, color:C.gold }}>Administrator</div>
          </div>
        </div>
        <button onClick={logout} style={{
          width:'100%', padding:'8px', background:'transparent',
          border:`1px solid ${C.border}`, borderRadius:6,
          color:C.sidebarText, fontSize:12, fontWeight:600, cursor:'pointer',
          transition:'all 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background=C.navyM; e.currentTarget.style.color=C.white }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=C.sidebarText }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div style={{ background:C.bg, minHeight:'100vh', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* Desktop sidebar */}
      <div style={{ display:'none' }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:40 }} />
          <div style={{ position:'fixed', left:0, top:0, zIndex:50 }}>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="admin-main" style={{ marginLeft:0, minHeight:'100vh' }}>
        {/* Mobile top bar */}
        <div className="mobile-topbar" style={{
          display:'none', alignItems:'center', gap:12, padding:'12px 16px',
          background:C.navy, position:'sticky', top:0, zIndex:30,
        }}>
          <button onClick={() => setMobileOpen(true)} style={{ background:'none', border:'none', color:C.white, fontSize:22, cursor:'pointer' }}>☰</button>
          <span style={{ fontSize:15, fontWeight:800, color:C.white }}>e-SK Manage</span>
        </div>

        <div style={{ padding:'28px 32px', maxWidth:1400, margin:'0 auto' }}>
          <Outlet />
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .desktop-sidebar { display: block !important; }
          .admin-main { margin-left: 250px !important; }
          .mobile-topbar { display: none !important; }
        }
        @media (max-width: 1023px) {
          .mobile-topbar { display: flex !important; }
        }
      `}</style>
    </div>
  )
}