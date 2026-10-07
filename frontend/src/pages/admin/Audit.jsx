// src/pages/admin/Audit.jsx — Security & Activity Center (Head Console)
// Tabs show DISTINCT, non-overlapping slices, matched by keyword so they work
// regardless of the exact action strings the backend stores:
//   Audit Records   → budget in & out (funds, expenses) with amounts  [finance]
//   Login History   → registration + sign-in / sign-out               [auth]
//   Activity Monitor→ everything else users do in the system          [activity]
//   Security Alerts → flagged (suspicious / high-risk) — any bucket
// Amount & User are read from real fields, falling back to the details text
// (e.g. "Juan Dela Cruz recorded fund receipt: ₱5000 from ...").
// cspell:words kabataan kagawad UNVERIFY ALLOCAT RECEIV DISBURSE
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, ShieldCheck, ShieldAlert, AlertTriangle, LogIn, LogOut, ScrollText,
  X, ChevronLeft, ChevronRight, Monitor, MapPin, Clock, CheckCircle2,
  Wallet, Activity as ActivityIcon, ArrowDownLeft, ArrowUpRight, FileText, Filter,
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, Avatar } from '../../components/ui';
import { cn, peso } from '../../lib/utils';

// ---- bucketing by keyword (resilient to backend naming) ----
const RX_AUTH = /LOGIN|LOGOUT|SIGN.?IN|SIGN.?OUT|SIGN.?UP|REGISTER|REGISTRATION/i;
const RX_FIN = /FUND|EXPENSE|BUDGET|CASH|DISBURSE|INCOME|PAYMENT|ALLOCAT|RECEIPT|REVENUE/i;
const RX_IN = /FUND|INCOME|ALLOCAT|RECEIV|DEPOSIT|REVENUE|ADD.?FUND/i;
const RX_OUT = /EXPENSE|DISBURSE|PAYMENT|SPEND|WITHDRAW|RELEASE/i;

function bucketOf(action = '') {
  if (RX_AUTH.test(action)) return 'auth';
  if (RX_FIN.test(action)) return 'finance';
  return 'activity';
}
function directionOf(action = '') {
  if (RX_OUT.test(action)) return 'out';
  if (RX_IN.test(action)) return 'in';
  return null;
}
const labelOf = (a = '') => a.toString().replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

// ---- robust amount extraction (real fields → nested boxes → details text) ----
const AMOUNT_KEYS = ['amount', 'total', 'value', 'price', 'cost', 'grandTotal', 'subtotal', 'totalAmount'];
function amountOf(l) {
  const pick = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    for (const k of AMOUNT_KEYS) {
      const v = obj[k];
      if (v != null && v !== '' && !Number.isNaN(Number(v))) return Number(v);
    }
    return null;
  };
  const top = pick(l);
  if (top != null) return top;
  for (const box of [l.meta, l.metadata, l.details, l.data, l.payload, l.changes, l.record]) {
    const v = pick(box);
    if (v != null) return v;
  }
  // fallback: pull the amount out of the details text, e.g. "... ₱5000 from ..."
  if (typeof l.details === 'string') {
    const m = l.details.match(/₱\s?([\d,]+(?:\.\d+)?)/);
    if (m) {
      const n = Number(m[1].replace(/,/g, ''));
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

// ---- robust user name extraction ----
const isObjectId = (s) => typeof s === 'string' && /^[0-9a-f]{24}$/i.test(s);
function nameOf(l) {
  const u = l.user || l.performedBy || l.actor || l.createdBy || l.admin || l.by;
  if (u && typeof u === 'object') {
    const n = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    if (n) return n;
    if (u.name) return u.name;
    if (u.email) return u.email;
  }
  if (typeof u === 'string' && !isObjectId(u)) return u;
  // fallback: details text begins with the actor's full name
  if (typeof l.details === 'string') {
    const m = l.details.match(/^(.+?)\s+(recorded|edited|voided|approved|rejected|created|updated|removed|verified|deleted)/i);
    if (m) return m[1].trim();
  }
  return l.userName || l.performedByName || l.fullName || l.actorName || 'System';
}

// ---- risk ----
const RX_HIGH = /DELETE|REMOVE|VOID/i;
const RX_SUS = /FAIL|RESET_?PASSWORD|DENIED|LOCK/i;
function riskOf(l) {
  const r = (l.riskLevel || l.risk || '').toLowerCase();
  if (r) return r.includes('high') ? 'high' : r.includes('sus') ? 'suspicious' : 'normal';
  if (RX_HIGH.test(l.action || '')) return 'high';
  if (RX_SUS.test(l.action || '')) return 'suspicious';
  return 'normal';
}
const RISK_BADGE = {
  normal: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  suspicious: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  high: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
};
const RISK_LABEL = { normal: 'Normal', suspicious: 'Suspicious', high: 'High Risk' };
const RISK_DOT = { normal: '#10b981', suspicious: '#f59e0b', high: '#ef4444' };

const TABS = [
  { key: 'records', label: 'Audit Records', icon: ScrollText },
  { key: 'logins', label: 'Login History', icon: LogIn },
  { key: 'monitor', label: 'Activity Monitor', icon: ActivityIcon },
  { key: 'alerts', label: 'Security Alerts', icon: AlertTriangle },
];
const DATES = [['1', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['all', 'All time']];

const inputCls = 'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20';
const selectCls = 'rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-fg outline-none focus:border-primary';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '');
const fmtFull = (d) => (d ? `${fmtDate(d)} • ${fmtTime(d)}` : '—');
const shortId = (id) => (id ? `ACT-${String(id).slice(-6).toUpperCase()}` : 'ACT-—');

function Empty({ icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface2 text-muted">{icon}</div>
      <p className="mt-3 text-base font-extrabold text-fg">{title}</p>
      <p className="mt-0.5 text-sm text-muted">{desc}</p>
    </div>
  );
}

function SummaryCard({ icon, label, value, note, accent, chip }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3 p-4 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-fg">{value}</p>
          <p className="mt-0.5 text-[11px] text-subtle">{note}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: chip, color: accent }}>{icon}</div>
      </div>
    </div>
  );
}

