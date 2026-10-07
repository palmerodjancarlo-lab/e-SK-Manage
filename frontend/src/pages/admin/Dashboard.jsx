// src/pages/admin/Dashboard.jsx — Head Console overview
// cspell:words kabataan kagawad Tawiran Marinduque
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import {
  Users, ShieldCheck, UserCheck, Accessibility, Wallet,
  Activity, ArrowUpRight, Megaphone, CalendarPlus, UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, Spinner, EmptyState, Avatar } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { cn } from '../../lib/utils';

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString('en-PH');
const CAT_COLORS = ['#6366f1', '#3b82f6', '#8b5cf6', '#0ea5e9', '#f59e0b', '#14b8a6', '#ef4444', '#64748b'];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

function greeting(h) {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// KPI tile — thin top accent, tinted icon chip. Reads as designed, not flat.
function StatCard({ icon, label, value, sub, accent, chip }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3 p-5 pt-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-fg">{value}</p>
          {sub && <p className="mt-1 text-xs text-subtle">{sub}</p>}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: chip, color: accent }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('mt-0.5 text-xl font-extrabold tabular-nums', tone || 'text-fg')}>{value}</p>
    </div>
  );
}

const ACTION_LABEL = {
  CREATE_SK_ACCOUNT: 'created an SK account', UPDATE_USER: 'updated a member',
  TOGGLE_USER: 'changed account status', RESET_PASSWORD: 'reset a password',
  DELETE_USER: 'removed a member', VERIFY_RESIDENCY: 'verified a resident',
  UNVERIFY_RESIDENCY: 'removed a verification',
};

const ACTIONS = [
  { to: '/admin/announcements', label: 'Post announcement', icon: Megaphone },
  { to: '/admin/meetings', label: 'New event', icon: CalendarPlus },
  { to: '/admin/create-sk', label: 'Create SK account', icon: UserPlus, primary: true },
];

export default function AdminDashboard() {
  const { user } = useAuth();

  const statsQ = useQuery({ queryKey: ['admin', 'stats'], queryFn: async () => (await api.get('/admin/stats')).data.stats });
  const finQ = useQuery({ queryKey: ['finance', 'summary'], queryFn: async () => (await api.get('/finance/summary')).data });
  const logsQ = useQuery({ queryKey: ['admin', 'logs'], queryFn: async () => (await api.get('/admin/logs')).data.logs });
  const todayQ = useQuery({ queryKey: ['today'], queryFn: async () => new Date() });

  const s = statsQ.data || {};
  const fin = finQ.data || {};
  const logs = logsQ.data || [];
  const today = todayQ.data || new Date();

  const totalSex = (s.maleCount || 0) + (s.femaleCount || 0);
  const sexData = [
    { name: 'Male', value: s.maleCount || 0 },
    { name: 'Female', value: s.femaleCount || 0 },
  ].filter((d) => d.value > 0);

  const catRaw = fin.expensesByCategory || [];
  const catData = catRaw.map((c) => ({ name: cap(c.name || c._id || c.category || 'Other'), total: c.total ?? c.amount ?? 0 }));

  const funds = fin.totalFunds ?? 0;
  const spent = fin.totalExpenses ?? 0;
  const balance = fin.balance ?? funds - spent;
  const usedPct = funds > 0 ? Math.min(100, Math.round((spent / funds) * 100)) : 0;

  if (statsQ.isLoading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* compact header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-fg">{greeting(today.getHours())}, {user?.firstName || 'Chairperson'} 👋</h2>
          <p className="mt-1 text-sm text-muted">
            {today.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · Barangay Tawiran
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <Link key={a.to} to={a.to}
              className={cn('inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                a.primary
                  ? 'bg-primary text-primary-fg shadow-sm hover:opacity-90'
                  : 'border border-border bg-surface text-fg hover:bg-surface2')}>
              <a.icon className="h-4 w-4" /> {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total members" value={num(s.totalUsers)} sub={`${num(s.activeUsers)} active`} accent="#6366f1" chip="rgba(99,102,241,0.14)" />
        <StatCard icon={<UserCheck className="h-5 w-5" />} label="Kabataan" value={num(s.kabataanCount)} sub={`${num(s.verifiedCount)} verified`} accent="#3b82f6" chip="rgba(59,130,246,0.14)" />
        <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="SK officials" value={num(s.skOfficialCount)} sub="Council & kagawad" accent="#8b5cf6" chip="rgba(139,92,246,0.14)" />
        <StatCard icon={<Accessibility className="h-5 w-5" />} label="PWD members" value={num(s.pwdCount)} sub="Registered kabataan" accent="#f59e0b" chip="rgba(245,158,11,0.14)" />
      </div>

      {/* treasury + members split */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* treasury */}
        <Card className="lg:col-span-3">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-fg"><Wallet className="h-4 w-4 text-primary" /> Treasury overview</p>
              <Link to="/admin/finance" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                Budget & Finance <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <MiniStat label="Total funds" value={peso(funds)} />
              <span className="h-9 w-px bg-border" />
              <MiniStat label="Total spent" value={peso(spent)} tone="text-rose-500" />
              <span className="h-9 w-px bg-border" />
              <MiniStat label="Balance" value={peso(balance)} tone={balance >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
            </div>

            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted">Budget utilization</span>
                <span className="font-bold text-fg">{usedPct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, background: usedPct > 85 ? '#ef4444' : '#4f46e5' }} />
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
                      <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={42}>
                        {catData.map((d, i) => <Cell key={d.name} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* members by sex */}
        <Card className="lg:col-span-2">
          <CardContent>
            <p className="text-sm font-bold text-fg">Members by sex</p>
            {sexData.length === 0 ? (
              <EmptyState icon={Users} title="No data yet" description="Kabataan records will appear here." />
            ) : (
              <div className="relative mt-2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sexData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                      {sexData.map((d, i) => <Cell key={d.name} fill={i === 0 ? '#3b82f6' : '#f59e0b'} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [num(v), n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-fg">{num(totalSex)}</span>
                  <span className="text-[11px] text-muted">members</span>
                </div>
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-surface2/60 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#3b82f6' }} /> Male</p>
                <p className="mt-0.5 text-lg font-extrabold text-fg">{num(s.maleCount)}</p>
              </div>
              <div className="rounded-xl bg-surface2/60 p-3">
                <p className="inline-flex items-center gap-1.5 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#f59e0b' }} /> Female</p>
                <p className="mt-0.5 text-lg font-extrabold text-fg">{num(s.femaleCount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* recent activity */}
      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-fg"><Activity className="h-4 w-4 text-primary" /> Recent activity</p>
            <Link to="/admin/logs" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Audit trail <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {logsQ.isLoading ? (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-primary" /></div>
          ) : logs.length === 0 ? (
            <EmptyState icon={Activity} title="Nothing yet" description="Actions across the console will show up here." />
          ) : (
            <div className="divide-y divide-border">
              {logs.slice(0, 6).map((l) => (
                <div key={l._id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={`${l.user?.firstName || 'System'} ${l.user?.lastName || ''}`} src={l.user?.photo} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-fg">
                      <b>{l.user?.firstName || 'System'} {l.user?.lastName || ''}</b>{' '}
                      <span className="text-muted">{ACTION_LABEL[l.action] || (l.action || '').toLowerCase().replace(/_/g, ' ')}</span>
                    </p>
                    {l.details && <p className="truncate text-xs text-subtle">{l.details}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-subtle">
                    {new Date(l.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}