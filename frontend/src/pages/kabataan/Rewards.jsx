import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, Trophy, Gift, TrendingUp, ChevronRight, Crown, Check, Lock, History as HistoryIcon } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, Badge, Avatar, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { cn } from '../../lib/utils';

const LEVEL_SIZE = 100; // points needed per level
const fmt = (d) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

const TABS = [
  { k: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { k: 'rewards', label: 'Rewards', icon: Gift },
  { k: 'history', label: 'History', icon: HistoryIcon },
];

const HEADERS = {
  leaderboard: { title: 'Leaderboard', sub: 'See how you rank among the kabataan of Barangay Tawiran.' },
  rewards: { title: 'Kabataan Rewards', sub: 'Earn points, get rewards, and be more active for your community!' },
  history: { title: 'Points History', sub: 'Every point you’ve earned and redeemed, all in one place.' },
};

function Center() { return <div className="flex justify-center py-12"><Spinner className="h-7 w-7 text-emerald-600" /></div>; }

function StatTile({ icon, value, label, tone }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2 text-center shadow-card">
      <span className={cn('mx-auto flex h-7 w-7 items-center justify-center rounded-lg', tone)}>{icon}</span>
      <p className="mt-1 text-sm font-extrabold leading-tight tabular-nums text-fg">{value}</p>
      <p className="text-[10px] font-medium leading-tight text-muted">{label}</p>
    </div>
  );
}

