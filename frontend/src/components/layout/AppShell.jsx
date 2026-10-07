import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import Avatar from '../ui/Avatar';
import ThemeToggle from './ThemeToggle';

/**
 * Reusable app shell: fixed sidebar on desktop, slide-in drawer on mobile,
 * sticky topbar with theme toggle. Role layouts pass their own nav + user.
 *
 * Props:
 *   brand    { title, subtitle, logo }
 *   nav      [{ to, label, icon, end }]
 *   user     { name, role, avatar }
 *   roleLabel string shown under the user's name
 *   onLogout function
 *   topbar   optional node rendered on the right of the topbar (before toggle)
 */
export default function AppShell({ brand, nav = [], user, roleLabel, onLogout, topbar, children }) {
  const [open, setOpen] = useState(false);

  const NavItems = ({ onNavigate }) => (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-primary text-primary-fg shadow-card'
                : 'text-muted hover:bg-surface2 hover:text-fg'
            )
          }
        >
          {item.icon && <item.icon className="h-5 w-5 shrink-0" />}
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  const Brand = () => (
    <div className="flex items-center gap-3 px-5 py-5">
      {brand?.logo ? (
        <img src={brand.logo} alt="" className="h-10 w-10 rounded-xl object-contain" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-black text-primary-fg">
          SK
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-fg">{brand?.title || 'e-SK Manage'}</p>
        {brand?.subtitle && <p className="truncate text-xs text-subtle">{brand.subtitle}</p>}
      </div>
    </div>
  );

  const UserFooter = () => (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <Avatar src={user?.avatar} name={user?.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{user?.name || 'User'}</p>
          <p className="truncate text-xs text-subtle">{roleLabel || user?.role}</p>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="rounded-lg p-2 text-subtle transition hover:bg-danger/10 hover:text-danger"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <Brand />
        <NavItems />
        <UserFooter />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border bg-surface animate-pop">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-subtle transition hover:bg-surface2 hover:text-fg"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
            <UserFooter />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl border border-border bg-surface p-2 text-muted transition hover:text-fg lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          {topbar}
          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
