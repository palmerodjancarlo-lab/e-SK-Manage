// cspell:words kabataan Tawiran Barangay Kumusta
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Calendar, ShieldAlert, ShieldCheck, ArrowRight, Gift, Landmark, Zap, Link2, CalendarClock, Clock, MapPin, Star, HandHeart, ClipboardList, Activity, QrCode, Pin, ChevronRight, CalendarCheck, Hourglass } from 'lucide-react';
import api from '../../lib/api';
import { statusLabel } from '../../lib/programs';
import { Card, CardContent, Spinner, Badge, Button, EmptyState, Modal, AnimatedNumber, Avatar } from '../../components/ui';
import DateTile from '../../components/events/DateTile';
import { useAuth } from '../../context/auth-store';
import { hasSubmittedId } from '../../lib/residency';
import { cn, timeAgo } from '../../lib/utils';
import { eventTime, isPastEvent } from '../../lib/events';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtDateLong = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
const fmtEvent = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '');
const srcLabel = (t) => (t === 'meeting' ? 'Event' : t === 'program' ? 'Program' : null);
const metaSummary = (meta) => {
  if (!meta || !meta.kind) return '';
  if (meta.kind === 'meeting') return [fmtDate(meta.date), meta.time, meta.venue].filter(Boolean).join(' · ');
  if (meta.kind === 'program') return [meta.status && `Status: ${statusLabel(meta.status)}`, meta.startDate ? `Starts ${fmtDate(meta.startDate)}` : ''].filter(Boolean).join(' · ');
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
    if (meta.status) rows.push({ k: 'Status', icon: <Activity className="h-4 w-4" />, v: statusLabel(meta.status) });
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

function AnnDetail({ ann, onClose }) {
  if (!ann) return null;
  const src = srcLabel(ann.sourceType);
  return (
    <Modal open onClose={onClose} size="md" title={ann.title}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{ann.category}</Badge>
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

// The four things members come here to do — white tiles, SK blue icons
const ACTIONS = [
  { to: '/kabataan/events?scan=1', label: 'Scan to check in', hint: 'Earn points at the venue', icon: QrCode },
  { to: '/kabataan/events', label: 'Events', hint: 'RSVP and volunteer', icon: Calendar },
  { to: '/kabataan/rewards', label: 'Rewards', hint: 'Use your points', icon: Gift },
  { to: '/kabataan/sk', label: 'Our SK', hint: 'Meet your council', icon: Landmark },
];

function ActionTile({ to, label, hint, icon }) {
  const Icon = icon;
  return (
    <Link to={to}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors duration-150 hover:border-primary/40 hover:bg-primary/[0.03] sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-fg sm:truncate">{label}</span>
        <span className="block text-xs text-muted sm:truncate">{hint}</span>
      </span>
      <ChevronRight aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}

function NextEvent({ m, userId }) {
  const going = (m.rsvp || []).some((x) => (x.user?._id || x.user || x) === userId);
  const venue = m.venue || m.location;
  return (
    <div className="flex gap-3 sm:gap-4">
      <DateTile date={m.date} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-surface2 px-2 py-0.5 text-xs font-semibold text-muted">{m.type}</span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-accent"><Star aria-hidden="true" className="h-3.5 w-3.5 fill-current" /> +{m.pointsReward ?? 10} pts</span>
          {going && <Badge variant="primary"><CalendarCheck className="h-3 w-3" /> You're going</Badge>}
        </div>
        <h3 className="mt-1.5 text-lg font-bold text-fg">{m.title}</h3>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock aria-hidden="true" className="h-4 w-4 text-subtle" />{eventTime(m)}</span>
          {venue && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-subtle" /><span className="truncate">{venue}</span></span>}
        </div>
        {m.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{m.description}</p>}
        {m.needsVolunteers && <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><HandHeart aria-hidden="true" className="h-3.5 w-3.5" /> Volunteers needed</p>}
      </div>
    </div>
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
      return list.filter((m) => !isPastEvent(m, now)).sort((x, y) => new Date(x.date) - new Date(y.date)).slice(0, 4);
    },
  });

  const p = profile.data;
  const balance = points.data?.balance ?? 0;
  const rewards = rewardsQ.data || [];
  const next = rewards.filter((r) => r.isActive && r.pointsRequired > balance).sort((a, b) => a.pointsRequired - b.pointsRequired)[0];
  const affordable = rewards.filter((r) => r.isActive && r.pointsRequired <= balance && r.stock !== 0).length;
  const toNext = next ? next.pointsRequired - balance : 0;
  const pct = next ? Math.min(100, Math.round((balance / next.pointsRequired) * 100)) : 100;
  const events = meetings.data || [];

  // Keep archived (History) posts out of the kabataan feed; pinned first, latest 5.
  const feed = (announcementsQ.data || []).filter((a) => a.category !== 'History')
    .sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome + points */}
      <Card>
        <CardContent className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:items-center">
          <div className="flex items-center gap-4">
            <Avatar name={`${user?.firstName || ''} ${user?.lastName || ''}`} src={p?.photo || user?.photo} size="lg" className="hidden sm:inline-flex" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-fg sm:text-3xl">Kumusta, {user?.firstName || 'Kabataan'}!</h1>
              <p className="mt-1 text-sm text-muted">
                {events.length ? `${events.length} upcoming ${events.length === 1 ? 'event' : 'events'} — join one to earn points.` : 'Watch this space for the next SK event.'}
              </p>
              {p?.idVerified && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                  <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" /> Verified resident
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface2/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your points</p>
                <p className="mt-0.5 flex items-center gap-1.5">
                  <Star aria-hidden="true" className="h-6 w-6 fill-current text-accent" />
                  <span className="text-3xl font-extrabold leading-none tabular-nums text-fg"><AnimatedNumber value={balance} /></span>
                </p>
              </div>
              <Link to="/kabataan/rewards"><Button size="sm"><Gift className="h-4 w-4" /> Rewards <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-muted">
                <span className="flex min-w-0 items-center gap-1"><Zap aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span className="truncate">{next ? `${toNext} more for ${next.title}` : affordable ? `You can claim ${affordable} reward${affordable === 1 ? '' : 's'}` : 'Join events to earn more'}</span>
                </span>
                {next && <span className="shrink-0 tabular-nums">{balance}/{next.pointsRequired}</span>}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next reward">
                <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification call to action (only when it still needs doing) */}
      {p && !p.idVerified && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning"><ShieldAlert aria-hidden="true" className="h-5 w-5" /></span>
            <div>
              <p className="font-semibold text-fg">{hasSubmittedId(p) ? 'Verification pending' : 'Verify your residency'}</p>
              <p className="text-sm text-muted">{hasSubmittedId(p) ? 'Your ID is with the SK Chairperson. You’ll get a notification once it’s reviewed.' : 'Upload any valid ID or proof of residency so the SK can confirm you live in the barangay.'}</p>
              {points.data?.held > 0 && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-fg">
                  <Hourglass aria-hidden="true" className="h-4 w-4 text-warning" /> {points.data.held} points from your check-ins are waiting — they’re added once you’re verified.
                </p>
              )}
            </div>
          </div>
          {!hasSubmittedId(p) && <Link to="/kabataan/profile?tab=residency"><Button>Upload ID</Button></Link>}
        </div>
      )}

      {/* Shortcuts */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {ACTIONS.map((a) => <ActionTile key={a.label} {...a} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-5 [&>*]:min-w-0">
        {/* Events */}
        <Card className="lg:col-span-3">
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-fg"><CalendarClock aria-hidden="true" className="h-4 w-4 text-primary" /> Next up</h2>
              <Link to="/kabataan/events" className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-1.5 text-sm font-semibold text-primary hover:bg-primary/5">All events <ChevronRight aria-hidden="true" className="h-4 w-4" /></Link>
            </div>
            {meetings.isLoading ? <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-primary" /></div>
              : events.length === 0 ? <EmptyState icon={Calendar} title="No upcoming events yet" description="New SK events will show up here." />
              : (
                <>
                  <Link to="/kabataan/events" className="block rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
                    <NextEvent m={events[0]} userId={user?._id} />
                  </Link>
                  {events.length > 1 && (
                    <ul className="mt-3 divide-y divide-border">
                      {events.slice(1).map((m) => (
                        <li key={m._id}>
                          <Link to="/kabataan/events" className="flex items-center gap-3 rounded-lg py-3 transition-colors hover:bg-surface2/60">
                            <DateTile date={m.date} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-fg">{m.title}</p>
                              <p className="truncate text-xs text-muted">{eventTime(m)}{(m.venue || m.location) ? ` · ${m.venue || m.location}` : ''}</p>
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-accent"><Star aria-hidden="true" className="h-3.5 w-3.5 fill-current" />+{m.pointsReward ?? 10}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="lg:col-span-2">
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-fg"><Megaphone aria-hidden="true" className="h-4 w-4 text-primary" /> Announcements</h2>
            </div>
            {announcementsQ.isLoading ? <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-primary" /></div>
              : feed.length === 0 ? <EmptyState icon={Megaphone} title="Nothing yet" description="News from the SK will appear here." />
              : (
                <ul className="space-y-2">
                  {feed.map((a) => (
                    <li key={a._id}>
                      <button type="button" onClick={() => setDetail(a)}
                        className={cn('w-full rounded-xl border p-3 text-left transition-colors hover:bg-surface2/60',
                          a.isPinned ? 'border-primary/30' : 'border-border')}>
                        <div className="mb-1 flex items-center gap-2 text-xs">
                          <span className="font-semibold text-primary">{a.category}</span>
                          {a.isPinned && <span className="inline-flex items-center gap-0.5 font-semibold text-primary"><Pin aria-hidden="true" className="h-3 w-3" /> Pinned</span>}
                          <time dateTime={a.createdAt} className="ml-auto text-subtle">{timeAgo(a.createdAt)}</time>
                        </div>
                        <p className="font-semibold text-fg">{a.title}</p>
                        <p className="line-clamp-2 text-sm text-muted">{a.content}</p>
                        {metaSummary(a.meta) && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <Calendar aria-hidden="true" className="h-3.5 w-3.5" /> {metaSummary(a.meta)}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </CardContent>
        </Card>
      </div>

      <AnnDetail ann={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