export default function KabRewards() {
  const { user } = useAuth();
  const [tab, setTab] = useState('leaderboard');

  const points = useQuery({ queryKey: ['my-points'], queryFn: async () => (await api.get('/points/my')).data });
  const rewardsQ = useQuery({ queryKey: ['rewards'], queryFn: async () => (await api.get('/rewards')).data.rewards });
  const board = useQuery({ queryKey: ['leaderboard'], queryFn: async () => (await api.get('/points/leaderboard')).data.leaderboard });
  const profile = useQuery({ queryKey: ['profile'], queryFn: async () => (await api.get('/auth/profile')).data.user });
  const historyQ = useQuery({
    queryKey: ['points-history'],
    queryFn: async () => {
      const list = (await api.get('/points/history')).data.history || [];
      const now = new Date();
      const thisMonth = list
        .filter((h) => h.type !== 'redeemed' && (() => { const d = new Date(h.checkedInAt || h.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })())
        .reduce((s, h) => s + (h.pointsEarned || 0), 0);
      return { list, thisMonth };
    },
  });

  const p = profile.data;
  const balance = points.data?.balance ?? 0;
  const rewards = (rewardsQ.data || []).filter((r) => r.isActive);
  const list = board.data || [];
  const history = historyQ.data?.list || [];
  const thisMonth = historyQ.data?.thisMonth ?? 0;

  const myRank = list.findIndex((u) => u._id === user?._id);
  const rankLabel = myRank >= 0 ? `#${myRank + 1}` : '—';
  const rewardsAvailable = rewards.filter((r) => r.pointsRequired <= balance).length;
  const level = Math.floor(balance / LEVEL_SIZE) + 1;
  const levelProg = Math.round(((balance % LEVEL_SIZE) / LEVEL_SIZE) * 100);
  const toNext = LEVEL_SIZE - (balance % LEVEL_SIZE);

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Kabataan';
  const podium = list.length >= 3 ? [{ u: list[1], place: 2 }, { u: list[0], place: 1 }, { u: list[2], place: 3 }] : null;
  const rows = list.length >= 3 ? list.slice(3) : list;
  const rowStart = list.length >= 3 ? 4 : 1;

  const head = HEADERS[tab];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {/* Header — changes with the active tab */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-teal-500/10">
        <h1 className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100">{head.title}</h1>
        <p className="mt-0.5 text-sm text-emerald-800/80 dark:text-emerald-200/70">{head.sub}</p>
      </div>

      {/* Profile / level card */}
      <Link to="/kabataan/profile">
        <Card className="transition hover:border-emerald-300">
          <CardContent className="flex items-center gap-3">
            <Avatar name={fullName} src={p?.photo} size="lg" className="ring-2 ring-emerald-500/30" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-fg">{fullName}</p>
              <p className="text-xs text-muted">Kabataan Member</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="success">Level {level}</Badge>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${levelProg}%` }} />
                </div>
                <span className="whitespace-nowrap text-[11px] text-subtle">{toNext} to Lv {level + 1}</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-subtle" />
          </CardContent>
        </Card>
      </Link>

      {/* Stat tiles — compact row of 4 */}
      <div className="grid grid-cols-4 gap-2">
        <StatTile icon={<Star className="h-4 w-4" />} value={balance.toLocaleString()} label="Points" tone="bg-amber-500/15 text-amber-500" />
        <StatTile icon={<Trophy className="h-4 w-4" />} value={rankLabel} label="Rank" tone="bg-emerald-500/15 text-emerald-600" />
        <StatTile icon={<Gift className="h-4 w-4" />} value={rewardsAvailable} label="Rewards" tone="bg-rose-500/15 text-rose-500" />
        <StatTile icon={<TrendingUp className="h-4 w-4" />} value={`+${thisMonth}`} label="This Month" tone="bg-sky-500/15 text-sky-500" />
      </div>

      {/* Segmented tabs (won't overflow) */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface2 p-1">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={cn('flex min-w-0 items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition',
              tab === t.k ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted hover:bg-surface hover:text-fg')}>
            <t.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* LEADERBOARD */}
      {tab === 'leaderboard' && (
        board.isLoading ? <Center />
          : list.length === 0 ? <EmptyState icon={Trophy} title="No rankings yet" description="Once verified members earn points, they'll appear here." />
          : (
            <div className="space-y-4">
              {podium && (
                <div className="grid grid-cols-3 items-end gap-2">
                  {podium.map(({ u, place }) => {
                    const first = place === 1;
                    return (
                      <div key={u._id}
                        className={cn('flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center',
                          first ? '-translate-y-2 border-amber-300 bg-amber-50 shadow-card dark:border-amber-500/40 dark:bg-amber-500/10' : 'border-border bg-surface')}>
                        {first && <Crown className="h-5 w-5 text-amber-500" />}
                        <div className="relative">
                          <Avatar name={`${u.firstName} ${u.lastName}`} src={u.photo} size={first ? 'lg' : 'md'} />
                          <span className={cn('absolute -bottom-1 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white', first ? 'bg-amber-500' : 'bg-emerald-600')}>{place}</span>
                        </div>
                        <p className="mt-1 max-w-[72px] truncate text-xs font-bold text-fg">{u.firstName}</p>
                        <p className="text-xs font-bold text-emerald-600">{(u.points ?? 0).toLocaleString()} pts</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <Card><CardContent className="space-y-1">
                {rows.map((u, i) => {
                  const rank = rowStart + i;
                  const isMe = u._id === user?._id;
                  return (
                    <div key={u._id} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5', isMe ? 'bg-emerald-500/10 outline outline-1 outline-emerald-500/30' : 'hover:bg-surface2/60')}>
                      <span className="w-7 text-center text-sm font-bold text-subtle">#{rank}</span>
                      <Avatar name={`${u.firstName} ${u.lastName}`} src={u.photo} size="sm" />
                      <span className="flex-1 truncate text-sm font-bold text-fg">{isMe ? 'You' : `${u.firstName} ${u.lastName}`}</span>
                      <span className="text-sm font-bold text-emerald-600">{(u.points ?? 0).toLocaleString()} pts</span>
                    </div>
                  );
                })}
                {rows.length === 0 && <p className="py-3 text-center text-sm text-muted">Only the top members so far — keep earning to join the list!</p>}
              </CardContent></Card>
            </div>
          )
      )}

      {/* REWARDS */}
      {tab === 'rewards' && (
        rewardsQ.isLoading ? <Center />
          : rewards.length === 0 ? <EmptyState icon={Gift} title="No rewards yet" description="The SK hasn't added rewards. Check back soon." />
          : (
            <div className="grid gap-4 sm:grid-cols-2">
              {rewards.map((r) => {
                const aff = balance >= r.pointsRequired;
                const pct = Math.min(100, Math.round((balance / r.pointsRequired) * 100));
                return (
                  <Card key={r._id} className="overflow-hidden">
                    {r.image ? <img src={r.image} alt={r.title} className="h-32 w-full object-cover" />
                      : <div className="flex h-32 items-center justify-center bg-emerald-500/10 text-emerald-600"><Gift className="h-10 w-10" /></div>}
                    <CardContent>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-fg">{r.title}</h3>
                        <Badge variant="accent"><Star className="h-3 w-3" /> {r.pointsRequired}</Badge>
                      </div>
                      {r.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description}</p>}
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface2">
                        <div className={cn('h-full rounded-full', aff ? 'bg-emerald-500' : 'bg-emerald-500/50')} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-2">
                        {aff ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><Check className="h-3.5 w-3.5" /> You can redeem this!</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-subtle"><Lock className="h-3.5 w-3.5" /> {r.pointsRequired - balance} more points</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        historyQ.isLoading ? <Center />
          : history.length === 0 ? <EmptyState icon={HistoryIcon} title="No points yet" description="Join an event and check in to start earning points." />
          : (
            <Card><CardContent className="space-y-2">
              {history.map((h) => (
                <div key={h._id} className="flex items-center justify-between rounded-xl bg-surface2/60 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', h.type === 'redeemed' ? 'bg-rose-500/12 text-rose-500' : 'bg-emerald-500/12 text-emerald-600')}>
                      {h.type === 'redeemed' ? <Gift className="h-5 w-5" /> : <Star className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-fg">{h.reason || h.meeting?.title || (h.type === 'earned' ? 'Event check-in' : h.type)}</p>
                      <p className="text-xs text-subtle">{fmt(h.checkedInAt || h.createdAt)}</p>
                    </div>
                  </div>
                  <span className={cn('text-base font-bold', h.type === 'redeemed' ? 'text-rose-500' : 'text-emerald-600')}>
                    {h.type === 'redeemed' ? '-' : '+'}{h.pointsEarned}
                  </span>
                </div>
              ))}
            </CardContent></Card>
          )
      )}
    </div>
  );
}