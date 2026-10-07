import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/auth-store';
import { HEAD_ROLES, OFFICER_ROLES, ROLES, homePath } from './lib/roles';
import FullScreenLoader from './components/layout/FullScreenLoader';
import PublicOnly from './components/routing/PublicOnly';
import ProtectedRoute from './components/routing/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';

// Head Console
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminMeetings from './pages/admin/Meetings';
import AdminPrograms from './pages/admin/Programs';
import AdminFinance from './pages/admin/Finance';
import AdminRewards from './pages/admin/Rewards';
import AdminUsers from './pages/admin/Users';
import CreateSK from './pages/admin/CreateSK';
import AdminAudit from './pages/admin/Audit';
import AdminSettings from './pages/admin/Settings';
import BudgetBreakdown from './pages/admin/BudgetBreakdown';

// SK Officers
import SKLayout from './components/layout/SKLayout';
import SKDashboard from './pages/sk/Dashboard';
import SKFinance from './pages/sk/Finance';
import SKMembers from './pages/sk/Members';
import SKPrograms from './pages/sk/Programs';
import SKRewards from './pages/sk/Rewards';
import SKAnnouncements from './pages/sk/Announcements';
import SKMeetings from './pages/sk/Meetings';
import AbyipReport from './pages/sk/AbyipReport';
import CbydpReport from './pages/sk/CbydpReport';
import AccomplishmentReport from './pages/sk/AccomplishmentReport';
import ReportsHub from './pages/sk/ReportsHub';
import SKSettings from './pages/sk/Settings';

// Kabataan
import KabataanLayout from './components/layout/KabataanLayout';
import KabHome from './pages/kabataan/Home';
import KabEvents from './pages/kabataan/Events';
import KabRewards from './pages/kabataan/Rewards';
import KabBudget from './pages/kabataan/Budget';
import KabSKBoard from './pages/kabataan/SKBoard';
import KabProfile from './pages/kabataan/Profile';
import KabPrograms from './pages/kabataan/Programs';

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePath(user.role) : '/login'} replace />;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <FullScreenLoader />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/verify" element={<PublicOnly><VerifyEmail /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />

      {/* Head Console (chairperson / legacy admin) */}
      <Route path="/admin" element={<ProtectedRoute allow={HEAD_ROLES}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="meetings" element={<AdminMeetings />} />
        <Route path="programs" element={<AdminPrograms />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="rewards" element={<AdminRewards />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="create-sk" element={<CreateSK />} />
        <Route path="logs" element={<AdminAudit />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="budget" element={<BudgetBreakdown />} />
        <Route path="reports" element={<ReportsHub />} />
        <Route path="reports/abyip" element={<AbyipReport />} />
        <Route path="reports/cbydp" element={<CbydpReport />} />
        <Route path="reports/accomplishment" element={<AccomplishmentReport />} />
      </Route>

      {/* SK Officers */}
      <Route path="/sk" element={<ProtectedRoute allow={OFFICER_ROLES}><SKLayout /></ProtectedRoute>}>
        <Route index element={<SKDashboard />} />
        <Route path="announcements" element={<SKAnnouncements />} />
        <Route path="meetings" element={<SKMeetings />} />
        <Route path="finance" element={<SKFinance />} />
        <Route path="programs" element={<SKPrograms />} />
        <Route path="rewards" element={<SKRewards />} />
        <Route path="members" element={<SKMembers />} />
        <Route path="reports" element={<ReportsHub />} />
        <Route path="reports/abyip" element={<AbyipReport />} />
        <Route path="reports/cbydp" element={<CbydpReport />} />
        <Route path="reports/accomplishment" element={<AccomplishmentReport />} />
        <Route path="settings" element={<SKSettings />} />
      </Route>

      {/* Kabataan */}
      <Route path="/kabataan" element={<ProtectedRoute allow={[ROLES.KABATAAN]}><KabataanLayout /></ProtectedRoute>}>
        <Route index element={<KabHome />} />
        <Route path="events" element={<KabEvents />} />
        <Route path="programs" element={<KabPrograms />} />
        <Route path="rewards" element={<KabRewards />} />
        <Route path="budget" element={<KabBudget />} />
        <Route path="sk" element={<KabSKBoard />} />
        <Route path="profile" element={<KabProfile />} />
        <Route path="leaderboard" element={<Navigate to="/kabataan/rewards" replace />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}