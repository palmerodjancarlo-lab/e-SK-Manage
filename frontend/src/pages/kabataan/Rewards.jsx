// src/pages/kabataan/Rewards.jsx — points, rewards catalogue, leaderboard and history
// Redeeming: request → points deducted and one item reserved (first come, first served)
// → pick it up from an SK officer with the code. Cancelling a waiting request refunds it.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Star, Trophy, Gift, TrendingUp, Crown, Check, Lock, History as HistoryIcon, Package, CalendarCheck, Medal, Ticket, Clock, ShieldAlert, Hourglass } from 'lucide-react';
import api from '../../lib/api';
import HeldPointsNote from '../../components/points/HeldPointsNote';
import { Card, CardContent, Spinner, Avatar, EmptyState, PageHeader, AnimatedNumber, Button, Modal, Badge } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { cn } from '../../lib/utils';

const LEVEL_SIZE = 100; // points needed per level
const fmt = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

const REQ_STATUS = {
  pending: { label: 'Waiting for pickup', tone: 'warning' },
  claimed: { label: 'Claimed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'default' },
  rejected: { label: 'Not approved', tone: 'danger' },
};

const TABS = [
  { k: 'rewards', label: 'Rewards', icon: Gift },
  { k: 'leaderboard', label: 'Leaderboard', short: 'Ranks', icon: Trophy },
  { k: 'history', label: 'History', icon: HistoryIcon },
];

function Center() { return <div className="flex justify-center py-12" role="status"><Spinner className="h-7 w-7 text-primary" /><span className="sr-only">Loading…</span></div>; }

function HeroStat({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-border bg-surface2/50 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted"><Icon aria-hidden="true" className="h-3.5 w-3.5 text-primary" />{label}</p>
      <p className="mt-0.5 text-xl font-extrabold tabular-nums text-fg">{value}</p>
    </div>
  );
}

// Podium place: medal colour + the number, never colour alone
const PLACE = {
  1: { ring: 'border-primary/40 bg-surface shadow-card', medal: 'bg-gold text-[#0F2740]', lift: 'sm:-translate-y-3' },
  2: { ring: 'border-border bg-surface', medal: 'bg-slate-300 text-slate-900', lift: '' },
  3: { ring: 'border-border bg-surface', medal: 'bg-orange-300 text-orange-950', lift: '' },
};

export default function KabRewards() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [confirm, setConfirm] = useState(null); // reward being redeemed
  const [tab, setTab] = useState(() => (TABS.some((t) => t.k === params.get('tab')) ? params.get('tab') : 'rewards'));

  const points = useQuery({ queryKey: ['my-points'], queryFn: async () => (await api.get('/points/my')).data });
  const rewardsQ = useQuery({ queryKey: ['rewards'], queryFn: async () => (await api.get('/rewards')).data.rewards });
  const board = useQuery({ queryKey: ['leaderboard'], queryFn: async () => (await api.get('/points/leaderboard')).data.leaderboard });
  const profile = useQuery({ queryKey: ['profile'], queryFn: async () => (await api.get('/auth/profile')).data.user });
  const requestsQ = useQuery({ queryKey: ['my-redemptions'], queryFn: async () => (await api.get('/rewards/redemptions/mine')).data.redemptions || [] });
  const afterChange = () => ['my-points', 'rewards', 'points-history', 'my-redemptions', 'profile'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const redeemM = useMutation({
    mutationFn: (id) => api.post(`/rewards/${id}/redeem`),
    onSuccess: (r) => { toast.success(r.data.message || 'Request sent.', { duration: 6000 }); setConfirm(null); afterChange(); },
    onError: (e) => { toast.error(e.response?.data?.message || 'Could not send the request.'); afterChange(); },
  });
  const cancelM = useMutation({
    mutationFn: (id) => api.put(`/rewards/redemptions/${id}/cancel`),
    onSuccess: (r) => { toast.success(r.data.message || 'Request cancelled.'); afterChange(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not cancel.'),
  });
  const historyQ = useQuery({
    queryKey: ['points-history'],
    queryFn: async () => {
      const list = (await api.get('/points/history')).data.history || [];
      const now = new Date();
      const thisMonth = list
        .filter((h) => (h.type === 'earned' || h.type === 'awarded') && (() => { const d = new Date(h.checkedInAt || h.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })())
        .reduce((s, h) => s + (h.pointsEarned || 0), 0);
      return { list, thisMonth };
    },
  });

  const p = profile.data;
  const balance = points.data?.balance ?? 0;
  const rewards = (rewardsQ.data || []).filter((r) => r.isActive).sort((a, b) => a.pointsRequired - b.pointsRequired);
  const list = board.data || [];
  const history = historyQ.data?.list || [];
  const thisMonth = historyQ.data?.thisMonth ?? 0;
  const requests = requestsQ.data || [];
  const waitingFor = new Set(requests.filter((r) => r.status === 'pending').map((r) => String(r.reward)));
  const shownRequests = requests.filter((r, i) => r.status === 'pending' || i < 5);
  const verified = !!p?.idVerified;
  const rewardsAvailable = rewards.filter((r) => r.pointsRequired <= balance && r.stock !== 0 && !waitingFor.has(r._id)).length;

  const myRank = list.findIndex((u) => u._id === user?._id);
  const level = Math.floor(balance / LEVEL_SIZE) + 1;
  const levelProg = Math.round(((balance % LEVEL_SIZE) / LEVEL_SIZE) * 100);
  const toNext = LEVEL_SIZE - (balance % LEVEL_SIZE);

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Kabataan';
  const podium = list.length >= 3 ? [{ u: list[1], place: 2 }, { u: list[0], place: 1 }, { u: list[2], place: 3 }] : null;
  const rows = list.length >= 3 ? list.slice(3) : list;
  const rowStart = list.length >= 3 ? 4 : 1;

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title="Points & Rewards" description="Join events to earn points, then claim rewards from your SK." />

      {/* You — level + stats */}
      <Card>
        <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center">
          <Link to="/kabataan/profile?tab=activity" className="flex items-center gap-4 rounded-xl">
            <Avatar name={fullName} src={p?.photo} size="xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-bold text-fg">{fullName}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"><Medal aria-hidden="true" className="h-3.5 w-3.5" /> Level {level}</span>
                <span className="text-muted">{toNext} pts to level {level + 1}</span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={levelProg} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to level ${level + 1}`}>
                <div className="h-full rounded-full bg-primary" style={{ width: `${levelProg}%` }} />
              </div>
            </div>
          </Link>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat icon={Star} label="Points" value={<AnimatedNumber value={balance} />} />
            <HeroStat icon={Trophy} label="Your rank" value={myRank >= 0 ? `#${myRank + 1}` : '—'} />
            <HeroStat icon={Gift} label="Can claim" value={rewardsAvailable} />
            <HeroStat icon={TrendingUp} label="This month" value={`+${thisMonth}`} />
          </div>
        </CardContent>
      </Card>

      <HeldPointsNote held={points.data?.held} />

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface2 p-1 sm:inline-flex" role="tablist" aria-label="Points and rewards">
        {TABS.map((t) => (
          <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
            className={cn('inline-flex min-h-[40px] min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm sm:px-4 font-semibold transition-colors sm:flex-none',
              tab === t.k ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}>
            <t.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate sm:hidden">{t.short || t.label}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* REWARDS */}
      {tab === 'rewards' && shownRequests.length > 0 && (
        <Card>
          <CardContent>
            <h2 className="flex items-center gap-2 font-bold text-fg"><Ticket aria-hidden="true" className="h-5 w-5 text-primary" /> Your requests</h2>
            <p className="mt-0.5 text-sm text-muted">Show the code to an SK officer when you pick up your reward.</p>
            <ul className="mt-3 divide-y divide-border">
              {shownRequests.map((r) => {
                const st = REQ_STATUS[r.status] || REQ_STATUS.pending;
                return (
                  <li key={r._id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{r.rewardTitle}</p>
                      <p className="text-xs text-subtle">{fmt(r.createdAt)} · {r.points} pts{r.status === 'rejected' && r.note ? ` · ${r.note}` : ''}</p>
                    </div>
                    {r.status === 'pending' && <span className="rounded-lg border border-dashed border-primary/50 bg-primary/5 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-primary" aria-label={`Pickup code ${r.code}`}>{r.code}</span>}
                    <Badge variant={st.tone}>{st.label}</Badge>
                    {r.status === 'pending' && (
                      <Button size="sm" variant="outline" loading={cancelM.isPending && cancelM.variables === r._id} onClick={() => cancelM.mutate(r._id)}>Cancel</Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {tab === 'rewards' && (
        rewardsQ.isLoading ? <Center />
          : rewards.length === 0 ? <EmptyState icon={Gift} title="No rewards yet" description="The SK hasn't added rewards. Check back soon." />
          : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rewards.map((r, i) => {
                const aff = balance >= r.pointsRequired;
                const out = r.stock === 0;
                const pct = Math.min(100, Math.round((balance / r.pointsRequired) * 100));
                return (
                  <Card key={r._id} className={cn('flex animate-fade-up flex-col overflow-hidden transition-shadow hover:shadow-pop', aff && !out && 'border-success/40')} style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="relative">
                      {r.image ? <img src={r.image} alt="" loading="lazy" className="h-36 w-full object-cover" />
                        : <div className="flex h-32 items-center justify-center bg-surface2/70 text-primary"><Gift aria-hidden="true" className="h-10 w-10" /></div>}
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-sm font-bold text-fg shadow-card ring-1 ring-border">
                        <Star aria-hidden="true" className="h-3.5 w-3.5 fill-current text-accent" /> {r.pointsRequired} pts
                      </span>
                    </div>
                    <CardContent className="flex flex-1 flex-col">
                      <h3 className="font-bold text-fg">{r.title}</h3>
                      {r.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description}</p>}
                      {r.stock > 0 && <p className="mt-1 flex items-center gap-1 text-xs text-subtle"><Package aria-hidden="true" className="h-3.5 w-3.5" /> {r.stock} left</p>}
                      <div className="mt-auto pt-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
                          <div className={cn('h-full rounded-full', aff ? 'bg-success' : 'bg-primary')} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-2 text-xs">
                          {out ? <span className="inline-flex items-center gap-1 font-semibold text-subtle"><Lock aria-hidden="true" className="h-3.5 w-3.5" /> Out of stock</span>
                            : waitingFor.has(r._id) ? <span className="inline-flex items-center gap-1 font-semibold text-warning"><Clock aria-hidden="true" className="h-3.5 w-3.5" /> Requested — waiting for pickup</span>
                            : aff ? <span className="inline-flex items-center gap-1 font-bold text-success"><Check aria-hidden="true" className="h-3.5 w-3.5" /> You have enough points</span>
                            : <span className="inline-flex items-center gap-1 text-muted"><Lock aria-hidden="true" className="h-3.5 w-3.5" /> {r.pointsRequired - balance} more points to go</span>}
                        </p>
                        {aff && !out && !waitingFor.has(r._id) && (
                          verified
                            ? <Button className="mt-3 w-full" onClick={() => setConfirm(r)}><Gift className="h-4 w-4" /> Redeem</Button>
                            : <Link to="/kabataan/profile?tab=residency" className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-warning hover:underline"><ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" /> Get your residency verified to redeem</Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
      )}

      {/* LEADERBOARD */}
      {tab === 'leaderboard' && (
        board.isLoading ? <Center />
          : list.length === 0 ? <EmptyState icon={Trophy} title="No rankings yet" description="Once verified members earn points, they'll appear here." />
          : (
            <div className="mx-auto max-w-3xl space-y-4">
              {podium && (
                <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Top three">
                  {podium.map(({ u, place }) => {
                    const st = PLACE[place];
                    const isMe = u._id === user?._id;
                    return (
                      <li key={u._id} className={cn('flex flex-col items-center rounded-2xl border p-3 text-center sm:p-4', st.ring, st.lift)}>
                        <span className="mb-2 flex items-center gap-1">
                          {place === 1 && <Crown aria-hidden="true" className="h-4 w-4 text-accent" />}
                          <span className={cn('flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-extrabold', st.medal)}>
                            <span className="sr-only">Place </span>{place}
                          </span>
                        </span>
                        <Avatar name={`${u.firstName} ${u.lastName}`} src={u.photo} size={place === 1 ? 'xl' : 'lg'} />
                        <p className="mt-2 w-full truncate text-sm font-bold text-fg">{isMe ? 'You' : u.firstName}</p>
                        <p className="inline-flex items-center gap-1 text-xs font-bold text-accent"><Star aria-hidden="true" className="h-3 w-3" />{(u.points ?? 0).toLocaleString()}</p>
                      </li>
                    );
                  })}
                </ol>
              )}

              {rows.length > 0 && (
                <Card><CardContent className="p-2 sm:p-3">
                  <ol start={rowStart} className="divide-y divide-border">
                    {rows.map((u, i) => {
                      const isMe = u._id === user?._id;
                      return (
                        <li key={u._id} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5', isMe && 'bg-primary/10')}>
                          <span className="w-8 text-center text-sm font-bold tabular-nums text-subtle">#{rowStart + i}</span>
                          <Avatar name={`${u.firstName} ${u.lastName}`} src={u.photo} size="sm" />
                          <span className={cn('flex-1 truncate text-sm font-semibold', isMe ? 'text-primary' : 'text-fg')}>{isMe ? 'You' : `${u.firstName} ${u.lastName}`}</span>
                          <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums text-accent"><Star aria-hidden="true" className="h-3.5 w-3.5" />{(u.points ?? 0).toLocaleString()}</span>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent></Card>
              )}
              {myRank < 0 && <p className="text-center text-sm text-muted">You're not on the board yet — check in at an event to start climbing.</p>}
            </div>
          )
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        historyQ.isLoading ? <Center />
          : history.length === 0 ? <EmptyState icon={HistoryIcon} title="No points yet" description="Join an event and check in to start earning points." />
          : (
            <Card className="mx-auto max-w-3xl"><CardContent className="p-2 sm:p-3">
              <ul className="divide-y divide-border">
                {history.map((h) => {
                  const redeemed = h.type === 'redeemed';
                  const waiting = h.type === 'held';
                  const pts = Math.abs(h.pointsEarned ?? h.points ?? 0);
                  return (
                    <li key={h._id} className="flex items-center gap-3 px-3 py-3">
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', redeemed ? 'bg-danger/10 text-danger' : waiting ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success')}>
                        {redeemed ? <Gift aria-hidden="true" className="h-5 w-5" /> : waiting ? <Hourglass aria-hidden="true" className="h-5 w-5" /> : <CalendarCheck aria-hidden="true" className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">{h.reason || h.meeting?.title || (h.type === 'earned' ? 'Event check-in' : h.type)}</p>
                        <p className="text-xs text-subtle">{fmt(h.checkedInAt || h.createdAt)} · {redeemed ? 'Redeemed' : waiting ? 'Waiting for residency verification' : 'Earned'}</p>
                      </div>
                      <span className={cn('shrink-0 text-base font-bold tabular-nums', redeemed ? 'text-danger' : waiting ? 'text-warning' : 'text-success')}>
                        {redeemed ? '−' : '+'}{pts}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent></Card>
          )
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={`Redeem ${confirm?.title || ''}?`}
        footer={<><Button variant="outline" onClick={() => setConfirm(null)}>Not now</Button>
          <Button loading={redeemM.isPending} onClick={() => redeemM.mutate(confirm._id)}>Redeem for {confirm?.pointsRequired} pts</Button></>}>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex gap-2"><Star aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {confirm?.pointsRequired} points are deducted now — you'll have {balance - (confirm?.pointsRequired || 0)} left.</li>
          <li className="flex gap-2"><Package aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> One item is set aside for you. Requests are served first come, first served.</li>
          <li className="flex gap-2"><Ticket aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Pick it up from an SK officer and show your code. Changed your mind? Cancel before pickup to get your points back.</li>
        </ul>
      </Modal>
    </div>
  );
}
