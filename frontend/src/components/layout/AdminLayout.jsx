// src/components/layout/AdminLayout.jsx — e-SK Manage "Head Console"
// Collapsible accordion sidebar (no scrolling), slide-over drawer on mobile,
// sticky top bar with theme toggle + user menu.
// cspell:words Barangay Tawiran Marinduque kabataan kagawad
import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Megaphone, CalendarDays, ClipboardList, Wallet, Gift,
  Users, UserPlus, ShieldCheck, Settings, Menu, X, Sun, Moon, LogOut,
  FileText, PieChart, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/auth-store';
import { Avatar } from '../ui';
import { cn } from '../../lib/utils';
import skLogo from '../../assets/sk-logo.svg';

const PRIMARY = { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard };

const GROUPS = [
  { id: 'community', label: 'Community', icon: Megaphone, items: [
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/admin/meetings', label: 'Meetings & Events', icon: CalendarDays },
    { to: '/admin/programs', label: 'Programs & Projects', icon: ClipboardList },
  ] },
  { id: 'finance', label: 'Finance & Youth', icon: Wallet, items: [
    { to: '/admin/finance', label: 'Budget & Finance', icon: Wallet },
    { to: '/admin/rewards', label: 'Rewards & Points', icon: Gift },
    { to: '/admin/budget', label: 'Budget Breakdown', icon: PieChart },
    { to: '/admin/reports', label: 'Reports', icon: FileText },
  ] },
  { id: 'members', label: 'Members', icon: Users, items: [
    { to: '/admin/users', label: 'All Members', icon: Users },
    { to: '/admin/create-sk', label: 'Create SK Account', icon: UserPlus },
  ] },
  { id: 'oversight', label: 'Oversight', icon: ShieldCheck, items: [
    { to: '/admin/logs', label: 'Audit Trail', icon: ShieldCheck },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ] },
];

const ALL = [PRIMARY, ...GROUPS.flatMap((g) => g.items)];
const ROLE_LABEL = { admin: 'Head / Chairperson', sk_chairperson: 'SK Chairperson' };

function activeGroupId(pathname) {
  return GROUPS.find((g) => g.items.some((i) => pathname.startsWith(i.to)))?.id || null;
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

function NavItems({ pathname, openGroup, setOpenGroup, onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Dashboard (standalone) */}
      <NavLink to={PRIMARY.to} onClick={onNavigate}
        className={({ isActive }) => cn('group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition',
          isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')}>
        {({ isActive }) => (
          <>
            {isActive && <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-white" />}
            <PRIMARY.icon className="h-[17px] w-[17px] shrink-0" />
            <span className="truncate">{PRIMARY.label}</span>
          </>
        )}
      </NavLink>

      {/* Collapsible groups */}
      {GROUPS.map((g) => {
        const open = openGroup === g.id;
        const containsActive = g.items.some((i) => pathname.startsWith(i.to));
        const GroupIcon = g.icon;
        return (
          <div key={g.id}>
            <button
              onClick={() => setOpenGroup(open ? null : g.id)}
              className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition',
                !open && containsActive ? 'text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')}
            >
              <GroupIcon className="h-[17px] w-[17px] shrink-0" />
              <span className="flex-1 text-left">{g.label}</span>
              {!open && containsActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/50 transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
              <div className="mb-1 mt-0.5 space-y-0.5">
                {g.items.map((item) => (
                  <NavLink key={item.to} to={item.to} onClick={onNavigate}
                    className={({ isActive }) => cn('flex items-center gap-3 rounded-lg py-2 pl-10 pr-3 text-[13px] font-medium transition',
                      isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white')}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white">
        <img src={skLogo} alt="SK" className="h-6 w-6 object-contain" />
      </div>
      <div>
        <p className="text-sm font-extrabold leading-tight text-white">e-SK Manage</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Head Console</p>
      </div>
    </div>
  );
}

function UserCard({ user, onLogout }) {
  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
        <Avatar name={`${user?.firstName || ''} ${user?.lastName || ''}`} src={user?.photo} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{user?.firstName} {user?.lastName}</p>
          <p className="truncate text-[11px] text-white/50">{ROLE_LABEL[user?.role] || 'Administrator'}</p>
        </div>
        <button onClick={onLogout} title="Log out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, toggleTheme] = useTheme();
  const [drawer, setDrawer] = useState(false);
  const [openGroup, setOpenGroup] = useState(() => activeGroupId(location.pathname));

  // keep the active group open as the route changes — adjust state during render
  // (React-sanctioned pattern) rather than in an effect
  const [lastPath, setLastPath] = useState(location.pathname);
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    const id = activeGroupId(location.pathname);
    if (id) setOpenGroup(id);
  }

  const current = ALL.find((i) => location.pathname.startsWith(i.to));
  const title = current?.label || 'Head Console';
  const doLogout = () => { logout?.(); navigate('/login'); };
  const sidebarBg = { background: 'linear-gradient(180deg,#3730a3 0%,#312e81 55%,#1e1b4b 100%)' };

  return (
    <div className="min-h-screen bg-bg">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col shadow-xl lg:flex" style={sidebarBg}>
        <Brand />
        <NavItems pathname={location.pathname} openGroup={openGroup} setOpenGroup={setOpenGroup} />
        <UserCard user={user} onLogout={doLogout} />
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
            <NavItems pathname={location.pathname} openGroup={openGroup} setOpenGroup={setOpenGroup} onNavigate={() => setDrawer(false)} />
            <UserCard user={user} onLogout={doLogout} />
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
              <p className="text-[10px] text-muted">{ROLE_LABEL[user?.role] || 'Administrator'}</p>
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