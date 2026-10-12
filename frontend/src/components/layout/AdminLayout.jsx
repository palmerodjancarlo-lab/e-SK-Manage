// src/components/layout/AdminLayout.jsx — e-SK Manage "Head Console" (SK Chairperson)
// Navigation for the Chairperson; the shell itself lives in AppShell.
// cspell:words Barangay Tawiran Marinduque kabataan kagawad
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Megaphone, CalendarDays, FolderKanban, Wallet, Gift,
  Users, UserPlus, ScrollText, Settings, FileText, PieChart, ClipboardCheck,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/auth-store';
import AppShell from './AppShell';

const ROLE_LABEL = { admin: 'Head / Chairperson', sk_chairperson: 'SK Chairperson' };

// Sections follow how the council works: plan & run programs → manage the money →
// serve the kabataan and officials → keep the system accountable.
const buildNav = ({ pendingVerification = 0, pendingExpenses = 0 } = {}) => [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'programs', label: 'Programs & Events', items: [
    { to: '/admin/programs', label: 'Programs & Projects', icon: FolderKanban },
    { to: '/admin/meetings', label: 'Meetings & Events', icon: CalendarDays },
    { to: '/admin/attendance', label: 'Attendance', icon: ClipboardCheck },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  ] },
  { id: 'finance', label: 'Finance', items: [
    { to: '/admin/finance', label: 'Budget & Finance', icon: Wallet, badge: pendingExpenses || undefined },
    { to: '/admin/budget', label: 'Budget Utilization', icon: PieChart },
    { to: '/admin/reports', label: 'Plans & Reports', icon: FileText },
  ] },
  { id: 'people', label: 'Kabataan & Officials', items: [
    { to: '/admin/users', label: 'Member Registry', icon: Users, badge: pendingVerification || undefined },
    { to: '/admin/create-sk', label: 'Add SK Officer', icon: UserPlus },
    { to: '/admin/rewards', label: 'Rewards & Points', icon: Gift },
  ] },
  { id: 'admin', label: 'Administration', items: [
    { to: '/admin/logs', label: 'Audit Logs', icon: ScrollText },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ] },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const doLogout = () => { logout?.(); navigate('/login'); };

  // Work waiting for the Chairperson, shown as badges in the menu
  const sys = useQuery({ queryKey: ['system-info'], queryFn: async () => (await api.get('/settings/system')).data, refetchInterval: 60000, retry: false });
  const fin = useQuery({ queryKey: ['fin-summary'], queryFn: async () => (await api.get('/finance/summary')).data, refetchInterval: 60000, retry: false });
  const nav = buildNav({
    pendingVerification: sys.data?.counts?.pendingVerification,
    pendingExpenses: fin.data?.pendingExpenses?.count,
  });

  return (
    <AppShell
      nav={nav}
      subtitle="Head Console"
      user={{ name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(), photo: user?.photo }}
      roleLabel={ROLE_LABEL[user?.role] || 'Administrator'}
      onLogout={doLogout}
      accountTo="/admin/settings"
    >
      <Outlet />
    </AppShell>
  );
}