function RiskBadge({ risk }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', RISK_BADGE[risk])}>
      {risk === 'high' && <ShieldAlert className="h-3 w-3" />}
      {risk === 'suspicious' && <AlertTriangle className="h-3 w-3" />}
      {RISK_LABEL[risk]}
    </span>
  );
}

export default function SecurityCenter() {
  const [tab, setTab] = useState('records');
  const [q, setQ] = useState('');
  const [range, setRange] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const logsQ = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: async () => {
      const r = await api.get('/admin/logs');
      return r.data?.logs || r.data?.data || (Array.isArray(r.data) ? r.data : []);
    },
  });
  const nowQ = useQuery({ queryKey: ['now'], queryFn: async () => Date.now() });
  const logs = useMemo(() => logsQ.data || [], [logsQ.data]);
  const now = nowQ.data || 0;

  const rows = useMemo(() => logs.map((l) => {
    const bucket = bucketOf(l.action);
    return {
      ...l,
      _label: l.message || l.description || labelOf(l.action),
      _module: l.module || (bucket === 'finance' ? 'Finance' : bucket === 'auth' ? 'Authentication' : 'System'),
      _bucket: bucket,
      _dir: bucket === 'finance' ? directionOf(l.action) : null,
      _amount: amountOf(l),
      _risk: riskOf(l),
      _ip: l.ip || l.ipAddress || '—',
      _device: l.device || l.userAgent || '—',
      _actor: nameOf(l),
      _when: l.createdAt || l.timestamp || l.date,
    };
  }), [logs]);

  const byBucket = useMemo(() => ({
    finance: rows.filter((r) => r._bucket === 'finance'),
    auth: rows.filter((r) => r._bucket === 'auth'),
    activity: rows.filter((r) => r._bucket === 'activity'),
    alerts: rows.filter((r) => r._risk !== 'normal'),
  }), [rows]);

  // distinct action labels for the current tab → powers the action-type filter
  const actionOptions = useMemo(() => {
    const src = tab === 'records' ? byBucket.finance : tab === 'logins' ? byBucket.auth : tab === 'monitor' ? byBucket.activity : [];
    return Array.from(new Set(src.map((r) => r._label))).sort((a, b) => a.localeCompare(b));
  }, [tab, byBucket]);

  const applyFilters = (list) => {
    const t = q.trim().toLowerCase();
    const cutoff = range === 'all' ? 0 : now - Number(range) * 86400000;
    return list.filter((l) => {
      if (actionFilter !== 'all' && l._label !== actionFilter) return false;
      if (cutoff && l._when && new Date(l._when).getTime() < cutoff) return false;
      if (!t) return true;
      return `${l._actor} ${l._label} ${l._module} ${l._ip} ${shortId(l._id)}`.toLowerCase().includes(t);
    });
  };

  const stats = useMemo(() => ({
    finance: byBucket.finance.length,
    auth: byBucket.auth.length,
    activity: byBucket.activity.length,
    flagged: byBucket.alerts.length,
  }), [byBucket]);

  const PER = 12;
  const resetPage = () => setPage(1);
  const switchTab = (k) => { setTab(k); setActionFilter('all'); resetPage(); };
  const paged = (list) => list.slice((page - 1) * PER, page * PER);
  const pageCountOf = (list) => Math.max(1, Math.ceil(list.length / PER));

  const renderPagination = (list) => (list.length > PER ? (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted">Showing {(page - 1) * PER + 1}–{Math.min(page * PER, list.length)} of {list.length}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted disabled:opacity-40 hover:bg-surface2"><ChevronLeft className="h-4 w-4" /></button>
        <span className="px-2 text-xs font-semibold text-fg">{page} / {pageCountOf(list)}</span>
        <button onClick={() => setPage((p) => Math.min(pageCountOf(list), p + 1))} disabled={page >= pageCountOf(list)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted disabled:opacity-40 hover:bg-surface2"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  ) : null);

  if (logsQ.isLoading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-primary" /></div>;

  const financeRows = applyFilters(byBucket.finance);
  const authRows = applyFilters(byBucket.auth);
  const monitorRows = applyFilters(byBucket.activity);
  const alertRows = byBucket.alerts;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-fg">Security &amp; Activity Center</h2>
        <p className="text-sm text-muted">Each tab shows a different, non-overlapping record of what happens in e-SK Manage.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Wallet className="h-5 w-5" />} label="Financial records" value={stats.finance} note="Budget in & out" accent="#10b981" chip="rgba(16,185,129,0.14)" />
        <SummaryCard icon={<LogIn className="h-5 w-5" />} label="Sign-ins logged" value={stats.auth} note="Registration & login" accent="#3b82f6" chip="rgba(59,130,246,0.14)" />
        <SummaryCard icon={<ActivityIcon className="h-5 w-5" />} label="User actions" value={stats.activity} note="System activity" accent="#6366f1" chip="rgba(99,102,241,0.14)" />
        <SummaryCard icon={<ShieldAlert className="h-5 w-5" />} label="Flagged" value={stats.flagged} note="Needs review" accent="#ef4444" chip="rgba(239,68,68,0.12)" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            className={cn('inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition',
              tab === t.key ? 'bg-primary text-primary-fg shadow-sm' : 'border border-border bg-surface text-muted hover:text-fg')}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab !== 'alerts' && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input className={cn(inputCls, 'pl-9')} placeholder="Search user, action, details…" value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} />
          </div>
          {/* action-type filter (separate from time) */}
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <select className={cn(selectCls, 'pl-9')} value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); resetPage(); }}>
              <option value="all">All actions</option>
              {actionOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <select className={selectCls} value={range} onChange={(e) => { setRange(e.target.value); resetPage(); }}>
            {DATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      )}

      {/* AUDIT RECORDS — budget in & out */}
      {tab === 'records' && (
        financeRows.length === 0 ? (
          <Empty icon={<Wallet className="h-6 w-6" />} title="No financial records yet" desc="Funds coming in and expenses going out will appear here once they are recorded." />
        ) : (
          <div className="space-y-4">
            <Card><CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Record ID</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Flow</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">When</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {paged(financeRows).map((l) => (
                    <tr key={l._id} onClick={() => setSelected(l)} className="cursor-pointer transition hover:bg-surface2/50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">{shortId(l._id)}</td>
                      <td className="px-4 py-3 font-semibold text-fg">{l._actor}</td>
                      <td className="px-4 py-3 text-fg">{l._label}</td>
                      <td className="px-4 py-3">
                        {l._dir === 'in' && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><ArrowDownLeft className="h-3 w-3" /> In</span>}
                        {l._dir === 'out' && <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/12 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400"><ArrowUpRight className="h-3 w-3" /> Out</span>}
                        {!l._dir && <span className="text-xs text-subtle">—</span>}
                      </td>
                      <td className={cn('whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums', l._dir === 'out' ? 'text-rose-600 dark:text-rose-400' : l._dir === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-fg')}>
                        {l._amount != null ? `${l._dir === 'out' ? '−' : l._dir === 'in' ? '+' : ''}${peso(l._amount)}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-subtle">{fmtFull(l._when)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
            {renderPagination(financeRows)}
          </div>
        )
      )}

      {/* LOGIN HISTORY — registration + sign-in / sign-out */}
      {tab === 'logins' && (
        authRows.length === 0 ? (
          <Empty icon={<LogIn className="h-6 w-6" />} title="No login records yet" desc="Registrations and sign-ins will appear here once the backend logs auth events." />
        ) : (
          <div className="space-y-4">
            <Card><CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">User</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Date / Time</th><th className="px-4 py-3">IP</th><th className="px-4 py-3">Result</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {paged(authRows).map((l) => (
                    <tr key={l._id} onClick={() => setSelected(l)} className="cursor-pointer hover:bg-surface2/50">
                      <td className="px-4 py-3 font-semibold text-fg">{l._actor}</td>
                      <td className="px-4 py-3 text-fg">{l._label}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-subtle">{fmtFull(l._when)}</td>
                      <td className="px-4 py-3 text-muted">{l._ip}</td>
                      <td className="px-4 py-3">{/FAIL/i.test(l.action || '') ? <span className="text-xs font-bold text-rose-500">Failed</span> : <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Success</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
            {renderPagination(authRows)}
          </div>
        )
      )}

      {/* ACTIVITY MONITOR — everything else */}
      {tab === 'monitor' && (
        monitorRows.length === 0 ? (
          <Empty icon={<ActivityIcon className="h-6 w-6" />} title="No user activity yet" desc="Actions like managing accounts, members, programs and announcements will appear here." />
        ) : (
          <div className="space-y-4">
            <Card><CardContent className="p-0"><div className="divide-y divide-border">
              {paged(monitorRows).map((l) => (
                <button key={l._id} onClick={() => setSelected(l)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface2/50">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: RISK_DOT[l._risk] }} />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface2 text-muted"><FileText className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="text-xs font-bold tabular-nums text-subtle">{fmtTime(l._when)}</span><span className="truncate text-sm font-bold text-fg">{l._actor}</span></div>
                    <p className="truncate text-sm text-fg">{l._label}</p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-subtle sm:block">{fmtDate(l._when)}</span>
                </button>
              ))}
            </div></CardContent></Card>
            {renderPagination(monitorRows)}
          </div>
        )
      )}

      {/* SECURITY ALERTS */}
      {tab === 'alerts' && (
        alertRows.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-6 w-6" /></div>
            <p className="mt-3 text-lg font-extrabold text-fg">All clear</p>
            <p className="text-sm text-muted">No suspicious activity has been detected.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {alertRows.map((l) => (
              <Card key={l._id}>
                <CardContent>
                  <div className="flex items-center justify-between"><RiskBadge risk={l._risk} /><span className="text-xs text-subtle">{fmtTime(l._when)}</span></div>
                  <p className="mt-2 font-bold text-fg">{l._label}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-muted">User: <span className="font-semibold text-fg">{l._actor}</span></p>
                    <p className="text-muted">Area: <span className="text-fg">{l._module}</span></p>
                  </div>
                  <button onClick={() => setSelected(l)} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">View activity</button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="text-sm font-extrabold text-fg">Activity Details</p>
              <button onClick={() => setSelected(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface2"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <RiskBadge risk={selected._risk} />
              <div className="flex items-center gap-3">
                <Avatar name={selected._actor} src={selected.user?.photo} size="md" />
                <div className="min-w-0"><p className="text-sm font-bold text-fg">{selected._actor}</p><p className="text-xs text-muted">{shortId(selected._id)}</p></div>
              </div>
              <dl className="space-y-3 text-sm">
                {[
                  ['Activity', selected._label, <ActivityIcon key="a" className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />],
                  ['Area', selected._module, <ScrollText key="m" className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />],
                  ['Date & Time', fmtFull(selected._when), <Clock key="c" className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />],
                  ...(selected._amount != null ? [['Amount', peso(selected._amount), <Wallet key="w" className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />]] : []),
                  ['IP Address', selected._ip, <MapPin key="i" className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />],
                  ['Device', selected._device, <Monitor key="d" className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />],
                  ['Details', selected.details || '—', <FileText key="dt" className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />],
                ].map(([label, value, ico]) => (
                  <div key={label} className="flex items-start gap-3">
                    {ico}
                    <div className="min-w-0"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt><dd className="text-sm font-medium text-fg">{value}</dd></div>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}