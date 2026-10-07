// cspell:words kabataan Tawiran Barangay Kumusta
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Calendar, ShieldAlert, ShieldCheck, ArrowRight, Gift, Trophy, Landmark, Zap, Link2, CalendarClock, Clock, MapPin, Star, HandHeart, ClipboardList, Activity } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, Badge, Button, EmptyState, Modal } from '../../components/ui';
import { useAuth } from '../../context/auth-store';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtDateLong = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
const fmtDT = (d) => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtEvent = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '');
const HERO = { background: 'linear-gradient(135deg,#2f68f0 0%,#1e63c9 45%,#0ea5a5 120%)' };
const srcLabel = (t) => (t === 'meeting' ? 'Event' : t === 'program' ? 'Program' : null);
const metaSummary = (meta) => {
  if (!meta || !meta.kind) return '';
  if (meta.kind === 'meeting') return [fmtDate(meta.date), meta.time, meta.venue].filter(Boolean).join(' · ');
  if (meta.kind === 'program') return [meta.status, meta.startDate ? `Starts ${fmtDate(meta.startDate)}` : ''].filter(Boolean).join(' · ');
  return '';
};

function MetaBlock({ meta }) {
  if (!meta || !meta.kind) return null;
  const rows = [];
  if (meta.kind === 'meeting') {
    if (meta.date) rows.push({ k: 'Date', icon: <Calendar className="h-4 w-4" />, v: fmtEvent(meta.date) });
    if (meta.time) rows.push({ k: 'Time', icon: <Clock className="h-4 w-4" />, v: meta.time });
    if (meta.venue) rows.push({ k: 'Venue', icon: <MapPin className="h-4 w-4" />, v: meta.venue });
    if (meta.points) rows.push({ k: 'Reward', icon: <Star className="h-4 w-4" />, v: `${meta.points} points via QR check-in` });
    if (meta.volunteerRole) rows.push({ k: 'Volunteers', icon: <HandHeart className="h-4 w-4" />, v: meta.volunteerRole });
  } else if (meta.kind === 'program') {
    if (meta.status) rows.push({ k: 'Status', icon: <Activity className="h-4 w-4" />, v: meta.status });
    if (meta.startDate) rows.push({ k: 'Starts', icon: <Calendar className="h-4 w-4" />, v: fmtEvent(meta.startDate) });
  }
  if (!rows.length && !meta.agenda) return null;
  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="text-muted">{r.icon}</span>
              <span className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted">{r.k}</span>
              <span className="flex-1 text-sm font-medium text-fg">{r.v}</span>
            </div>
          ))}
        </div>
      )}
      {meta.agenda && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted"><ClipboardList className="h-3.5 w-3.5" /> Agenda</p>
          <p className="whitespace-pre-wrap rounded-xl bg-surface2/60 p-3 text-sm leading-relaxed text-fg">{meta.agenda}</p>
        </div>
      )}
    </div>
  );
}

function DateBlock({ date }) {
  const d = new Date(date);
  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/12 text-primary">
      <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString('en-PH', { month: 'short' })}</span>
      <span className="text-xl font-bold leading-none">{d.getDate()}</span>
    </div>
  );
}

function AnnDetail({ ann, onClose }) {
  if (!ann) return null;
  const src = srcLabel(ann.sourceType);
  return (
    <Modal open onClose={onClose} size="md" title={ann.title}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{ann.category}</Badge>
          {ann.isPinned && <Badge variant="primary">Pinned</Badge>}
          {src && <Badge variant="info"><Link2 className="h-3 w-3" /> {src}</Badge>}
        </div>
        {ann.content && <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{ann.content}</p>}
        <MetaBlock meta={ann.meta} />
        <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-subtle">
          <CalendarClock className="h-4 w-4" />
          <span>{ann.author ? `Posted by ${ann.author.firstName} ${ann.author.lastName} · ` : ''}{fmtDateLong(ann.createdAt)}</span>
        </div>
      </div>
    </Modal>
  );
}

