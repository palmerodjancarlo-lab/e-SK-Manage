import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search, ShieldCheck, ShieldOff, Power, KeyRound, Trash2,
  Eye, EyeOff, UserCheck, Users as UsersIcon,
} from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Spinner, Badge, Button, Input, Select, Modal,
  Table, THead, TBody, TR, TH, TD, SortableTH, TablePagination, EmptyState,
} from '../../components/ui';
import useTableData from '../../lib/useTableData';
import { roleLabel, HEAD_ROLES, ROLES } from '../../lib/roles';
import { hasSubmittedId } from '../../lib/residency';
import IdDocumentViewer from '../../components/account/IdDocumentViewer';

const TABS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'kabataan', label: 'Kabataan', test: (u) => u.role === 'kabataan' },
  { key: 'sk', label: 'SK Officials', test: (u) => u.role !== 'kabataan' },
  { key: 'pending', label: 'Awaiting verification', test: (u) => u.role === 'kabataan' && !u.idVerified },
];

// Defined once (not per render) so sorting is only recomputed when data changes
const ACCESSORS = {
  name: (u) => `${u.lastName} ${u.firstName}`,
  role: (u) => roleLabel(u.role),
  joined: (u) => new Date(u.createdAt),
};

function ageOf(u) {
  if (typeof u.age === 'number') return u.age;
  if (!u.birthDate) return null;
  return Math.floor((Date.now() - new Date(u.birthDate).getTime()) / 3.15576e10);
}

export default function Members() {
  const qc = useQueryClient();
  // ?tab=pending opens straight to the review queue (dashboard links here)
  const [params] = useSearchParams();
  const [tab, setTab] = useState(() => (TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'all'));
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [selected, setSelected] = useState(null);
  const [showId, setShowId] = useState(false);
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
    const inTab = TABS.find((t) => t.key === tab).test;
    return users.filter((u) => {
      if (!inTab(u)) return false;
      if (role && u.role !== role) return false;
      if (!term) return true;
      return (
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term)
      );
    });
  }, [users, tab, q, role]);

  const table = useTableData(filtered, { accessors: ACCESSORS, initialSort: { key: 'name', dir: 'asc' }, pageSize: 15 });
  const pendingCount = users.filter(TABS[3].test).length;
  const openManage = (u) => { setSelected(u); setNewPass(''); setConfirmDelete(false); setShowId(false); };

  return (
    <>
      <PageHeader
        title="Member Registry"
        description="Residents and officials of Barangay Tawiran. Verify residency before granting full access."
      />

      {pendingCount > 0 && tab !== 'pending' && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-sm font-medium text-fg">
            <UserCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-warning" />
            {pendingCount} kabataan {pendingCount === 1 ? 'is' : 'are'} waiting for residency verification.
          </p>
          <Button size="sm" variant="outline" onClick={() => setTab('pending')}>Review now</Button>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface2 p-1" role="group" aria-label="Filter members">
          {TABS.map((t) => {
            const count = users.filter(t.test).length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(t.key)}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
                  active ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'
                }`}
              >
                {t.label}
                <span className="rounded bg-surface2 px-1.5 text-xs tabular-nums text-muted">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:w-[30rem]">
          <div className="sm:w-48 sm:shrink-0">
            <Select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All roles</option>
              {[ROLES.CHAIR, ROLES.SECRETARY, ROLES.TREASURER, ROLES.KAGAWAD, ROLES.KABATAAN].map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </Select>
          </div>
          <Input aria-label="Search members by name or email" placeholder="Search name or email…" value={q}
            onChange={(e) => setQ(e.target.value)} leftIcon={<Search className="h-4 w-4" />} type="search" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center rounded-xl border border-border bg-surface py-16" role="status">
          <Spinner className="h-7 w-7 text-primary" /><span className="sr-only">Loading members…</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={q ? 'No members match your search' : tab === 'pending' ? 'Everyone is verified' : 'No members yet'}
          description={q ? 'Check the spelling or search by email instead.' : tab === 'pending' ? 'There are no residency documents waiting for review.' : 'Kabataan appear here after they register.'}
          action={(q || role || tab !== 'all') && <Button variant="outline" onClick={() => { setQ(''); setRole(''); setTab('all'); }}>Show all members</Button>}
        />
      ) : (
        <Table
          label="Members"
          stack
          footer={<TablePagination page={table.page} pageCount={table.pageCount} total={table.total} pageSize={table.pageSize} onPage={table.setPage} noun="members" />}
        >
          <THead>
            <TR>
              <SortableTH sortKey="name" sort={table.sort} onSort={table.toggleSort}>Name</SortableTH>
              <SortableTH sortKey="role" sort={table.sort} onSort={table.toggleSort}>Role</SortableTH>
              <TH>Status</TH>
              <TH className="text-right"><span className="sr-only">Actions</span></TH>
            </TR>
          </THead>
          <TBody>
            {table.pageRows.map((u) => (
              <TR key={u._id}>
                <TD label="Name">
                  <div className="font-semibold text-fg">{u.firstName} {u.lastName}</div>
                  <div className="break-all text-xs text-subtle">{u.email}</div>
                </TD>
                <TD label="Role">
                  <Badge variant={HEAD_ROLES.includes(u.role) ? 'primary' : u.role === 'kabataan' ? 'info' : 'accent'}>
                    {roleLabel(u.role)}
                  </Badge>
                </TD>
                <TD label="Status">
                  <div className="flex flex-wrap justify-end gap-1.5 sm:justify-start">
                    <Badge variant={u.isActive ? 'success' : 'default'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                    {u.role === 'kabataan' && (
                      <Badge variant={u.idVerified ? 'success' : 'warning'}>
                        {u.idVerified ? 'Verified' : hasSubmittedId(u) ? 'ID submitted' : 'No ID yet'}
                      </Badge>
                    )}
                    {u.isPWD && <Badge variant="info">PWD</Badge>}
                  </div>
                </TD>
                <TD className="text-right">
                  <Button size="sm" variant="outline" onClick={() => openManage(u)} aria-label={`Manage ${u.firstName} ${u.lastName}`}>
                    Manage
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

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
                  {hasSubmittedId(selected) ? (
                    <Button variant="outline" size="sm" onClick={() => setShowId((v) => !v)} aria-expanded={showId}>
                      {showId ? <><EyeOff className="h-4 w-4" /> Hide document</> : <><Eye className="h-4 w-4" /> View document</>}
                    </Button>
                  ) : (
                    <Badge variant="default">No ID uploaded</Badge>
                  )}
                </div>
                {hasSubmittedId(selected) && (
                  <p className="mt-2 text-xs text-muted">
                    {selected.idType || 'Document type not specified'}
                    {selected.idSubmittedAt && ` · submitted ${new Date(selected.idSubmittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </p>
                )}
                {showId && (
                  <div className="mt-3">
                    <IdDocumentViewer key={selected._id} endpoint={`/admin/users/${selected._id}/id-document`} />
                    <p className="mt-1.5 text-xs text-subtle">Personal data — each view is recorded in the audit log.</p>
                  </div>
                )}
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