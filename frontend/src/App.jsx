
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Login    from './pages/auth/Login'
import Register from './pages/auth/Register'
import Layout   from './components/layout/Layout'

import Dashboard    from './pages/Dashboard'
import Announcements from './pages/Announcements'
import Members      from './pages/Members'
import Meetings     from './pages/Meetings'
import Programs     from './pages/Programs'
import Points       from './pages/Points'
import Rewards      from './pages/Rewards'
import Transparency from './pages/Transparency'
import Officials    from './pages/Officials'
import AdminPanel   from './pages/AdminPanel'

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div className="spinner spinner-blue" style={{ width: 40, height: 40 }} />
      <p style={{ color: 'var(--sk-blue)', fontWeight: 700 }}>Loading e-SK Manage...</p>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/"         element={<Navigate to="/login" replace />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="dashboard"     element={<Dashboard />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="members"       element={<Members />} />
          <Route path="meetings"      element={<Meetings />} />
          <Route path="programs"      element={<Programs />} />
          <Route path="points"        element={<Points />} />
          <Route path="rewards"       element={<Rewards />} />
          <Route path="transparency"  element={<Transparency />} />
          <Route path="officials"     element={<Officials />} />
          <Route path="admin"         element={
            <ProtectedRoute roles={['admin']}>
              <AdminPanel />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </Router>
  )
}