export default function KabHome() {
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);

  const profile = useQuery({ queryKey: ['profile'], queryFn: async () => (await api.get('/auth/profile')).data.user });
  const points = useQuery({ queryKey: ['my-points'], queryFn: async () => (await api.get('/points/my')).data });
  const rewardsQ = useQuery({ queryKey: ['rewards'], queryFn: async () => (await api.get('/rewards')).data.rewards });
  const announcementsQ = useQuery({ queryKey: ['announcements'], queryFn: async () => (await api.get('/announcements')).data.announcements });
  const meetings = useQuery({
    queryKey: ['sk-meetings'],
    queryFn: async () => {
      const list = (await api.get('/meetings')).data.meetings || [];
      const now = Date.now();
      return list.filter((m) => new Date(m.date).getTime() >= now).slice(0, 4);
    },
  });

  const p = profile.data;
  const balance = points.data?.balance ?? 0;
  const rewards = rewardsQ.data || [];
  const next = rewards.filter((r) => r.isActive && r.pointsRequired > balance).sort((a, b) => a.pointsRequired - b.pointsRequired)[0];
  const toNext = next ? next.pointsRequired - balance : 0;
  const pct = next ? Math.min(100, Math.round((balance / next.pointsRequired) * 100)) : 0;

  // Keep archived (History) posts out of the kabataan feed; show the latest 5.
  const feed = (announcementsQ.data || []).filter((a) => a.category !== 'History').slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Compact points hero */}
      <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-pop sm:p-6" style={HERO}>
        <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-sm opacity-85">Kumusta,</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{user?.firstName || 'Kabataan'}!</h1>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold leading-none tabular-nums">{balance}</span>
              <span className="text-sm opacity-85">points</span>
            </div>
            <Link to="/kabataan/rewards"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-primary transition hover:brightness-95">
              <Gift className="h-4 w-4" /> Redeem <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {next && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs opacity-90">
                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {toNext} pts to next reward</span>
                <span className="tabular-nums">{balance}/{next.pointsRequired}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification */}
      {p && (p.idVerified ? (
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 px-5 py-3.5">
          <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
          <div><p className="text-sm font-semibold text-fg">Verified resident</p><p className="text-xs text-muted">You're confirmed as a youth of Barangay Tawiran.</p></div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold text-fg">{p.idPhoto ? 'Verification pending' : 'Verify your residency'}</p>
              <p className="text-sm text-muted">{p.idPhoto ? 'Your ID is under review by the SK Chairperson.' : 'Scan or upload your ID so the SK can confirm you live in the barangay.'}</p>
            </div>
          </div>
          {!p.idPhoto && <Link to="/kabataan/profile"><Button>Upload ID</Button></Link>}
        </div>
      ))}

      {/* Quick tiles */}
      <div className="grid grid-cols-3 gap-3">
        <QuickTile to="/kabataan/events" icon={<Calendar className="h-5 w-5" />} label="Events" tone="bg-primary/12 text-primary" />
        <QuickTile to="/kabataan/leaderboard" icon={<Trophy className="h-5 w-5" />} label="Ranks" tone="bg-accent/15 text-accent" />
        <QuickTile to="/kabataan/sk" icon={<Landmark className="h-5 w-5" />} label="Our SK" tone="bg-info/12 text-info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-fg"><Calendar className="h-4 w-4 text-primary" /> Upcoming events</h2>
              <Link to="/kabataan/events" className="text-sm font-semibold text-primary hover:underline">See all</Link>
            </div>
            <div className="space-y-3">
              {meetings.isLoading ? <Spinner className="mx-auto h-6 w-6 text-primary" />
                : (meetings.data || []).length === 0 ? <p className="py-4 text-center text-sm text-muted">No upcoming events yet.</p>
                : meetings.data.map((m) => (
                  <div key={m._id} className="flex items-center gap-3 rounded-xl bg-surface2/60 p-3">
                    <DateBlock date={m.date} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><Badge variant="primary">{m.type}</Badge><span className="text-xs font-semibold text-accent">+{m.pointsReward ?? 10} pts</span></div>
                      <p className="mt-0.5 truncate font-semibold text-fg">{m.title}</p>
                      <p className="truncate text-xs text-muted">{fmtDT(m.date)}{m.location ? ` · ${m.location}` : ''}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-fg"><Megaphone className="h-4 w-4 text-accent" /> Announcements</h2>
            </div>
            <div className="space-y-3">
              {announcementsQ.isLoading ? <Spinner className="mx-auto h-6 w-6 text-primary" />
                : feed.length === 0 ? <EmptyState icon={Megaphone} title="Nothing yet" description="Check back soon." />
                : feed.map((a) => (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => setDetail(a)}
                    className="w-full rounded-xl bg-surface2/60 p-3 text-left transition hover:bg-surface2"
                  >
                    <div className="mb-1 flex items-center gap-2"><Badge variant="accent">{a.category}</Badge>{a.isPinned && <Badge variant="primary">Pinned</Badge>}</div>
                    <p className="font-semibold text-fg">{a.title}</p>
                    <p className="line-clamp-2 text-sm text-muted">{a.content}</p>
                    {metaSummary(a.meta) && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <Calendar className="h-3.5 w-3.5" /> {metaSummary(a.meta)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-subtle">{fmtDate(a.createdAt)}</p>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <AnnDetail ann={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function QuickTile({ to, icon, label, tone }) {
  return (
    <Link to={to}>
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary/40">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
        <span className="text-sm font-semibold text-fg">{label}</span>
      </div>
    </Link>
  );
}