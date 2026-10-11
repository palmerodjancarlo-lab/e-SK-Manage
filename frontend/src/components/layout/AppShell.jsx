// components/layout/AppShell.jsx — the one application shell shared by all portals
// (Head Console, SK Console, Kabataan). Role layouts only pass their navigation.
//
// Desktop: a sidebar that can collapse to an icon rail (remembered per browser).
// Mobile:  a slide-in navigation drawer, or — for members — a bottom tab bar
//          with a "More" sheet (<= 5 destinations, thumb-reachable).
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import Avatar from '../ui/Avatar';
import ThemeToggle from './ThemeToggle';
import skLogo from '../../assets/sk-logo.svg';

const COLLAPSE_KEY = 'esk-sidebar-collapsed';
const GROUPS_KEY = 'esk-nav-closed-groups';
const readClosedGroups = () => { try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'); } catch { return []; } };
const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } };

const isGroup = (entry) => Array.isArray(entry.items);
const flatItems = (nav) => nav.flatMap((e) => (isGroup(e) ? e.items : [e]));
const matches = (item, pathname) => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`));
const currentItem = (nav, pathname) =>
  flatItems(nav).filter((i) => matches(i, pathname)).sort((a, b) => b.to.length - a.to.length)[0];

/* ── Skins ───────────────────────────────────────────────────────────────── */

// "navy": the consoles (Chairperson / SK officers). "light": the kabataan portal —
// white sidebar, SK blue as the only accent.
const SKINS = {
  navy: {
    aside: 'bg-sidebar text-white dark:border-r dark:border-white/10',
    active: 'bg-white/[0.12] font-semibold text-white', idle: 'font-medium text-white/70 hover:bg-white/[0.06] hover:text-white',
    marker: 'bg-gold', iconActive: 'text-gold', badge: 'bg-gold text-[#0F2740]', dotRing: 'ring-sidebar',
    groupActive: 'text-gold', groupIdle: 'text-white/55 group-hover:text-white', chevron: 'text-white/50',
    divider: 'border-white/10', card: 'bg-white/[0.06]', cardHover: 'hover:bg-white/[0.08]',
    name: 'text-white', role: 'text-white/60', avatar: 'bg-white/15 text-white ring-white/20',
    iconBtn: 'text-white/60 hover:bg-white/10 hover:text-white', onDark: true, stripe: true,
  },
  light: {
    aside: 'border-r border-border bg-surface text-fg',
    active: 'bg-primary/10 font-semibold text-primary', idle: 'font-medium text-muted hover:bg-surface2 hover:text-fg',
    marker: 'bg-primary', iconActive: '', badge: 'bg-warning text-warning-fg', dotRing: 'ring-surface',
    groupActive: 'text-primary', groupIdle: 'text-subtle group-hover:text-fg', chevron: 'text-subtle',
    divider: 'border-border', card: 'bg-surface2/60', cardHover: 'hover:bg-surface2',
    name: 'text-fg', role: 'text-subtle', avatar: '',
    iconBtn: 'text-subtle hover:bg-surface2 hover:text-fg', onDark: false, stripe: false,
  },
};
const SkinContext = createContext(SKINS.navy);

/* ── Building blocks ─────────────────────────────────────────────────────── */

// The SK logo's blue, red and yellow as a thin identity stripe
function SkStripe({ className }) {
  return (
    <span aria-hidden="true" className={cn('flex h-1 shrink-0 overflow-hidden', className)}>
      <span className="flex-1 bg-[#0038A8]" /><span className="flex-1 bg-[#CE1126]" /><span className="flex-1 bg-[#FCD116]" />
    </span>
  );
}

function BrandMark({ subtitle, compact, onDark }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white', onDark ? 'shadow-sm' : 'ring-1 ring-border')}>
        <img src={skLogo} alt="" className="h-7 w-7 object-contain" />
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className={cn('block truncate text-sm font-bold', onDark ? 'text-white' : 'text-fg')}>e-SK Manage</span>
          <span className={cn('block truncate text-xs', onDark ? 'text-white/60' : 'text-subtle')}>{subtitle}</span>
        </span>
      )}
    </div>
  );
}

// tone "light" forces the light look (the phone "More" sheet sits on a white surface)
function NavItem({ item, compact, onNavigate, tone }) {
  const Icon = item.icon;
  const ctx = useContext(SkinContext);
  const k = tone === 'light' ? SKINS.light : ctx;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={compact ? item.label : undefined}
      className={({ isActive }) => cn(
        'group relative flex min-h-[40px] items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150',
        compact && 'justify-center px-0',
        isActive ? k.active : k.idle,
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden="true" className={cn('absolute inset-y-2 left-0 w-[3px] rounded-r', k.marker)} />}
          {Icon && <Icon aria-hidden="true" className={cn('h-[18px] w-[18px] shrink-0 transition-colors', isActive && k.iconActive)} />}
          {compact ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
          {item.badge != null && (
            compact
              ? <span aria-hidden="true" className={cn('absolute right-2.5 top-2 h-2 w-2 rounded-full ring-2', k.onDark ? 'bg-gold' : 'bg-warning', k.dotRing)} />
              : <span className={cn('ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums', k.badge)} title={`${item.badge} waiting for you`}>{item.badge}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

function NavGroup({ group, open, onToggle, compact, onNavigate, pathname }) {
  const k = useContext(SkinContext);
  const listId = `nav-group-${group.id}`;
  const hasActive = group.items.some((i) => matches(i, pathname));
  const total = group.items.reduce((n, i) => n + (Number(i.badge) || 0), 0);

  // Icon rail: no section labels — the group's pages show directly as icons
  if (compact) {
    return (
      <div className={cn('space-y-1 border-t pt-2', k.divider)}>
        {group.items.map((item) => <NavItem key={item.to} item={item} compact onNavigate={onNavigate} />)}
      </div>
    );
  }

  return (
    <div className="pt-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={listId}
        className="group flex w-full items-center gap-2 rounded-md px-3 py-1 text-left"
      >
        <span className={cn('flex-1 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors',
          hasActive ? k.groupActive : k.groupIdle)}>{group.label}</span>
        {!open && total > 0 && <span className={cn('rounded px-1.5 text-[10px] font-bold', k.badge)}>{total}</span>}
        <ChevronDown aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', k.chevron, !open && '-rotate-90')} />
        <span className="sr-only">{open ? '(collapse section)' : '(expand section)'}</span>
      </button>
      {open && (
        <div id={listId} className="mt-1 space-y-0.5">
          {group.items.map((item) => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}
        </div>
      )}
    </div>
  );
}

function NavList({ nav, compact, onNavigate, pathname, closedGroups, toggleGroup }) {
  const k = useContext(SkinContext);
  return (
    <nav aria-label="Main" className={cn('flex-1 space-y-0.5 overflow-y-auto px-3 py-4', k.onDark && 'sidebar-scroll')}>
      {nav.map((entry) => (isGroup(entry) ? (
        <NavGroup
          key={entry.id} group={entry} compact={compact} onNavigate={onNavigate} pathname={pathname}
          open={!closedGroups.includes(entry.id) || entry.items.some((i) => matches(i, pathname))}
          onToggle={() => toggleGroup(entry.id)}
        />
      ) : (
        <NavItem key={entry.to} item={entry} compact={compact} onNavigate={onNavigate} />
      )))}
    </nav>
  );
}

function UserFooter({ user, roleLabel, onLogout, compact, accountTo, onNavigate }) {
  const k = useContext(SkinContext);
  const who = (
    <>
      <Avatar src={user?.photo} name={user?.name} size="sm" className={k.avatar} />
      {!compact && (
        <span className="min-w-0 flex-1 leading-tight">
          <span className={cn('block truncate text-sm font-semibold', k.name)}>{user?.name}</span>
          <span className={cn('block truncate text-xs', k.role)}>{roleLabel}</span>
        </span>
      )}
    </>
  );
  return (
    <div className={cn('border-t p-3', k.divider, compact && 'px-2')}>
      <div className={cn('flex items-center gap-1 rounded-xl p-1.5', k.card, compact && 'flex-col bg-transparent p-0')}>
        {accountTo ? (
          <NavLink to={accountTo} onClick={onNavigate} title={compact ? `${user?.name} — account settings` : 'Account settings'}
            className={cn('flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 transition-colors', k.cardHover)}>
            {who}
            {compact && <span className="sr-only">Account settings</span>}
          </NavLink>
        ) : <span className="flex min-w-0 flex-1 items-center gap-3 p-1">{who}</span>}
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors', k.iconBtn)}
        >
          <LogOut aria-hidden="true" className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}

// Phones: the top bar slides away while you scroll down and comes back the
// moment you scroll up (or reach the top). Desktop keeps it in place.
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const d = y - last;
        if (y < 64) { setHidden(false); last = y; }
        else if (d > 8) { setHidden(true); last = y; }
        else if (d < -8) { setHidden(false); last = y; }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return [hidden, setHidden];
}

// Modal panel used for the mobile drawer and the "More" sheet:
// Escape closes, focus moves inside, background stops scrolling, focus returns on close.
function useDialogBehaviour(open, onClose, panelRef) {
  // Latest onClose without re-running the open/close effect on every render
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return undefined;
    const returnTo = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector('a[href], button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (returnTo instanceof HTMLElement) returnTo.focus();
    };
  }, [open, panelRef]);
}

/* ── Shell ───────────────────────────────────────────────────────────────── */

/**
 * @param nav        entries: { to, label, icon, end?, badge? } or groups { id, label, icon, items: [...] }
 * @param subtitle   portal name under the brand ("Head Console", "SK Console", "Kabataan")
 * @param user       { name, photo }
 * @param roleLabel  e.g. "SK Chairperson"
 * @param mobileTabs optional bottom-tab items for phones; remaining nav goes to a "More" sheet
 * @param topbar     optional node shown on the right of the top bar (e.g. points)
 * @param accountTo  path of the user's account/settings page (sidebar footer links there)
 * @param skin       "navy" (consoles, default) or "light" (kabataan portal)
 */
export default function AppShell({ nav = [], subtitle, user, roleLabel, onLogout, mobileTabs, topbar, accountTo, skin = 'navy', children }) {
  const k = SKINS[skin] || SKINS.navy;
  const [headerHidden, setHeaderHidden] = useHideOnScroll();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState(readClosedGroups);
  const toggleGroup = (id) => setClosedGroups((list) => {
    const next = list.includes(id) ? list.filter((g) => g !== id) : [...list, id];
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });
  const drawerRef = useRef(null);

  // Keep the active group open as the route changes (state adjusted during render)
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
    if (headerHidden) setHeaderHidden(false);
  }

  const current = currentItem(nav, pathname);
  const pageTitle = current?.label || subtitle;
  const section = nav.find((e) => isGroup(e) && e.items.includes(current))?.label;

  useEffect(() => { document.title = `${pageTitle} · e-SK Manage`; }, [pageTitle]);
  const [today] = useState(() => new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }));

  const toggleCollapsed = () => setCollapsed((c) => {
    try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* storage unavailable */ }
    return !c;
  });

  const closeDrawer = () => setDrawerOpen(false);
  useDialogBehaviour(drawerOpen, closeDrawer, drawerRef);

  const tabPaths = new Set((mobileTabs || []).map((t) => t.to));
  const moreItems = flatItems(nav).filter((i) => !tabPaths.has(i.to));
  const moreActive = moreItems.some((i) => matches(i, pathname));

  return (
    <SkinContext.Provider value={k}>
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only z-[60] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col transition-[width] duration-200 lg:flex', k.aside,
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        {k.stripe && <SkStripe />}
        <div className={cn('flex shrink-0 items-center', k.stripe ? 'h-[60px]' : cn('h-16 border-b', k.divider), collapsed ? 'justify-center px-2' : 'justify-between pl-4 pr-3')}>
          <BrandMark subtitle={subtitle} compact={collapsed} onDark={k.onDark} />
          {!collapsed && (
            <button type="button" onClick={toggleCollapsed} aria-label="Collapse sidebar" title="Collapse sidebar"
              className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-colors', k.iconBtn)}>
              <PanelLeftClose aria-hidden="true" className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
        {collapsed && (
          <button type="button" onClick={toggleCollapsed} aria-label="Expand sidebar" title="Expand sidebar"
            className={cn('mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-lg transition-colors', k.iconBtn)}>
            <PanelLeftOpen aria-hidden="true" className="h-[18px] w-[18px]" />
          </button>
        )}
        <NavList nav={nav} compact={collapsed} pathname={pathname} closedGroups={closedGroups} toggleGroup={toggleGroup} />
        <UserFooter user={user} roleLabel={roleLabel} onLogout={onLogout} compact={collapsed} accountTo={accountTo} />
      </aside>

      {/* Mobile navigation drawer (portals without bottom tabs) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={closeDrawer} aria-hidden="true" />
          <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Navigation"
            className={cn('absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col animate-pop', k.aside)}>
            {k.stripe && <SkStripe />}
            <div className={cn('flex shrink-0 items-center justify-between pl-4 pr-3', k.stripe ? 'h-[60px]' : cn('h-16 border-b', k.divider))}>
              <BrandMark subtitle={subtitle} onDark={k.onDark} />
              <button type="button" onClick={closeDrawer} aria-label="Close navigation"
                className={cn('flex h-10 w-10 items-center justify-center rounded-lg', k.iconBtn)}>
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <NavList nav={nav} pathname={pathname} closedGroups={closedGroups} toggleGroup={toggleGroup} onNavigate={closeDrawer} />
            <UserFooter user={user} roleLabel={roleLabel} onLogout={onLogout} accountTo={accountTo} onNavigate={closeDrawer} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <header
          onFocusCapture={() => setHeaderHidden(false)}
          className={cn('sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-surface/95 px-4 backdrop-blur-md transition-transform duration-200 ease-out sm:gap-3 sm:px-6 lg:translate-y-0',
            headerHidden && !drawerOpen && '-translate-y-full')}
        >
          {!mobileTabs && (
            <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" aria-expanded={drawerOpen}
              className="-ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-fg lg:hidden">
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
          )}
          {mobileTabs && <span className="lg:hidden"><BrandMark compact /></span>}
          <div className="min-w-0 flex-1 leading-tight">
            {/* Phones: the page title. Desktop: where you are — the page itself shows the big title. */}
            <p className="truncate text-base font-bold text-fg lg:hidden">{pageTitle}</p>
            <nav aria-label="Breadcrumb" className="hidden lg:block">
              <ol className="flex min-w-0 items-center gap-1.5 text-sm">
                <li className="shrink-0 text-subtle">{subtitle}</li>
                {section && (
                  <>
                    <li aria-hidden="true" className="text-subtle/60"><ChevronRight className="h-4 w-4" /></li>
                    <li className="truncate text-subtle">{section}</li>
                  </>
                )}
                {current && (
                  <>
                    <li aria-hidden="true" className="text-subtle/60"><ChevronRight className="h-4 w-4" /></li>
                    <li aria-current="page" className="truncate font-semibold text-fg">{pageTitle}</li>
                  </>
                )}
              </ol>
            </nav>
          </div>
          <span className="hidden text-sm text-subtle xl:block">{today}</span>
          {topbar}
          <ThemeToggle />
          {mobileTabs && (
            accountTo
              ? <NavLink to={accountTo} aria-label="Your account" className="rounded-full lg:hidden"><Avatar src={user?.photo} name={user?.name} size="sm" /></NavLink>
              : <span className="lg:hidden"><Avatar src={user?.photo} name={user?.name} size="sm" /></span>
          )}
        </header>

        <main id="main" tabIndex={-1} className={cn('mx-auto w-full max-w-7xl px-4 py-6 focus:outline-none sm:px-6 lg:py-8', mobileTabs && 'pb-28 lg:pb-8')}>
          {/* keyed by route so every page eases in */}
          <div key={pathname} className="animate-page-in">{children}</div>
        </main>
      </div>

      {mobileTabs && (
        <MobileTabs tabs={mobileTabs} moreItems={moreItems} moreActive={moreActive} onLogout={onLogout} pathname={pathname} />
      )}
    </div>
    </SkinContext.Provider>
  );
}

function MobileTabs({ tabs, moreItems, moreActive, onLogout, pathname }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef(null);
  const close = () => setSheetOpen(false);

  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) { setLastPath(pathname); if (sheetOpen) setSheetOpen(false); }

  useDialogBehaviour(sheetOpen, close, sheetRef);

  const tabClass = (active) => cn('flex h-8 w-14 items-center justify-center rounded-full transition-colors', active ? 'bg-primary/10 text-primary' : 'text-subtle');
  const labelClass = (active) => cn('mt-0.5 text-[11px] font-semibold', active ? 'text-primary' : 'text-muted');

  return (
    <>
      {sheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40" onClick={close} aria-hidden="true" />
          <div ref={sheetRef} role="dialog" aria-modal="true" aria-label="More pages"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
            <nav aria-label="More" className="space-y-1">
              {moreItems.map((item) => <NavItem key={item.to} item={item} tone="light" onNavigate={close} />)}
              <button type="button" onClick={() => { close(); onLogout(); }}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10">
                <LogOut aria-hidden="true" className="h-[18px] w-[18px]" /> Log out
              </button>
            </nav>
          </div>
        </div>
      )}

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink key={t.to} to={t.to} end={t.end} className="flex min-h-[56px] flex-1 flex-col items-center justify-center">
              {({ isActive }) => (
                <>
                  <span className={tabClass(isActive)}><Icon aria-hidden="true" className="h-5 w-5" /></span>
                  <span className={labelClass(isActive)}>{t.short || t.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
        <button type="button" onClick={() => setSheetOpen(true)} aria-expanded={sheetOpen} aria-haspopup="dialog"
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center">
          <span className={tabClass(moreActive || sheetOpen)}><MoreHorizontal aria-hidden="true" className="h-5 w-5" /></span>
          <span className={labelClass(moreActive || sheetOpen)}>More</span>
        </button>
      </nav>
    </>
  );
}
