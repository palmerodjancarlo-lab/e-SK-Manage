// src/pages/admin/Dashboard.jsx — Head Console overview
// cspell:words kabataan kagawad Tawiran Marinduque
// Reading order: who you are → what needs you now → money → people → what happened.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import {
  Users, ShieldCheck, UserCheck, Accessibility, Wallet, Activity, ArrowUpRight, Megaphone,
  CalendarPlus, UserPlus, IdCard, Receipt, CalendarClock, ChevronRight, CheckCircle2, MapPin, Clock, Ticket,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, Spinner, EmptyState, Avatar, BrandBanner, AnimatedNumber } from '../../components/ui';
import DateTile from '../../components/events/DateTile';
import { useAuth } from '../../context/auth-store';
import { cn, timeAgo } from '../../lib/utils';
import { eventTypeClass, eventTime, isPastEvent } from '../../lib/events';

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString('en-PH');
// Colour follows the category, never its position in the data
const SEX_COLOR = { Male: 'rgb(var(--chart-1))', Female: 'rgb(var(--chart-2))' };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const WEEK_MS = 7 * 864e5;

function greeting(h) {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// KPI tile — tinted icon chip, a thin tone bar, and the number front and centre
const TONES = {
  primary: { bar: 'bg-primary', chip: 'bg-primary/10 text-primary' },
  info: { bar: 'bg-info', chip: 'bg-info/10 text-info' },
  success: { bar: 'bg-success', chip: 'bg-success/10 text-success' },
  accent: { bar: 'bg-accent', chip: 'bg-accent/10 text-accent' },
};
function Kpi({ icon, label, value, sub, tone = 'primary', to }) {
  const t = TONES[tone];
  const Icon = icon;
  const body = (
    <>
      <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1', t.bar)} />
      <div className="flex items-start justify-between gap-3 p-5 pt-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-fg"><AnimatedNumber value={value} /></p>
          {sub && <p className="mt-1 text-xs text-subtle">{sub}</p>}
        </div>
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110', t.chip)}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
    </>
  );
  const cls = 'group relative block overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-pop';
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

function SectionTitle({ icon, children, to, linkLabel }) {
  const Icon = icon;
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="inline-flex items-center gap-2 text-sm font-bold text-fg"><Icon aria-hidden="true" className="h-4 w-4 text-primary" /> {children}</h2>
      {to && (
        <Link to={to} className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-1.5 text-xs font-bold text-primary hover:bg-primary/5">
          {linkLabel} <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 px-4 py-3 sm:block">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('mt-0.5 truncate text-lg font-extrabold tabular-nums xl:text-xl', tone || 'text-fg')}>{value}</p>
    </div>
  );
}

// One row in "Needs your attention"
function TaskRow({ icon, tone, title, detail, count, to }) {
  const Icon = icon;
  const idle = !count;
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', idle ? 'bg-surface2 text-subtle' : tone)}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="block truncate text-xs text-subtle">{detail}</span>
      </span>
      <span className={cn('min-w-[2rem] rounded-md px-2 py-0.5 text-center text-sm font-bold tabular-nums',
        idle ? 'text-subtle' : 'bg-gold text-[#0F2740]')}>{count || 0}</span>
      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

// [a] → a · [a, b] → a and b · [a, b, c] → a, b and c
const listJoin = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

const ACTION_LABEL = {
  CREATE_SK_ACCOUNT: 'created an SK account', UPDATE_USER: 'updated a member',
  TOGGLE_USER: 'changed account status', RESET_PASSWORD: 'reset a password',
  DELETE_USER: 'removed a member', VERIFY_RESIDENCY: 'verified a resident',
  UNVERIFY_RESIDENCY: 'removed a verification', RECORD_FUND: 'recorded a fund',
  RECORD_EXPENSE: 'recorded an expense', APPROVE_EXPENSE: 'approved an expense', LOGIN: 'signed in',
  REJECT_EXPENSE: 'rejected an expense', VOID_EXPENSE: 'voided an expense', EDIT_FUND: 'edited a fund', VOID_FUND: 'voided a fund',
  PUBLISH_BUDGET: 'changed the budget shown to kabataan', QR_CHECKIN: 'checked in by QR', RECORD_ATTENDANCE: 'recorded attendance',
  CREATE_ANNOUNCEMENT: 'posted an announcement', UPDATE_ANNOUNCEMENT: 'edited an announcement', DELETE_ANNOUNCEMENT: 'deleted an announcement',
  CREATE_MEETING: 'scheduled an event', DELETE_MEETING: 'deleted an event', GENERATE_QR: 'opened QR check-in',
  CREATE_PROGRAM: 'added a program', UPDATE_PROGRAM: 'updated a program', DELETE_PROGRAM: 'deleted a program', PROGRAM_UPDATE: 'posted a progress update',
  CREATE_PROJECT: 'added a project', CREATE_ACTIVITY: 'added an activity', ADD_PPA_PHOTO: 'added a program photo', ADD_PROGRAM_DOCUMENT: 'attached a document',
  AWARD_POINTS: 'awarded points', REQUEST_REDEMPTION: 'requested a reward', CLAIM_REDEMPTION: 'handed out a reward',
  REJECT_REDEMPTION: 'rejected a reward request', CANCEL_REDEMPTION: 'cancelled a reward request', VOLUNTEER_SIGNUP: 'volunteered for an event',
  UPDATE_REPORT: 'updated a report', DELETE_REPORT: 'deleted a report', CHANGE_PASSWORD: 'changed their password',
};

const ACTIONS = [
  { to: '/admin/announcements', label: 'Post announcement', icon: Megaphone },
  { to: '/admin/meetings', label: 'New event', icon: CalendarPlus },
  { to: '/admin/create-sk', label: 'Add SK officer', icon: UserPlus, primary: true },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [now] = useState(() => Date.now());

  // Same keys as the console layout, so the numbers come from one shared fetch
  const statsQ = useQuery({ queryKey: ['admin', 'stats'], queryFn: async () => (await api.get('/admin/stats')).data.stats });
  const finQ = useQuery({ queryKey: ['fin-summary'], queryFn: async () => (await api.get('/finance/summary')).data, retry: false });
  const sysQ = useQuery({ queryKey: ['system-info'], queryFn: async () => (await api.get('/settings/system')).data, retry: false });
  const logsQ = useQuery({ queryKey: ['admin', 'logs'], queryFn: async () => (await api.get('/admin/logs')).data.logs });
  const meetQ = useQuery({ queryKey: ['meetings'], queryFn: async () => (await api.get('/meetings')).data.meetings });
  const pickupQ = useQuery({ queryKey: ['redemptions', 'pending'], queryFn: async () => (await api.get('/rewards/redemptions', { params: { status: 'pending' } })).data.redemptions || [], retry: false });

  const s = statsQ.data || {};
  const fin = finQ.data || {};
  const logs = logsQ.data || [];
  const today = new Date(now);

  const upcoming = (Array.isArray(meetQ.data) ? meetQ.data : [])
    .filter((m) => !isPastEvent(m, now))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const thisWeek = upcoming.filter((m) => new Date(m.date).getTime() - now < WEEK_MS).length;
  const pendingIds = sysQ.data?.counts?.pendingVerification ?? Math.max(0, (s.kabataanCount || 0) - (s.verifiedCount || 0));
  const pendingExp = fin.pendingExpenses?.count || 0;
  const pickups = (pickupQ.data || []).length;
  const allClear = !pendingIds && !pendingExp && !pickups;

  const totalSex = (s.maleCount || 0) + (s.femaleCount || 0);
  const sexData = [
    { name: 'Male', value: s.maleCount || 0 },
    { name: 'Female', value: s.femaleCount || 0 },
  ].filter((d) => d.value > 0);

  const catData = (fin.expensesByCategory || []).map((c) => ({ name: cap(c.name || c._id || c.category || 'Other'), total: c.total ?? c.amount ?? 0 }));
  const funds = fin.totalFunds ?? 0;
  const spent = fin.totalExpenses ?? 0;
  const balance = fin.balance ?? funds - spent;
  const usedPct = funds > 0 ? Math.min(100, Math.round((spent / funds) * 100)) : 0;

  if (statsQ.isLoading) return <div className="flex justify-center py-20" role="status"><Spinner className="h-8 w-8 text-primary" /><span className="sr-only">Loading…</span></div>;

  return (
    <div className="space-y-6">
      {/* welcome banner */}
      <BrandBanner>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Head Console · Barangay Tawiran</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{greeting(today.getHours())}, {user?.firstName || 'Chairperson'}</h1>
            <p className="mt-1 text-sm text-white/80">
              {allClear ? 'Everything is up to date.' : `You have ${listJoin([pendingIds && `${pendingIds} ID${pendingIds === 1 ? '' : 's'} to review`, pendingExp && `${pendingExp} expense${pendingExp === 1 ? '' : 's'} to approve`, pickups && `${pickups} reward${pickups === 1 ? '' : 's'} to hand out`].filter(Boolean))}.`}
              {upcoming.length > 0 && ` Next event: ${upcoming[0].title}, ${new Date(upcoming[0].date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <Link key={a.to} to={a.to}
                className={cn('inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition',
                  a.primary
                    ? 'bg-white text-brand shadow-pop hover:-translate-y-0.5'
                    : 'border border-white/30 text-white backdrop-blur-sm hover:bg-white/10')}>
                <a.icon aria-hidden="true" className="h-4 w-4" /> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </BrandBanner>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi icon={Users} label="Total members" value={num(s.totalUsers)} sub={`${num(s.activeUsers)} active accounts`} tone="primary" to="/admin/users" />
        <Kpi icon={UserCheck} label="Kabataan" value={num(s.kabataanCount)} sub={`${num(s.verifiedCount)} verified residents`} tone="success" to="/admin/users?tab=kabataan" />
        <Kpi icon={ShieldCheck} label="SK officials" value={num(s.skOfficialCount)} sub="Council & kagawad" tone="info" to="/admin/users?tab=sk" />
        <Kpi icon={Accessibility} label="PWD members" value={num(s.pwdCount)} sub="Priority for programs" tone="accent" />
      </div>

      {/* attention + treasury */}
      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:order-2">
          <CardContent>
            <SectionTitle icon={CheckCircle2}>Needs your attention</SectionTitle>
            <div className="space-y-2.5">
              <TaskRow icon={IdCard} tone="bg-warning/10 text-warning" title="Residency IDs to review"
                detail={pendingIds ? 'Kabataan waiting to be verified' : 'No IDs waiting'} count={pendingIds} to="/admin/users?tab=pending" />
              <TaskRow icon={Receipt} tone="bg-danger/10 text-danger" title="Expenses to approve"
                detail={pendingExp ? `${peso(fin.pendingExpenses?.total)} waiting` : 'Nothing waiting'} count={pendingExp} to="/admin/finance?tab=expenses" />
              <TaskRow icon={Ticket} tone="bg-accent/10 text-accent" title="Reward pickups"
                detail={pickups ? 'Members waiting to claim a reward' : 'No one waiting'} count={pickups} to="/admin/rewards" />
              <TaskRow icon={CalendarClock} tone="bg-primary/10 text-primary" title="Events this week"
                detail={thisWeek ? 'Open QR check-in on the day' : 'Nothing scheduled this week'} count={thisWeek} to="/admin/meetings" />
            </div>
            {allClear && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> All caught up — nothing needs approval.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:order-1 lg:col-span-2">
          <CardContent>
            <SectionTitle icon={Wallet} to="/admin/finance" linkLabel="Budget & Finance">Treasury overview</SectionTitle>
            <div className="grid grid-cols-1 divide-y divide-border rounded-xl border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <MiniStat label="Total funds" value={peso(funds)} />
              <MiniStat label="Total spent" value={peso(spent)} tone="text-danger" />
              <MiniStat label="Balance" value={peso(balance)} tone={balance >= 0 ? 'text-success' : 'text-danger'} />
            </div>

            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted">Budget used</span>
                <span className="font-bold tabular-nums text-fg">{usedPct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
                <div className={cn('h-full origin-left rounded-full animate-grow-x', usedPct > 85 ? 'bg-danger' : 'bg-primary')} style={{ width: `${usedPct}%` }} />
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Spending by category</p>
              {catData.length === 0 ? (
                <p className="py-6 text-center text-sm text-subtle">No expenses recorded yet.</p>
              ) : (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catData} margin={{ top: 6, right: 8, left: -12, bottom: 0 }} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} width={52}
                        tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => peso(v)} cursor={{ fill: 'rgb(var(--surface2))' }} />
                      {/* One series → one hue; categories are already named on the axis */}
                      <Bar dataKey="total" fill="rgb(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* activity + events/members */}
      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardContent>
            <SectionTitle icon={Activity} to="/admin/logs" linkLabel="Audit logs">Recent activity</SectionTitle>
            {logsQ.isLoading ? (
              <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-primary" /></div>
            ) : logs.length === 0 ? (
              <EmptyState icon={Activity} title="Nothing yet" description="Actions across the console will show up here." />
            ) : (
              <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-px before:bg-border">
                {logs.slice(0, 7).map((l) => {
                  const name = `${l.user?.firstName || 'System'} ${l.user?.lastName || ''}`.trim();
                  return (
                    <li key={l._id} className="relative flex items-center gap-3 rounded-lg py-2 pr-2">
                      <Avatar name={name} src={l.user?.photo} size="sm" className="relative" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-fg">
                          <b>{name}</b>{' '}
                          <span className="text-muted">{ACTION_LABEL[l.action] || (l.action || '').toLowerCase().replace(/_/g, ' ')}</span>
                        </p>
                        {l.details && <p className="truncate text-xs text-subtle">{l.details}</p>}
                      </div>
                      <time dateTime={l.createdAt} className="shrink-0 text-xs text-subtle">{timeAgo(l.createdAt)}</time>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent>
              <SectionTitle icon={CalendarClock} to="/admin/meetings" linkLabel="All events">Coming up</SectionTitle>
              {upcoming.length === 0 ? (
                <p className="rounded-lg bg-surface2/60 px-3 py-6 text-center text-sm text-subtle">No events scheduled. <Link to="/admin/meetings" className="font-semibold text-primary hover:underline">Plan one</Link></p>
              ) : (
                <ul className="space-y-3">
                  {upcoming.slice(0, 3).map((m) => (
                    <li key={m._id} className="flex gap-3">
                      <DateTile date={m.date} size="sm" />
                      <div className="min-w-0 flex-1">
                        <span className={cn('rounded px-1.5 py-px text-[11px] font-semibold', eventTypeClass(m.type))}>{m.type}</span>
                        <p className="mt-0.5 truncate text-sm font-semibold text-fg">{m.title}</p>
                        <p className="flex items-center gap-3 truncate text-xs text-subtle">
                          <span className="inline-flex items-center gap-1"><Clock aria-hidden="true" className="h-3 w-3" />{eventTime(m)}</span>
                          {(m.venue || m.location) && <span className="inline-flex min-w-0 items-center gap-1"><MapPin aria-hidden="true" className="h-3 w-3 shrink-0" /><span className="truncate">{m.venue || m.location}</span></span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionTitle icon={Users}>Members by sex</SectionTitle>
              {sexData.length === 0 ? (
                <p className="py-6 text-center text-sm text-subtle">Kabataan records will appear here.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative h-32 w-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sexData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={3} strokeWidth={0}>
                          {sexData.map((d) => <Cell key={d.name} fill={SEX_COLOR[d.name] || 'rgb(var(--subtle))'} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [num(v), n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-extrabold text-fg">{num(totalSex)}</span>
                      <span className="text-[10px] text-muted">members</span>
                    </div>
                  </div>
                  <dl className="flex-1 space-y-2">
                    {['Male', 'Female'].map((k) => (
                      <div key={k} className="rounded-lg bg-surface2/60 px-3 py-2">
                        <dt className="inline-flex items-center gap-1.5 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: SEX_COLOR[k] }} aria-hidden="true" /> {k}</dt>
                        <dd className="text-lg font-extrabold tabular-nums text-fg">
                          {num(k === 'Male' ? s.maleCount : s.femaleCount)}
                          <span className="ml-1.5 text-xs font-semibold text-subtle">{totalSex ? Math.round(((k === 'Male' ? s.maleCount : s.femaleCount) / totalSex) * 100) : 0}%</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
