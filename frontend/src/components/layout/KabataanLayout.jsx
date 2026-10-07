import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, Calendar, Award, Wallet, User, Landmark, Star, LogOut, Moon, Sun, FolderKanban, MoreHorizontal } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/auth-store';
import { useTheme } from '../../context/ThemeProvider';
import { cn } from '../../lib/utils';
import skLogo from '../../assets/sk-logo.svg';

const RAIL = [
  { to: '/kabataan', label: 'Home', icon: Home, end: true },
  { to: '/kabataan/events', label: 'Events', icon: Calendar },
  { to: '/kabataan/programs', label: 'Programs', icon: FolderKanban },
  { to: '/kabataan/rewards', label: 'Points & Rewards', icon: Award },
  { to: '/kabataan/budget', label: 'Budget', icon: Wallet },
  { to: '/kabataan/sk', label: 'Our SK', icon: Landmark },
  { to: '/kabataan/profile', label: 'Profile', icon: User },
];

// Mobile bottom bar: 4 primary + a "More" button
const TABS = [
  { to: '/kabataan', label: 'Home', icon: Home, end: true },
  { to: '/kabataan/events', label: 'Events', icon: Calendar },
  { to: '/kabataan/programs', label: 'PPAs', icon: FolderKanban },
  { to: '/kabataan/rewards', label: 'Points', icon: Award },
];
// The rest live in the "More" sheet
const MORE = [
  { to: '/kabataan/budget', label: 'Budget', icon: Wallet },
  { to: '/kabataan/sk', label: 'Our SK Council', icon: Landmark },
  { to: '/kabataan/profile', label: 'Profile', icon: User },
];

function Logo() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-card">
      <img src={skLogo} alt="SK" className="h-full w-full object-contain" />
    </div>
  );
}

function PointsChip() {
  const { data } = useQuery({ queryKey: ['my-points'], queryFn: async () => (await api.get('/points/my')).data });
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-sm font-extrabold text-accent">
      <Star className="h-4 w-4" /> {data?.balance ?? 0}
    </span>
  );
}

export default function KabataanLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const [moreOpen, setMoreOpen] = useState(false);
  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Kabataan';
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'K';

  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-1 border-r border-border bg-surface p-4 lg:flex">
        <div className="flex items-center gap-3 px-2 pb-4 pt-2">
          <Logo />
          <div>
            <p className="text-sm font-bold text-fg">e-SK Manage</p>
            <p className="text-[11px] text-subtle">Kabataan ng Tawiran</p>
          </div>
        </div>
        {RAIL.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition',
              isActive ? 'bg-primary/12 text-primary' : 'text-muted hover:bg-surface2 hover:text-fg')}>
            <n.icon className="h-5 w-5" /> {n.label}
          </NavLink>
        ))}
        <div className="flex-1" />
        <button onClick={toggleTheme} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-muted transition hover:bg-surface2 hover:text-fg">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />} {dark ? 'Light mode' : 'Dark mode'}
        </button>
        <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-danger transition hover:bg-danger/10">
          <LogOut className="h-5 w-5" /> Log out
        </button>
      </aside>

      <div className="min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Logo />
            <div>
              <p className="text-sm font-bold leading-tight text-fg">e-SK Manage</p>
              <p className="text-[11px] text-subtle">Kabataan ng Tawiran</p>
            </div>
            <div className="flex-1" />
            <PointsChip />
            <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted transition hover:text-fg" aria-label="Theme">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-primary-fg">
              {user?.photo ? <img src={user.photo} alt={name} className="h-full w-full object-cover" /> : initials}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* "More" bottom sheet (mobile) */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="space-y-1">
              {MORE.map((n) => (
                <NavLink key={n.to} to={n.to} onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition',
                    isActive ? 'bg-primary/12 text-primary' : 'text-muted hover:bg-surface2 hover:text-fg')}>
                  <n.icon className="h-5 w-5" /> {n.label}
                </NavLink>
              ))}
              <button onClick={() => { setMoreOpen(false); logout(); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-danger transition hover:bg-danger/10">
                <LogOut className="h-5 w-5" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className="flex flex-1 flex-col items-center py-2">
            {({ isActive }) => (
              <>
                <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition', isActive ? 'bg-primary/12 text-primary' : 'text-subtle')}>
                  <t.icon className="h-5 w-5" />
                </span>
                <span className={cn('mt-0.5 text-[11px] font-bold', isActive ? 'text-primary' : 'text-subtle')}>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen(true)} className="flex flex-1 flex-col items-center py-2">
          <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition', moreOpen ? 'bg-primary/12 text-primary' : 'text-subtle')}>
            <MoreHorizontal className="h-5 w-5" />
          </span>
          <span className={cn('mt-0.5 text-[11px] font-bold', moreOpen ? 'text-primary' : 'text-subtle')}>More</span>
        </button>
      </nav>
    </div>
  );
}