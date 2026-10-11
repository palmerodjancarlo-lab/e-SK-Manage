// src/components/layout/NotificationBell.jsx — top-bar bell with the member's notifications
// Polls every minute. When something new arrives it shows a toast and refreshes
// the profile, so a "Verified" status appears without reloading the page.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bell, BellOff, ShieldCheck, ShieldAlert, Info, CheckCheck } from 'lucide-react';
import api from '../../lib/api';
import { cn, timeAgo } from '../../lib/utils';

const TYPE_ICON = {
  RESIDENCY_VERIFIED: { icon: ShieldCheck, tone: 'bg-success/10 text-success' },
  RESIDENCY_UNVERIFIED: { icon: ShieldAlert, tone: 'bg-warning/10 text-warning' },
};

export default function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const latestSeen = useRef(undefined);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
    refetchInterval: 60_000,
  });
  const items = data?.notifications || [];
  const unread = data?.unread || 0;

  // React to notifications that arrive while the page is open
  useEffect(() => {
    if (!data) return;
    const first = data.notifications?.[0];
    const newest = first?._id || null;
    if (latestSeen.current !== undefined && newest && newest !== latestSeen.current && !first.readAt) {
      toast(first.title, { icon: '🔔' });
      qc.invalidateQueries({ queryKey: ['profile'] });
    }
    latestSeen.current = newest;
  }, [data, qc]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const readOne = useMutation({ mutationFn: (id) => api.put(`/notifications/${id}/read`), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => api.put('/notifications/read-all'), onSuccess: refresh });

  const openItem = (n) => {
    if (!n.readAt) readOne.mutate(n._id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-fg"
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-16 z-40 mt-1 animate-fade-up overflow-hidden rounded-2xl border border-border bg-surface shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="font-bold text-fg">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => readAll.mutate()} disabled={readAll.isPending}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary hover:bg-primary/5 disabled:opacity-60">
                <CheckCheck aria-hidden="true" className="h-4 w-4" /> Mark all as read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface2 text-muted"><BellOff aria-hidden="true" className="h-5 w-5" /></span>
              <p className="text-sm font-semibold text-fg">You’re all caught up</p>
              <p className="mt-1 text-xs text-muted">Updates about your account will show up here.</p>
            </div>
          ) : (
            <ul className="max-h-[min(70dvh,26rem)] divide-y divide-border overflow-y-auto">
              {items.map((n) => {
                const meta = TYPE_ICON[n.type] || { icon: Info, tone: 'bg-primary/10 text-primary' };
                const Icon = meta.icon;
                return (
                  <li key={n._id}>
                    <button type="button" onClick={() => openItem(n)}
                      className={cn('flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface2', !n.readAt && 'bg-primary/[0.04]')}>
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.tone)}><Icon aria-hidden="true" className="h-[18px] w-[18px]" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className={cn('flex-1 text-sm text-fg', !n.readAt ? 'font-bold' : 'font-medium')}>{n.title}</span>
                          {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"><span className="sr-only">Unread</span></span>}
                        </span>
                        {n.message && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{n.message}</span>}
                        <time dateTime={n.createdAt} className="mt-1 block text-[11px] text-subtle">{timeAgo(n.createdAt)}</time>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
