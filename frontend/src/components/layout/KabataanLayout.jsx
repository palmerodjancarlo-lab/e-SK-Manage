import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Icon } from '../../components/Icon'
import skLogo from '../../assets/sk-logo.svg'
import toast from 'react-hot-toast'

const BOTTOM_NAV = [
  { to:'/kabataan',               icon:'home',      label:'Home',    exact:true },
  { to:'/kabataan/announcements', icon:'megaphone', label:'News' },
  { to:'/kabataan/checkin',       icon:'qrCode',    label:'Scan' },
  { to:'/kabataan/points',        icon:'star',      label:'Points' },
  { to:'/kabataan/settings',      icon:'cog',       label:'Settings' },
]

export default function KabataanLayout() {
  const { user, logout }          = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const navigate                  = useNavigate()

  const handleLogout = () => { logout(); toast.success('Logged out.'); navigate('/login') }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg)', overflow:'hidden' }}>
      <header style={{ padding:'0 16px', height:50, display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-card)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <img src={skLogo} alt="SK" style={{ width:26, objectFit:'contain' }} />
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#0F1F5C', lineHeight:1 }}>e-SK Manage</p>
            <p style={{ fontSize:10, color:'var(--text-faint)' }}>Kabataan Portal</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={toggleTheme} style={{ width:30, height:30, border:'1px solid var(--border)', borderRadius:7, background:'transparent', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name={darkMode?'sun':'moon'} size={13} />
          </button>
          <button onClick={handleLogout} style={{ width:30, height:30, background:'#0F1F5C', border:'none', borderRadius:7, cursor:'pointer', color:'white', fontSize:11, fontWeight:700 }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </button>
        </div>
      </header>
      <main style={{ flex:1, overflowY:'auto', paddingBottom:68 }}><Outlet /></main>
      <nav className="k-bottom-nav">
        {BOTTOM_NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.exact} className={({isActive})=>`k-nav-item ${isActive?'active':''}`}>
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}