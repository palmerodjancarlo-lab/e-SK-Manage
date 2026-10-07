import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Search, ShieldCheck, ShieldOff, Power, KeyRound, Trash2,
  ExternalLink, UserCheck, Users as UsersIcon,
} from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, CardContent, Spinner, Badge, Button, Input, Modal,
  Table, THead, TBody, TR, TH, TD, EmptyState,
} from '../../components/ui';
import { roleLabel, HEAD_ROLES } from '../../lib/roles';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'kabataan', label: 'Kabataan' },
  { key: 'sk', label: 'SK Officials' },
];

function ageOf(u) {
  if (typeof u.age === 'number') return u.age;
  if (!u.birthDate) return null;
  return Math.floor((Date.now() - new Date(u.birthDate).getTime()) / 3.15576e10);
}

export default function Members() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users')).data.users,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-users'] });
    qc.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const verifyM = useMutation({
    mutationFn: ({ id, verified }) => api.put(`/admin/users/${id}/verify`, { verified }),
    onSuccess: (_r, v) => { toast.success(v.verified ? 'Resident verified.' : 'Verification removed.'); refresh(); syncSelected(v.id, { idVerified: v.verified }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const toggleM = useMutation({
    mutationFn: (id) => api.put(`/admin/users/${id}/toggle`),
    onSuccess: (r) => { toast.success(r.data.message); refresh(); syncSelected(r.data.user._id, { isActive: r.data.user.isActive }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const resetM = useMutation({
    mutationFn: ({ id, newPassword }) => api.put(`/admin/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => { toast.success('Password reset.'); setNewPass(''); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const deleteM = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success('User deleted.'); setSelected(null); setConfirmDelete(false); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  function syncSelected(id, patch) {
    setSelected((s) => (s && s._id === id ? { ...s, ...patch } : s));
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      if (tab === 'kabataan' && u.role !== 'kabataan') return false;
      if (tab === 'sk' && u.role === 'kabataan') return false;
      if (!term) return true;
      return (
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term)
      );
    });
  }, [users, tab, q]);

  const pendingCount = users.filter((u) => u.role === 'kabataan' && !u.idVerified).length;

  return (
    <>
      <PageHeader
        title="Members"
        description="Residents and officials of Barangay Tawiran. Verify residency before granting full access."
      />

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-surface2 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                tab === t.key ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="sm:w-72">
          <Input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />} />
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-5 py-3">
          <UserCheck className="h-5 w-5 text-warning" />
          <p className="text-sm font-medium text-fg">{pendingCount} kabataan awaiting residency verification.</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0 sm:p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={UsersIcon} title="No members found" description="Try a different search or filter." />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Manage</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((u) => (
                  <TR key={u._id}>
                    <TD>
                      <div className="font-semibold text-fg">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-subtle">{u.email}</div>
                    </TD>
                    <TD>
                      <Badge variant={HEAD_ROLES.includes(u.role) ? 'primary' : u.role === 'kabataan' ? 'info' : 'accent'}>
                        {roleLabel(u.role)}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={u.isActive ? 'success' : 'default'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                        {u.role === 'kabataan' && (
                          <Badge variant={u.idVerified ? 'success' : 'warning'}>{u.idVerified ? 'Verified' : 'Pending'}</Badge>
                        )}
                        {u.isPWD && <Badge variant="info">PWD</Badge>}
                      </div>
                    </TD>
                    <TD className="text-right">
                      <Button size="sm" variant="outline" onClick={() => { setSelected(u); setNewPass(''); setConfirmDelete(false); }}>
                        Manage
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manage modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.firstName} ${selected.lastName}` : ''}
        description={selected ? `${roleLabel(selected.role)} · ${selected.email}` : ''}
        size="lg"
      >
        {selected && (
          <div className="space-y-6">
            {/* Details */}
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Detail label="Sex" value={selected.sex || '—'} />
              <Detail label="Age" value={ageOf(selected) ?? '—'} />
              <Detail label="Civil status" value={selected.civilStatus || '—'} />
              <Detail label="Purok" value={selected.purok || '—'} />
              <Detail label="Contact" value={selected.contactNumber || '—'} />
              <Detail label="PWD" value={selected.isPWD ? 'Yes' : 'No'} />
              <Detail label="Address" value={selected.address || '—'} className="col-span-2 sm:col-span-3" />
            </div>

            {/* Residency verification (kabataan only) */}
            {selected.role === 'kabataan' && (
              <div className="rounded-xl border border-border bg-surface2/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-fg">Residency verification</p>
                    <p className="text-xs text-muted">
                      {selected.idVerified ? 'This resident is verified.' : 'Review their ID/residency proof, then verify.'}
                    </p>
                  </div>
                  {selected.idPhoto ? (
                    <a href={selected.idPhoto} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                      View ID <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <Badge variant="default">No ID uploaded</Badge>
                  )}
                </div>
                <div className="mt-3">
                  {selected.idVerified ? (
                    <Button variant="ghost" loading={verifyM.isPending}
                      onClick={() => verifyM.mutate({ id: selected._id, verified: false })}>
                      <ShieldOff className="h-4 w-4" /> Remove verification
                    </Button>
                  ) : (
                    <Button loading={verifyM.isPending}
                      onClick={() => verifyM.mutate({ id: selected._id, verified: true })}>
                      <ShieldCheck className="h-4 w-4" /> Verify resident
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Account actions */}
            <div className="rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-semibold text-fg">Account</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" loading={toggleM.isPending} onClick={() => toggleM.mutate(selected._id)}>
                  <Power className="h-4 w-4" /> {selected.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                {!confirmDelete ? (
                  <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-danger hover:bg-danger/10">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                ) : (
                  <Button variant="danger" loading={deleteM.isPending} onClick={() => deleteM.mutate(selected._id)}>
                    <Trash2 className="h-4 w-4" /> Confirm delete
                  </Button>
                )}
              </div>

              {/* Reset password */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Input label="Reset password" type="text" placeholder="New password (min 6 chars)"
                    value={newPass} onChange={(e) => setNewPass(e.target.value)}
                    leftIcon={<KeyRound className="h-4 w-4" />} />
                </div>
                <Button variant="outline" loading={resetM.isPending}
                  disabled={newPass.length < 6}
                  onClick={() => resetM.mutate({ id: selected._id, newPassword: newPass })}>
                  Set password
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Detail({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className="mt-0.5 font-medium text-fg">{value}</p>
    </div>
  );
}