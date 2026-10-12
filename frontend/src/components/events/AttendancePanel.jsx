// Attendance of one event: who checked in (QR) or was marked present by an officer,
// plus the softcopies — Excel, Print/PDF and a blank sign-in sheet for the venue.
// Every SK officer can use it; downloads are written to the audit logs.
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Printer, ClipboardList, UserPlus, X, QrCode, UserCheck, Users, Hourglass } from 'lucide-react';
import api from '../../lib/api';
import { Button, Select, Avatar, Badge, Spinner, EmptyState } from '../ui';
import { downloadEventAttendanceXlsx, printEventAttendance, printSignInSheet } from '../../lib/attendance';

const time = (d) => (d ? new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '');

export default function AttendancePanel({ meetingId }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(''); // which download is being prepared

  const listQ = useQuery({
    queryKey: ['meeting-checkins', meetingId],
    queryFn: async () => (await api.get(`/meetings/${meetingId}/checkins`)).data.checkedIn || [],
  });
  const rosterQ = useQuery({
    queryKey: ['kabataan-roster'],
    queryFn: async () => (await api.get('/auth/members', { params: { role: 'kabataan' } })).data.users || [],
  });
  const rows = useMemo(() => [...(listQ.data || [])].sort((a, b) => new Date(a.checkedInAt) - new Date(b.checkedInAt)), [listQ.data]);
  const present = new Set(rows.map((c) => String(c.user?._id || c.user)));
  const notYet = (rosterQ.data || [])
    .filter((u) => u.isActive !== false && !present.has(String(u._id)))
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));

  const refresh = () => ['meeting-checkins', 'meeting', 'meetings'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const markM = useMutation({
    mutationFn: () => api.post(`/meetings/${meetingId}/mark-present`, { userId }),
    onSuccess: (r) => { toast.success(r.data.message || 'Marked present.'); setUserId(''); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not mark present.'),
  });
  const removeM = useMutation({
    mutationFn: (uid) => api.delete(`/meetings/${meetingId}/checkins/${uid}`),
    onSuccess: (r) => { toast.success(r.data.message || 'Removed.'); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not remove.'),
  });

  // Fetch the sheet data (this is the audit-logged step), then build the file
  const download = async (kind) => {
    setBusy(kind);
    try {
      const { data } = await api.get(`/meetings/${meetingId}/attendance-sheet`, { params: { kind: kind === 'signin' ? 'signin' : 'attendance' } });
      if (kind === 'xlsx') downloadEventAttendanceXlsx(data);
      else {
        const ok = kind === 'signin' ? printSignInSheet(data) : printEventAttendance(data);
        if (!ok) toast.error('Allow pop-ups to print.');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not prepare the sheet.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" loading={busy === 'xlsx'} disabled={!rows.length} onClick={() => download('xlsx')}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
        <Button size="sm" variant="outline" loading={busy === 'print'} disabled={!rows.length} onClick={() => download('print')}><Printer className="h-4 w-4" /> Print / PDF</Button>
        <Button size="sm" variant="outline" loading={busy === 'signin'} onClick={() => download('signin')}><ClipboardList className="h-4 w-4" /> Blank sign-in sheet</Button>
      </div>

      <form className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(e) => { e.preventDefault(); if (userId && !markM.isPending) markM.mutate(); }}>
        <Select label="Mark someone present (no phone or couldn’t scan)" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">{rosterQ.isLoading ? 'Loading members…' : notYet.length ? 'Choose a member…' : 'Everyone is already on the list'}</option>
          {notYet.map((u) => <option key={u._id} value={u._id}>{u.lastName}, {u.firstName}{u.purok ? ` — ${u.purok}` : ''}{u.idVerified ? '' : ' (not yet verified)'}</option>)}
        </Select>
        <Button type="submit" loading={markM.isPending} disabled={!userId}><UserPlus className="h-4 w-4" /> Mark present</Button>
      </form>

      {listQ.isLoading ? <div className="flex justify-center py-6" role="status"><Spinner className="h-6 w-6 text-primary" /><span className="sr-only">Loading…</span></div>
        : rows.length === 0 ? <EmptyState icon={Users} title="No one yet" description="Members who scan the QR — or that you mark present — appear here." />
        : (
          <>
            <p className="text-sm font-semibold text-fg">{rows.length} present</p>
            <ol className="max-h-[45vh] divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {rows.map((c, i) => {
                const u = c.user || {};
                const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Deleted member';
                const manual = c.method === 'manual';
                return (
                  <li key={c._id || i} className="flex items-center gap-3 px-3 py-2">
                    <span className="w-6 text-right text-xs tabular-nums text-subtle">{i + 1}</span>
                    <Avatar name={name} src={u.photo} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{name}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-subtle">
                        <span>{[u.purok, time(c.checkedInAt)].filter(Boolean).join(' · ')}</span>
                        <span className="inline-flex items-center gap-1">{manual ? <UserCheck aria-hidden="true" className="h-3 w-3" /> : <QrCode aria-hidden="true" className="h-3 w-3" />}{manual ? `Marked${c.markedBy?.firstName ? ` by ${c.markedBy.firstName}` : ''}` : 'QR'}</span>
                      </p>
                    </div>
                    {u.idVerified === false && <Badge variant="warning"><Hourglass className="h-3 w-3" /> <span className="sm:hidden">Held</span><span className="hidden sm:inline">Points held</span></Badge>}
                    <button type="button" aria-label={`Remove ${name} from the attendance`}
                      onClick={() => { if (window.confirm(`Remove ${name} from the attendance? Their points for this event are taken back.`)) removeM.mutate(u._id); }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger">
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      <p className="text-xs text-subtle">Attendance sheets contain members’ personal details — every download is recorded in the Audit Logs.</p>
    </div>
  );
}
