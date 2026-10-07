// src/components/layout/SKLayout.jsx — e-SK Manage "SK Console"
// Self-contained sidebar (matches Head Console): role-based nav, SK logo,
// theme toggle, mobile drawer. Tailwind semantic tokens, real dark mode.
// cspell:words Barangay Tawiran Marinduque kabataan kagawad
import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Bell, Calendar, Wallet, FolderKanban, Award, Users, FileText,
  Settings, Menu, X, Sun, Moon, LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/auth-store';
import { Avatar } from '../ui';
import { cn } from '../../lib/utils';
import { roleLabel, ROLES } from '../../lib/roles';
import skLogo from '../../assets/sk-logo.svg';

const DASH = { to: '/sk', label: 'Dashboard', icon: LayoutDashboard, end: true };
const SETTINGS = { to: '/sk/settings', label: 'Settings', icon: Settings };

const NAV_BY_ROLE = {
  [ROLES.SECRETARY]: [
    DASH,
    { to: '/sk/announcements', label: 'Announcements', icon: Bell },
    { to: '/sk/meetings', label: 'Meetings & Events', icon: Calendar },
    { to: '/sk/programs', label: 'Programs', icon: FolderKanban },
    { to: '/sk/members', label: 'Members', icon: Users },
    SETTINGS,
  ],
  [ROLES.TREASURER]: [
    DASH,
    { to: '/sk/finance', label: 'Budget & Finance', icon: Wallet },
    { to: '/sk/meetings', label: 'Meetings & Events', icon: Calendar },
    { to: '/sk/rewards', label: 'Rewards & Points', icon: Award },
    { to: '/sk/reports', label: 'Reports', icon: FileText },
    SETTINGS,
  ],
  [ROLES.KAGAWAD]: [
    DASH,
    { to: '/sk/programs', label: 'Programs', icon: FolderKanban },
    { to: '/sk/meetings', label: 'Meetings & Events', icon: Calendar },
    { to: '/sk/rewards', label: 'Rewards & Points', icon: Award },
    SETTINGS,
  ],
};

// Chairperson, if routed here, gets the full set.
const NAV_CHAIR = [
  DASH,
  { to: '/sk/announcements', label: 'Announcements', icon: Bell },
  { to: '/sk/meetings', label: 'Meetings & Events', icon: Calendar },
  { to: '/sk/programs', label: 'Programs', icon: FolderKanban },
  { to: '/sk/finance', label: 'Budget & Finance', icon: Wallet },
  { to: '/sk/rewards', label: 'Rewards & Points', icon: Award },
  { to: '/sk/members', label: 'Members', icon: Users },
  { to: '/sk/reports', label: 'Reports', icon: FileText },
  SETTINGS,
];

function navFor(role) {
  if (role === ROLES.CHAIRPERSON || role === 'sk_chairperson' || role === 'admin') return NAV_CHAIR;
  return NAV_BY_ROLE[role] || NAV_BY_ROLE[ROLES.KAGAWAD];
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('esk-theme') === 'dark'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('esk-theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
}

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white">
        <img src={skLogo} alt="SK" className="h-6 w-6 object-contain" />
      </div>
      <div>
        <p className="text-sm font-extrabold leading-tight text-white">e-SK Manage</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">SK Console</p>
      </div>
    </div>
  );
}

function NavItems({ nav, onNavigate }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Menu</p>
      {nav.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate}
          className={({ isActive }) => cn(
            'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition',
            isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
          )}>
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-white" />}
              <item.icon className="h-[17px] w-[17px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function UserCard({ user, role, onLogout }) {
  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
        <Avatar name={`${user?.firstName || ''} ${user?.lastName || ''}`} src={user?.photo} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{user?.firstName} {user?.lastName}</p>
          <p className="truncate text-[11px] text-white/50">{roleLabel(role)}</p>
        </div>
        <button onClick={onLogout} title="Log out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function SKLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, toggleTheme] = useTheme();
  const [drawer, setDrawer] = useState(false);

  const nav = navFor(user?.role);
  const current = [...nav].sort((a, b) => b.to.length - a.to.length)
    .find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));
  const title = current?.label || 'SK Console';

  const doLogout = () => { logout?.(); navigate('/login'); };
  const sidebarBg = { background: 'linear-gradient(180deg,#3730a3 0%,#312e81 55%,#1e1b4b 100%)' };

  return (
    <div className="min-h-screen bg-bg">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col shadow-xl lg:flex" style={sidebarBg}>
        <Brand />
        <NavItems nav={nav} />
        <UserCard user={user} role={user?.role} onLogout={doLogout} />
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col" style={sidebarBg}>
            <div className="flex items-center justify-between border-b border-white/10 pr-3">
              <Brand />
              <button onClick={() => setDrawer(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavItems nav={nav} onNavigate={() => setDrawer(false)} />
            <UserCard user={user} role={user?.role} onLogout={doLogout} />
          </aside>
        </div>
      )}

      {/* main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setDrawer(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface2 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold text-fg">{title}</h1>
            <p className="hidden text-xs text-muted sm:block">Barangay Tawiran · Santa Cruz, Marinduque</p>
          </div>
          <button onClick={toggleTheme} title="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:bg-surface2 hover:text-fg">
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1 pr-3">
            <Avatar name={`${user?.firstName || ''} ${user?.lastName || ''}`} src={user?.photo} size="sm" />
            <div className="hidden leading-tight sm:block">
              <p className="max-w-[120px] truncate text-xs font-bold text-fg">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-muted">{roleLabel(user?.role)}</p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}