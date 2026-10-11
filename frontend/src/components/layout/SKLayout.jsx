// src/components/layout/SKLayout.jsx — e-SK Manage "SK Console"
// Role-based navigation for SK officers; the shell itself lives in AppShell.
// Each page is listed only for the roles the API lets use it (see backend/routes).
// cspell:words Barangay Tawiran Marinduque kabataan kagawad
import { Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Megaphone, CalendarDays, Wallet, FolderKanban, Gift, Users, FileText, Settings, ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../../context/auth-store';
import { roleLabel, ROLES, HEAD_ROLES } from '../../lib/roles';
import AppShell from './AppShell';

const CHAIR = HEAD_ROLES;
const ALL = [...CHAIR, ROLES.SECRETARY, ROLES.TREASURER, ROLES.KAGAWAD];

const SECTIONS = [
  { id: 'programs', label: 'Programs & Events', items: [
    { to: '/sk/programs', label: 'Programs & Projects', icon: FolderKanban, roles: [...CHAIR, ROLES.SECRETARY, ROLES.KAGAWAD] },
    { to: '/sk/meetings', label: 'Meetings & Events', icon: CalendarDays, roles: ALL },
    { to: '/sk/attendance', label: 'Attendance', icon: ClipboardCheck, roles: ALL },
    { to: '/sk/announcements', label: 'Announcements', icon: Megaphone, roles: [...CHAIR, ROLES.SECRETARY] },
  ] },
  { id: 'finance', label: 'Finance', items: [
    { to: '/sk/finance', label: 'Budget & Finance', icon: Wallet, roles: ALL }, // view-only for secretary & kagawad
    { to: '/sk/reports', label: 'Plans & Reports', icon: FileText, roles: [...CHAIR, ROLES.TREASURER] },
  ] },
  { id: 'people', label: 'Kabataan', items: [
    { to: '/sk/members', label: 'Member Registry', icon: Users, roles: [...CHAIR, ROLES.SECRETARY] },
    { to: '/sk/rewards', label: 'Rewards & Points', icon: Gift, roles: ALL },
  ] },
  { id: 'account', label: 'Account', items: [
    { to: '/sk/settings', label: 'Settings', icon: Settings, roles: ALL },
  ] },
];

function navFor(role) {
  const r = ALL.includes(role) ? role : ROLES.KAGAWAD;
  return [
    { to: '/sk', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ...SECTIONS
      .map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(r)) }))
      .filter((s) => s.items.length),
  ];
}

export default function SKLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const doLogout = () => { logout?.(); navigate('/login'); };

  return (
    <AppShell
      nav={navFor(user?.role)}
      subtitle="SK Console"
      user={{ name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(), photo: user?.photo }}
      roleLabel={roleLabel(user?.role)}
      onLogout={doLogout}
      accountTo="/sk/settings"
    >
      <Outlet />
    </AppShell>
  );
}
