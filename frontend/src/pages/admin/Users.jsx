// src/pages/admin/Users.jsx — All Members (Head Console)
// cspell:words kabataan kagawad Tawiran
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Search, ShieldCheck, ShieldAlert, KeyRound, Power, Trash2, BadgeCheck,
  X, Mail, Phone, MapPin,
} from 'lucide-react';
import api from '../../lib/api';
import { Card, CardContent, Spinner, Avatar, EmptyState, Modal, Button } from '../../components/ui';
import { cn } from '../../lib/utils';

const ROLE_META = {
  all: { label: 'Everyone' },
  kabataan: { label: 'Kabataan' },
  sk_chairperson: { label: 'Chairperson' },
  sk_secretary: { label: 'Secretary' },
  sk_treasurer: { label: 'Treasurer' },
  sk_kagawad: { label: 'Kagawad' },
};
const ROLE_TABS = ['all', 'kabataan', 'sk_chairperson', 'sk_secretary', 'sk_treasurer', 'sk_kagawad'];
const roleName = (r) => ROLE_META[r]?.label || (r || '').replace('sk_', 'SK ');

const inputCls =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

function Pill({ tone, children }) {
  const map = {
    green: 'bg-success/12 text-success',
    amber: 'bg-warning/12 text-warning',
    gray: 'bg-surface2 text-muted',
    red: 'bg-danger/12 text-danger',
    blue: 'bg-info/12 text-info',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', map[tone])}>{children}</span>;
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const [role, setRole] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [pwFor, setPwFor] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [delFor, setDelFor] = useState(null);

  const usersQ = useQuery({
    queryKey: ['admin', 'users', role],
    queryFn: async () => (await api.get('/admin/users', { params: role === 'all' ? {} : { role } })).data.users,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  const verifyM = useMutation({
    mutationFn: ({ id, verified }) => api.put(`/admin/users/${id}/verify`, { verified }),
    onSuccess: (_d, v) => { toast.success(v.verified ? 'Resident verified.' : 'Verification removed.'); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed.'),
  });
  const toggleM = useMutation({
    mutationFn: (id) => api.put(`/admin/users/${id}/toggle`),
    onSuccess: (r) => { toast.success(r?.data?.message || 'Updated.'); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed.'),
  });
  const resetM = useMutation({
    mutationFn: ({ id, newPassword }) => api.put(`/admin/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => { toast.success('Password reset.'); setPwFor(null); setNewPw(''); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed.'),
  });
  const deleteM = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success('Member removed.'); setDelFor(null); setSelected(null); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed.'),
  });

  const list = useMemo(() => usersQ.data || [], [usersQ.data]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(t));
  }, [list, q]);

  const counts = useMemo(() => {
    const c = { all: list.length };
    for (const u of list) c[u.role] = (c[u.role] || 0) + 1;
    return c;
  }, [list]);

  return (
    <div className="space-y-5">
      {/* search + tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input className={cn(inputCls, 'pl-9')} placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className="text-sm text-muted">{filtered.length} member{filtered.length === 1 ? '' : 's'}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map((r) => (
          <button key={r} onClick={() => setRole(r)}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition',
              role === r ? 'bg-primary text-primary-fg' : 'bg-surface2 text-muted hover:text-fg')}>
            {roleName(r)}
            {role === r ? null : counts[r] ? <span className="text-xs opacity-70">{counts[r]}</span> : null}
          </button>
        ))}
      </div>

      {/* list */}
      {usersQ.isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No members found" description="Try a different search or filter." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((u) => {
                const isKab = u.role === 'kabataan';
                return (
                  <div key={u._id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface2/50">
                    <button onClick={() => setSelected(u)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <Avatar name={`${u.firstName} ${u.lastName}`} src={u.photo} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-fg">
                          {u.firstName} {u.lastName}
                          {isKab && u.idVerified && <BadgeCheck className="ml-1 inline h-4 w-4 text-info" />}
                        </p>
                        <p className="truncate text-xs text-muted">{u.email}</p>
                      </div>
                    </button>

                    <div className="hidden items-center gap-2 sm:flex">
                      <Pill tone={isKab ? 'blue' : 'green'}>{roleName(u.role)}</Pill>
                      {u.isActive
                        ? <Pill tone="green">Active</Pill>
                        : <Pill tone="gray">Inactive</Pill>}
                      {isKab && (u.idVerified
                        ? <Pill tone="green"><ShieldCheck className="h-3 w-3" /> Verified</Pill>
                        : <Pill tone="amber"><ShieldAlert className="h-3 w-3" /> Unverified</Pill>)}
                    </div>

                    {isKab && (
                      <button
                        onClick={() => verifyM.mutate({ id: u._id, verified: !u.idVerified })}
                        disabled={verifyM.isPending}
                        title={u.idVerified ? 'Remove verification' : 'Verify residency'}
                        className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition',
                          u.idVerified ? 'text-success hover:bg-success/10' : 'text-warning hover:bg-warning/10')}>
                        {u.idVerified ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* member detail */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Member details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={`${selected.firstName} ${selected.lastName}`} src={selected.photo} size="lg" />
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-fg">{selected.firstName} {selected.lastName}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Pill tone={selected.role === 'kabataan' ? 'blue' : 'green'}>{roleName(selected.role)}</Pill>
                  {selected.position && <Pill tone="gray">{selected.position}</Pill>}
                  {selected.isActive ? <Pill tone="green">Active</Pill> : <Pill tone="gray">Inactive</Pill>}
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-surface2/50 p-3 text-sm">
              <p className="flex items-center gap-2 text-fg"><Mail className="h-4 w-4 text-subtle" /> {selected.email}</p>
              {selected.contactNumber && <p className="flex items-center gap-2 text-fg"><Phone className="h-4 w-4 text-subtle" /> {selected.contactNumber}</p>}
              {selected.address && <p className="flex items-center gap-2 text-fg"><MapPin className="h-4 w-4 text-subtle" /> {selected.address}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              {selected.role === 'kabataan' && (
                <Button variant={selected.idVerified ? 'outline' : undefined}
                  onClick={() => { verifyM.mutate({ id: selected._id, verified: !selected.idVerified }); setSelected({ ...selected, idVerified: !selected.idVerified }); }}>
                  {selected.idVerified ? <><ShieldAlert className="h-4 w-4" /> Remove verification</> : <><ShieldCheck className="h-4 w-4" /> Verify residency</>}
                </Button>
              )}
              <Button variant="outline" onClick={() => { toggleM.mutate(selected._id); setSelected({ ...selected, isActive: !selected.isActive }); }}>
                <Power className="h-4 w-4" /> {selected.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button variant="outline" onClick={() => setPwFor(selected)}>
                <KeyRound className="h-4 w-4" /> Reset password
              </Button>
              <Button variant="ghost" onClick={() => setDelFor(selected)} className="text-danger">
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* reset password */}
      <Modal open={!!pwFor} onClose={() => { setPwFor(null); setNewPw(''); }} title="Reset password" size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setPwFor(null); setNewPw(''); }}>Cancel</Button>
            <Button onClick={() => resetM.mutate({ id: pwFor._id, newPassword: newPw })} disabled={newPw.length < 6 || resetM.isPending}>
              {resetM.isPending ? 'Saving…' : 'Set new password'}
            </Button>
          </div>
        }>
        {pwFor && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Set a new password for <b className="text-fg">{pwFor.firstName} {pwFor.lastName}</b>.</p>
            <input type="text" className={inputCls} placeholder="New password (min 6 chars)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
        )}
      </Modal>

      {/* delete confirm */}
      <Modal open={!!delFor} onClose={() => setDelFor(null)} title="Remove member" size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDelFor(null)}>Cancel</Button>
            <Button onClick={() => deleteM.mutate(delFor._id)} disabled={deleteM.isPending} className="bg-danger text-white hover:bg-danger/90">
              <Trash2 className="h-4 w-4" /> {deleteM.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        }>
        {delFor && (
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/12 text-danger"><X className="h-5 w-5" /></span>
            <p className="text-sm text-muted">
              Remove <b className="text-fg">{delFor.firstName} {delFor.lastName}</b> permanently? This cannot be undone.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}