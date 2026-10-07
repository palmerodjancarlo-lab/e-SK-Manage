import { useQuery } from '@tanstack/react-query';
import { Trophy, Star } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, Badge, Avatar, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/auth-store';
import { cn } from '../../lib/utils';

const MIN_POINTS = 1; // keep in sync with backend MIN_LEADERBOARD_POINTS
const RING = ['ring-yellow-400', 'ring-slate-300', 'ring-amber-600'];
const MEDAL = ['🥇', '🥈', '🥉'];

export default function KabLeaderboard() {
  const { user } = useAuth();
  const board = useQuery({ queryKey: ['leaderboard'], queryFn: async () => (await api.get('/points/leaderboard')).data.leaderboard });
  const profile = useQuery({ queryKey: ['profile'], queryFn: async () => (await api.get('/auth/profile')).data.user });
  const points = useQuery({ queryKey: ['my-points'], queryFn: async () => (await api.get('/points/my')).data });

  const list = board.data || [];
  const hasPodium = list.length >= 3;
  const podium = hasPodium ? [list[1], list[0], list[2]] : []; // 2nd, 1st, 3rd
  const podiumRank = [1, 0, 2];
  const rows = hasPodium ? list.slice(3) : list;
  const rowStart = hasPodium ? 4 : 1;

  const myRank = list.findIndex((u) => u._id === user?._id);
  const verified = profile.data?.idVerified;
  const balance = points.data?.balance ?? 0;

  const note = () => {
    if (board.isLoading || profile.isLoading) return null;
    if (myRank >= 0) return <>You're ranked <b className="text-fg">#{myRank + 1}</b>. Keep joining events to climb!</>;
    if (!verified) return <>Get your <b className="text-fg">residency verified</b> first — only verified kabataan appear here.</>;
    if (balance < MIN_POINTS) return <>You're verified! Now <b className="text-fg">earn points</b> by joining events to appear here.</>;
    return <>You have <b className="text-fg">{balance} points</b> — keep earning to break into the top ranks!</>;
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-fg sm:text-2xl">Leaderboard</h1>

      {board.isLoading ? <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
        : list.length === 0 ? <EmptyState icon={Trophy} title="No rankings yet" description="Once verified members earn points, they'll appear here." />
        : (
          <>
            {hasPodium && (
              <div className="grid grid-cols-3 items-end gap-3">
                {podium.map((u, i) => {
                  const rank = podiumRank[i];
                  const first = rank === 0;
                  return (
                    <div key={u._id} className={cn('relative flex flex-col items-center gap-2 rounded-2xl border bg-surface p-4 shadow-card',
                      first ? '-translate-y-2 border-accent/50' : 'border-border')}>
                      <span className="absolute -top-3 text-2xl">{MEDAL[rank]}</span>
                      <Avatar name={`${u.firstName} ${u.lastName}`} src={u.photo} size={first ? 'lg' : 'md'} className={`ring-4 ${RING[rank]}`} />
                      <p className="truncate text-sm font-bold text-fg">{u.firstName}</p>
                      <Badge variant="accent"><Star className="h-3 w-3" /> {u.points ?? 0}</Badge>
                    </div>
                  );
                })}
              </div>
            )}

            <Card><CardContent className="space-y-1.5">
              {rows.map((u, i) => {
                const rank = rowStart + i;
                const isMe = u._id === user?._id;
                return (
                  <div key={u._id} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5', isMe ? 'bg-primary/10 outline outline-1 outline-primary/30' : 'hover:bg-surface2/60')}>
                    <span className="w-7 text-center text-base font-bold text-subtle">{rank <= 3 ? MEDAL[rank - 1] : rank}</span>
                    <Avatar name={`${u.firstName} ${u.lastName}`} src={u.photo} size="sm" />
                    <span className="flex-1 truncate text-sm font-bold text-fg">{u.firstName} {u.lastName} {isMe && <span className="text-primary">(You)</span>}</span>
                    <Badge variant="accent"><Star className="h-3 w-3" /> {u.points ?? 0}</Badge>
                  </div>
                );
              })}
            </CardContent></Card>
          </>
        )}

      {!board.isLoading && <p className="text-center text-sm text-muted">{note()}</p>}
    </div>
  );
}