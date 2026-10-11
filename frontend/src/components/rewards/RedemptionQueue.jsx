// Reward pickup queue for SK officers (Head Console + SK Console).
// Requests are listed oldest first — first come, first served. Points were already
// deducted when the member asked; "Claimed" records the hand-over, "Reject" refunds.
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Ticket, Check, X, Search, Inbox } from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Badge, Button, Input, Textarea, Modal, Avatar, Spinner } from '../ui';
import { cn } from '../../lib/utils';

const VIEWS = [
  { k: 'pending', label: 'Waiting' },
  { k: 'claimed', label: 'Claimed' },
  { k: 'rejected', label: 'Rejected' },
  { k: 'cancelled', label: 'Cancelled' },
];
const when = (d) => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function RedemptionQueue() {
  const qc = useQueryClient();
  const [view, setView] = useState('pending');
  const [q, setQ] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const listQ = useQuery({
    queryKey: ['redemptions', view],
    queryFn: async () => (await api.get('/rewards/redemptions', { params: { status: view } })).data.redemptions || [],
    refetchInterval: view === 'pending' ? 30000 : false,
  });
  const waitingQ = useQuery({
    queryKey: ['redemptions', 'pending'],
    queryFn: async () => (await api.get('/rewards/redemptions', { params: { status: 'pending' } })).data.redemptions || [],
    enabled: view !== 'pending',
  });

  const done = () => ['redemptions', 'rewards', 'leaderboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const claimM = useMutation({
    mutationFn: (id) => api.put(`/rewards/redemptions/${id}/claim`),
    onSuccess: (r) => { toast.success(r.data.message || 'Marked as claimed.'); done(); },
    onError: (e) => { toast.error(e.response?.data?.message || 'Could not update.'); done(); },
  });
  const rejectM = useMutation({
    mutationFn: ({ id, text }) => api.put(`/rewards/redemptions/${id}/reject`, { reason: text }),
    onSuccess: (r) => { toast.success(r.data.message || 'Rejected.'); setRejecting(null); setReason(''); done(); },
    onError: (e) => { toast.error(e.response?.data?.message || 'Could not update.'); done(); },
  });

  const rows = useMemo(() => listQ.data || [], [listQ.data]);
  const needle = q.trim().toLowerCase().replace(/^r-?/, '');
  const shown = needle
    ? rows.filter((r) => r.code?.toLowerCase().includes(needle) || `${r.user?.firstName} ${r.user?.lastName}`.toLowerCase().includes(needle) || r.rewardTitle.toLowerCase().includes(needle))
    : rows;
  const waiting = view === 'pending' ? rows.length : (waitingQ.data || []).length;

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-fg">
              <Ticket aria-hidden="true" className="h-5 w-5 text-primary" /> Reward pickups
              {waiting > 0 && <Badge variant="warning">{waiting} waiting</Badge>}
            </h2>
            <p className="mt-0.5 text-sm text-muted">First come, first served. Points are already deducted — mark “Claimed” when you hand the reward over.</p>
          </div>
          <div className="w-full sm:w-60">
            <Input aria-label="Find by code or name" placeholder="Code (R-…) or name" leftIcon={<Search aria-hidden="true" className="h-4 w-4" />} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1 rounded-xl bg-surface2 p-1 sm:inline-flex" role="tablist" aria-label="Request status">
          {VIEWS.map((v) => (
            <button key={v.k} type="button" role="tab" aria-selected={view === v.k} onClick={() => setView(v.k)}
              className={cn('min-h-[36px] flex-1 rounded-lg px-3 text-sm font-semibold transition-colors sm:flex-none',
                view === v.k ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}>{v.label}</button>
          ))}
        </div>

        {listQ.isLoading ? <div className="flex justify-center py-8" role="status"><Spinner className="h-6 w-6 text-primary" /><span className="sr-only">Loading…</span></div>
          : shown.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted"><Inbox aria-hidden="true" className="h-4 w-4" />
              {needle ? 'No request matches that search.' : view === 'pending' ? 'No one is waiting for a reward.' : 'Nothing here yet.'}</p>
          ) : (
            <ol className="mt-3 divide-y divide-border">
              {shown.map((r, i) => {
                const who = `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || 'Member';
                return (
                  <li key={r._id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                    {view === 'pending' && !needle && <span className="w-6 text-center text-sm font-bold tabular-nums text-subtle" aria-label={`Number ${i + 1} in line`}>{i + 1}</span>}
                    <Avatar name={who} src={r.user?.photo} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{who} · {r.rewardTitle}</p>
                      <p className="text-xs text-subtle">
                        {r.points} pts · requested {when(r.createdAt)}
                        {r.handledBy && view !== 'pending' ? ` · ${view === 'cancelled' ? 'by member' : `by ${r.handledBy.firstName}`} ${when(r.handledAt)}` : ''}
                        {r.note ? ` · ${r.note}` : ''}
                      </p>
                    </div>
                    <span className="rounded-md bg-surface2 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-fg">{r.code}</span>
                    {view === 'pending' && (
                      <div className="flex gap-1.5">
                        <Button size="sm" loading={claimM.isPending && claimM.variables === r._id} onClick={() => claimM.mutate(r._id)}><Check className="h-4 w-4" /> Claimed</Button>
                        <Button size="sm" variant="outline" onClick={() => setRejecting(r)} aria-label={`Reject request ${r.code}`}><X className="h-4 w-4" /> Reject</Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
      </CardContent>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject this request?"
        description={rejecting ? `${rejecting.rewardTitle} · ${rejecting.code}. The ${rejecting.points} points go back to the member.` : ''}
        footer={<><Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="danger" disabled={!reason.trim()} loading={rejectM.isPending} onClick={() => rejectM.mutate({ id: rejecting._id, text: reason.trim() })}>Reject and refund</Button></>}>
        <Textarea label="Reason (the member will see this)" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Item no longer available" />
      </Modal>
    </Card>
  );
}
