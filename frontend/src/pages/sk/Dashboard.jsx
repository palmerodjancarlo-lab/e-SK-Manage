// src/pages/sk/Dashboard.jsx — role-aware SK officer dashboard
// Chairperson → overview · Secretary → records · Treasurer → finances · Kagawad → programs & attendance
// cspell:words kabataan kagawad Tawiran Barangay
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingDown, Landmark, Megaphone, CalendarDays, ClipboardList,
  Users, FileText, Award, PenSquare, FolderPlus, ArrowUpRight, Clock, UserCheck,
  Sparkles,
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import skLogo from '../../assets/sk-logo.svg';

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString('en-PH');
const asArray = (d) => (Array.isArray(d) ? d : d?.meetings || d?.programs || d?.announcements || d?.projects || d?.users || []);
const safeGet = (url) => api.get(url).then((r) => r.data).catch(() => null);
const dateOf = (x) => new Date(x.date || x.scheduledAt || x.startsAt || 0);

function greeting(h) {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const ROLE_META = {
  sk_chairperson: { title: 'SK Chairperson', sub: 'Council Overview' },
  sk_secretary:   { title: 'SK Secretary', sub: 'Records & Documentation' },
  sk_treasurer:   { title: 'SK Treasurer', sub: 'Financial Custodian' },
  sk_kagawad:     { title: 'SK Kagawad', sub: 'Programs & Committees' },
};

/* ─────────────── shared presentational pieces ─────────────── */

function Hero({ role, name, today }) {
  const meta = ROLE_META[role] || { title: 'SK Officer', sub: 'Dashboard' };
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-6 text-primary-fg shadow-lg sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 right-28 h-36 w-36 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute right-6 top-6 opacity-20 sm:opacity-30">
        <img src={skLogo} alt="" className="h-24 w-24" />
      </div>
      <div className="relative flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
          <img src={skLogo} alt="SK Barangay Tawiran" className="h-11 w-11" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-fg/80">Sangguniang Kabataan · Barangay Tawiran</p>
          <h2 className="truncate text-2xl font-extrabold leading-tight sm:text-3xl">{greeting(today.getHours())}, {name}</h2>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-primary-fg/90">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">{meta.title}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{meta.sub}</span>
            <span className="hidden sm:inline">·</span>
            <span>{today.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, note, accent, chip }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3 p-4 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-fg">{value}</p>
          {note && <p className="mt-0.5 text-[11px] text-subtle">{note}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-110" style={{ background: chip, color: accent }}>{icon}</div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon, label }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-primary/40 hover:bg-surface2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary">{icon}</span>
      <span className="text-sm font-semibold text-fg">{label}</span>
      <ArrowUpRight className="ml-auto h-4 w-4 text-subtle" />
    </Link>
  );
}

function SectionCard({ title, action, children, className = '' }) {
  return (
    <Card className={className}>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-fg">{title}</p>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ListRow({ icon, title, sub, right }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{title}</p>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ─────────────── CHAIRPERSON / OVERVIEW ─────────────── */
function OverviewDash({ now }) {
  const finQ = useQuery({ queryKey: ['finance', 'summary'], queryFn: () => safeGet('/finance/summary') });
  const progQ = useQuery({ queryKey: ['programs'], queryFn: () => safeGet('/programs') });
  const meetingsQ = useQuery({ queryKey: ['meetings'], queryFn: () => safeGet('/meetings') });
  const membersQ = useQuery({ queryKey: ['members'], queryFn: () => safeGet('/auth/members') });

  const fin = finQ.data || {};
  const funds = fin.totalFunds ?? 0;
  const spent = fin.totalExpenses ?? 0;
  const balance = fin.balance ?? funds - spent;
  const usedPct = funds > 0 ? Math.min(100, Math.round((spent / funds) * 100)) : 0;

  const programs = useMemo(() => asArray(progQ.data), [progQ.data]);
  const meetings = useMemo(() => asArray(meetingsQ.data), [meetingsQ.data]);
  const members = useMemo(() => asArray(membersQ.data), [membersQ.data]);
  const kabataan = members.filter((m) => m.role === 'kabataan');
  const upcoming = useMemo(
    () => meetings.filter((m) => dateOf(m).getTime() >= now).sort((a, b) => dateOf(a) - dateOf(b)),
    [meetings, now],
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Wallet className="h-5 w-5" />} label="Balance" value={peso(balance)} note={`${usedPct}% of funds used`} accent="#10b981" chip="rgba(16,185,129,0.14)" />
        <Stat icon={<ClipboardList className="h-5 w-5" />} label="Programs" value={num(programs.length)} note="On record" accent="#8b5cf6" chip="rgba(139,92,246,0.14)" />
        <Stat icon={<CalendarDays className="h-5 w-5" />} label="Upcoming events" value={num(upcoming.length)} note="Scheduled" accent="#3b82f6" chip="rgba(59,130,246,0.14)" />
        <Stat icon={<Users className="h-5 w-5" />} label="Kabataan" value={num(kabataan.length)} note={`${num(members.length)} total members`} accent="#6366f1" chip="rgba(99,102,241,0.14)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3">
          <p className="text-sm font-bold text-fg">Quick actions</p>
          <QuickAction to="/sk/finance" icon={<Wallet className="h-4 w-4" />} label="Review finances" />
          <QuickAction to="/sk/programs" icon={<FolderPlus className="h-4 w-4" />} label="Manage programs" />
          <QuickAction to="/sk/reports" icon={<FileText className="h-4 w-4" />} label="Generate reports" />
          <QuickAction to="/sk/members" icon={<Users className="h-4 w-4" />} label="Member roster" />
        </div>

        <SectionCard
          className="lg:col-span-2"
          title="Upcoming events"
          action={<Link to="/sk/meetings" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">Open <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
        >
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Upcoming meetings & events will appear here." />
          ) : (
            <div className="divide-y divide-border">
              {upcoming.slice(0, 5).map((m) => (
                <ListRow
                  key={m._id}
                  icon={<CalendarDays className="h-4 w-4" />}
                  title={m.title || 'Event'}
                  sub={dateOf(m).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                  right={m.type ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{m.type}</span> : null}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

/* ─────────────── SECRETARY ─────────────── */
function SecretaryDash({ now }) {
  const meetingsQ = useQuery({ queryKey: ['meetings'], queryFn: () => safeGet('/meetings') });
  const annQ = useQuery({ queryKey: ['announcements'], queryFn: () => safeGet('/announcements') });
  const progQ = useQuery({ queryKey: ['programs'], queryFn: () => safeGet('/programs') });

  const meetings = useMemo(() => asArray(meetingsQ.data), [meetingsQ.data]);
  const announcements = useMemo(() => asArray(annQ.data), [annQ.data]);
  const programs = useMemo(() => asArray(progQ.data), [progQ.data]);

  const upcoming = useMemo(
    () => meetings.filter((m) => dateOf(m).getTime() >= now).sort((a, b) => dateOf(a) - dateOf(b)),
    [meetings, now],
  );
  const recentAnn = useMemo(
    () => [...announcements].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5),
    [announcements],
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<CalendarDays className="h-5 w-5" />} label="Upcoming meetings" value={num(upcoming.length)} note="To record minutes for" accent="#6366f1" chip="rgba(99,102,241,0.14)" />
        <Stat icon={<Megaphone className="h-5 w-5" />} label="Announcements" value={num(announcements.length)} note="Posted" accent="#3b82f6" chip="rgba(59,130,246,0.14)" />
        <Stat icon={<ClipboardList className="h-5 w-5" />} label="Programs" value={num(programs.length)} note="On record" accent="#8b5cf6" chip="rgba(139,92,246,0.14)" />
        <Stat icon={<FileText className="h-5 w-5" />} label="Meetings logged" value={num(meetings.length)} note="Total on file" accent="#0ea5e9" chip="rgba(14,165,233,0.14)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3">
          <p className="text-sm font-bold text-fg">Quick actions</p>
          <QuickAction to="/sk/meetings" icon={<PenSquare className="h-4 w-4" />} label="Write meeting minutes" />
          <QuickAction to="/sk/announcements" icon={<Megaphone className="h-4 w-4" />} label="Post an announcement" />
          <QuickAction to="/sk/members" icon={<Users className="h-4 w-4" />} label="Open KK member roster" />
        </div>

        <SectionCard className="lg:col-span-2" title="Meetings needing minutes">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Upcoming meetings will appear here to record." />
          ) : (
            <div className="divide-y divide-border">
              {upcoming.slice(0, 5).map((m) => (
                <ListRow
                  key={m._id}
                  icon={<CalendarDays className="h-4 w-4" />}
                  title={m.title || 'Meeting'}
                  sub={dateOf(m).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                  right={<Link to="/sk/meetings" className="text-xs font-bold text-primary hover:underline">Record</Link>}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Recent announcements"
        action={<Link to="/sk/announcements" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">Manage <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
      >
        {recentAnn.length === 0 ? (
          <EmptyState icon={Megaphone} title="No announcements yet" description="Posted announcements will appear here." />
        ) : (
          <div className="divide-y divide-border">
            {recentAnn.map((a) => (
              <ListRow
                key={a._id}
                icon={<Megaphone className="h-4 w-4" />}
                title={a.title}
                sub={`${a.category || 'General'}${a.createdAt ? ` · ${new Date(a.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}` : ''}`}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}

/* ─────────────── TREASURER ─────────────── */
function TreasurerDash() {
  const finQ = useQuery({ queryKey: ['finance', 'summary'], queryFn: () => safeGet('/finance/summary') });
  const fin = finQ.data || {};
  const funds = fin.totalFunds ?? 0;
  const spent = fin.totalExpenses ?? 0;
  const balance = fin.balance ?? funds - spent;
  const usedPct = funds > 0 ? Math.min(100, Math.round((spent / funds) * 100)) : 0;
  const pending = fin.pendingExpenses || { count: 0, total: 0 };
  const cats = useMemo(
    () => (fin.expensesByCategory || []).map((c) => ({ name: c.name || c._id || c.category || 'Other', total: c.total ?? c.amount ?? 0 }))
      .sort((a, b) => b.total - a.total).slice(0, 5),
    [fin.expensesByCategory],
  );
  const maxCat = cats[0]?.total || 1;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Landmark className="h-5 w-5" />} label="Total funds" value={peso(funds)} accent="#10b981" chip="rgba(16,185,129,0.14)" />
        <Stat icon={<TrendingDown className="h-5 w-5" />} label="Total spent" value={peso(spent)} accent="#ef4444" chip="rgba(239,68,68,0.12)" />
        <Stat icon={<Wallet className="h-5 w-5" />} label="Balance" value={peso(balance)} accent="#6366f1" chip="rgba(99,102,241,0.14)" />
        <Stat icon={<Clock className="h-5 w-5" />} label="Awaiting approval" value={num(pending.count)} note={peso(pending.total)} accent="#f59e0b" chip="rgba(245,158,11,0.14)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3">
          <p className="text-sm font-bold text-fg">Quick actions</p>
          <QuickAction to="/sk/finance" icon={<Wallet className="h-4 w-4" />} label="Record an expense" />
          <QuickAction to="/sk/finance" icon={<FileText className="h-4 w-4" />} label="Scan a receipt" />
          <QuickAction to="/sk/reports/abyip" icon={<FileText className="h-4 w-4" />} label="Generate ABYIP report" />
          <QuickAction to="/sk/rewards" icon={<Award className="h-4 w-4" />} label="Manage rewards & points" />
        </div>

        <SectionCard
          className="lg:col-span-2"
          title="Budget utilization"
          action={<Link to="/sk/finance" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">Open ledger <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
        >
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-fg">{usedPct}% used</span>
            <span className="tabular-nums text-muted">{peso(spent)} / {peso(funds)}</span>
          </div>
          <div className="mb-5 h-2.5 w-full overflow-hidden rounded-full bg-surface2">
            <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, background: usedPct > 90 ? '#ef4444' : usedPct > 70 ? '#f59e0b' : '#10b981' }} />
          </div>

          <p className="mb-2 text-sm font-bold text-fg">Spending by category</p>
          {cats.length === 0 ? (
            <EmptyState icon={Wallet} title="No expenses yet" description="Recorded expenses will break down here." />
          ) : (
            <div className="space-y-3">
              {cats.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold capitalize text-fg">{c.name}</span>
                    <span className="tabular-nums text-muted">{peso(c.total)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((c.total / maxCat) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

/* ─────────────── KAGAWAD ─────────────── */
function KagawadDash({ now }) {
  const progQ = useQuery({ queryKey: ['programs'], queryFn: () => safeGet('/programs') });
  const meetingsQ = useQuery({ queryKey: ['meetings'], queryFn: () => safeGet('/meetings') });

  const programs = useMemo(() => asArray(progQ.data), [progQ.data]);
  const meetings = useMemo(() => asArray(meetingsQ.data), [meetingsQ.data]);

  const active = useMemo(() => programs.filter((p) => {
    const s = (p.status || '').toLowerCase();
    return s ? ['ongoing', 'active', 'approved', 'in progress'].some((k) => s.includes(k)) : true;
  }), [programs]);
  const upcoming = useMemo(
    () => meetings.filter((m) => dateOf(m).getTime() >= now).sort((a, b) => dateOf(a) - dateOf(b)),
    [meetings, now],
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<ClipboardList className="h-5 w-5" />} label="Active programs" value={num(active.length)} note="In progress" accent="#8b5cf6" chip="rgba(139,92,246,0.14)" />
        <Stat icon={<FolderPlus className="h-5 w-5" />} label="Total programs" value={num(programs.length)} note="On record" accent="#6366f1" chip="rgba(99,102,241,0.14)" />
        <Stat icon={<CalendarDays className="h-5 w-5" />} label="Upcoming sessions" value={num(upcoming.length)} note="To record attendance" accent="#3b82f6" chip="rgba(59,130,246,0.14)" />
        <Stat icon={<Clock className="h-5 w-5" />} label="Meetings logged" value={num(meetings.length)} note="Total on file" accent="#0ea5e9" chip="rgba(14,165,233,0.14)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3">
          <p className="text-sm font-bold text-fg">Quick actions</p>
          <QuickAction to="/sk/meetings" icon={<UserCheck className="h-4 w-4" />} label="Record attendance" />
          <QuickAction to="/sk/programs" icon={<FolderPlus className="h-4 w-4" />} label="Manage programs & projects" />
          <QuickAction to="/sk/members" icon={<Users className="h-4 w-4" />} label="View KK members" />
        </div>

        <SectionCard className="lg:col-span-2" title="Upcoming sessions to record">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Upcoming meetings & activities will appear here for attendance." />
          ) : (
            <div className="divide-y divide-border">
              {upcoming.slice(0, 5).map((m) => (
                <ListRow
                  key={m._id}
                  icon={<CalendarDays className="h-4 w-4" />}
                  title={m.title || 'Session'}
                  sub={dateOf(m).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                  right={<Link to="/sk/meetings" className="text-xs font-bold text-primary hover:underline">Attendance</Link>}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}

export default function SKDashboard() {
  const { user } = useAuth();
  const todayQ = useQuery({ queryKey: ['today'], queryFn: async () => new Date() });
  const today = todayQ.data || new Date();
  const name = user?.firstName || 'Officer';
  const role = user?.role;
  const nowMs = today.getTime();

  return (
    <div className="space-y-6">
      <Hero role={role} name={name} today={today} />
      {role === 'sk_treasurer' && <TreasurerDash />}
      {role === 'sk_secretary' && <SecretaryDash now={nowMs} />}
      {role === 'sk_kagawad' && <KagawadDash now={nowMs} />}
      {(role === 'sk_chairperson' || role === 'admin') && <OverviewDash now={nowMs} />}
      {!['sk_treasurer', 'sk_secretary', 'sk_kagawad', 'sk_chairperson', 'admin'].includes(role) && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted">
          <Sparkles className="h-8 w-8 text-primary" />
          <p className="text-sm">Welcome to the SK console.</p>
        </div>
      )}
    </div>
  );
}