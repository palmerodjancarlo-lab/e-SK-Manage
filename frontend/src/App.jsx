// App.jsx — e-SK Manage router
// New roles: admin, sk_chairperson, sk_secretary, sk_treasurer, sk_kagawad, kabataan
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Auth pages
import Login    from './pages/auth/Login'
import Register from './pages/auth/Register'

// Admin Portal
import AdminLayout      from './components/layout/AdminLayout'
import AdminDashboard   from './pages/admin/Dashboard'
import AdminUsers       from './pages/admin/Users'
import CreateSKAccount  from './pages/admin/CreateSKAccount'
import AdminFinance     from './pages/admin/Finance'
import AdminAuditLogs   from './pages/admin/AuditLogs'
import AdminSettings    from './pages/admin/Settings'
// Admin reuses SK content pages
import AdminAnnouncements from './pages/sk/Announcements'
import AdminMeetings      from './pages/sk/Meetings'
import AdminPrograms      from './pages/sk/Programs'

// SK Portal (all SK officials share, filtered by role inside)
import SKLayout        from './components/layout/SKLayout'
import SKDashboard     from './pages/sk/Dashboard'
import SKAnnouncements from './pages/sk/Announcements'
import SKMembers       from './pages/sk/Members'
import SKMeetings      from './pages/sk/Meetings'
import SKPrograms      from './pages/sk/Programs'
import SKFinance       from './pages/sk/Finance'
import SKRewards       from './pages/sk/Rewards'
import SKOfficials     from './pages/sk/Officials'
import SKSettings      from './pages/sk/Settings'

// Kabataan Portal
import KabataanLayout        from './components/layout/KabataanLayout'
import KabataanHome          from './pages/kabataan/Home'
import KabataanAnnouncements from './pages/kabataan/Announcements'
import KabataanPrograms      from './pages/kabataan/Programs'
import KabataanTransparency  from './pages/kabataan/Transparency'
import KabataanOfficials     from './pages/kabataan/Officials'
import KabataanPoints        from './pages/kabataan/Points'
import KabataanRewards       from './pages/kabataan/Rewards'
import KabataanMeetings      from './pages/kabataan/Meetings'
import KabataanSettings      from './pages/kabataan/Settings'
import CheckIn               from './pages/kabataan/CheckIn'

// SK role group
const SK_ROLES = ['sk_chairperson','sk_secretary','sk_treasurer','sk_kagawad']

const LoadingScreen = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16, background:'var(--bg)' }}>
    <div className="spinner" style={{ width:36, height:36 }} />
    <p style={{ color:'var(--blue-800)', fontWeight:600, fontSize:14 }}>Loading e-SK Manage...</p>
  </div>
)

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />
  return children
}

const RootRedirect = () => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)                            return <Navigate to="/login" replace />
  if (user.role === 'admin')            return <Navigate to="/admin/dashboard" replace />
  if (SK_ROLES.includes(user.role))     return <Navigate to="/sk/dashboard" replace />
  return <Navigate to="/kabataan" replace />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"         element={<RootRedirect />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── ADMIN PORTAL ── */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index                element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"     element={<AdminDashboard />} />
          <Route path="users"         element={<AdminUsers />} />
          <Route path="create-sk"     element={<CreateSKAccount />} />
          <Route path="finance"       element={<AdminFinance />} />
          <Route path="logs"          element={<AdminAuditLogs />} />
          <Route path="settings"      element={<AdminSettings />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="meetings"      element={<AdminMeetings />} />
          <Route path="programs"      element={<AdminPrograms />} />
        </Route>

        {/* ── SK PORTAL (all SK officials) ── */}
        <Route path="/sk" element={<ProtectedRoute roles={SK_ROLES}><SKLayout /></ProtectedRoute>}>
          <Route index                element={<Navigate to="/sk/dashboard" replace />} />
          <Route path="dashboard"     element={<SKDashboard />} />
          <Route path="announcements" element={<SKAnnouncements />} />
          <Route path="members"       element={<SKMembers />} />
          <Route path="meetings"      element={<SKMeetings />} />
          <Route path="programs"      element={<SKPrograms />} />
          <Route path="finance"       element={<SKFinance />} />
          <Route path="rewards"       element={<SKRewards />} />
          <Route path="officials"     element={<SKOfficials />} />
          <Route path="settings"      element={<SKSettings />} />
        </Route>

        {/* ── KABATAAN PORTAL ── */}
        <Route path="/kabataan" element={<ProtectedRoute roles={['kabataan']}><KabataanLayout /></ProtectedRoute>}>
          <Route index                element={<KabataanHome />} />
          <Route path="announcements" element={<KabataanAnnouncements />} />
          <Route path="programs"      element={<KabataanPrograms />} />
          <Route path="transparency"  element={<KabataanTransparency />} />
          <Route path="officials"     element={<KabataanOfficials />} />
          <Route path="points"        element={<KabataanPoints />} />
          <Route path="rewards"       element={<KabataanRewards />} />
          <Route path="meetings"      element={<KabataanMeetings />} />
          <Route path="settings"      element={<KabataanSettings />} />
          <Route path="checkin"       element={<CheckIn />} />
          <Route path="checkin/:token" element={<CheckIn />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}