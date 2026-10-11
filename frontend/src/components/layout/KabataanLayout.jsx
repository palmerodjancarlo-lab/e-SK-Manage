// src/components/layout/KabataanLayout.jsx — member portal
// Navigation for kabataan; the shell itself lives in AppShell. On phones the
// main destinations sit in a bottom tab bar and the rest in a "More" sheet.
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, Calendar, Award, Wallet, User, Landmark, Star, FolderKanban } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/auth-store';
import AppShell from './AppShell';
import NotificationBell from './NotificationBell';

const NAV = [
  { to: '/kabataan', label: 'Home', icon: Home, end: true },
  { to: '/kabataan/events', label: 'Events', icon: Calendar },
  { to: '/kabataan/programs', label: 'Programs', icon: FolderKanban, short: 'PPAs' },
  { to: '/kabataan/rewards', label: 'Points & Rewards', icon: Award, short: 'Points' },
  { to: '/kabataan/budget', label: 'Budget', icon: Wallet },
  { to: '/kabataan/sk', label: 'Our SK Council', icon: Landmark },
  { to: '/kabataan/profile', label: 'Profile', icon: User },
];

// Bottom bar on phones: four primary destinations + "More"
const TABS = NAV.slice(0, 4);

function PointsChip() {
  const { data } = useQuery({ queryKey: ['my-points'], queryFn: async () => (await api.get('/points/my')).data });
  const points = data?.balance ?? 0;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-sm font-bold text-accent" title="Your points">
      <Star aria-hidden="true" className="h-4 w-4" /> {points}
      <span className="sr-only">points</span>
    </span>
  );
}

export default function KabataanLayout() {
  const { user, logout } = useAuth();
  return (
    <AppShell
      nav={NAV}
      subtitle="Kabataan ng Tawiran"
      user={{ name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Kabataan', photo: user?.photo }}
      roleLabel="Kabataan member"
      onLogout={logout}
      accountTo="/kabataan/profile"
      skin="light"
      mobileTabs={TABS}
      topbar={<><PointsChip /><NotificationBell /></>}
    >
      <Outlet />
    </AppShell>
  );
}
