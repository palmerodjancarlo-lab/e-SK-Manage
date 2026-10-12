// Projects and activities under a program (PPA): Program → Project → Activity.
// The Chairperson (canManage) adds/edits/removes them; every SK officer can record
// activity attendance, which awards kabataan their prorated (and priority-adjusted) points.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, CalendarRange, MapPin, Star, ClipboardCheck, ChevronDown, Wallet, FolderOpen, FileSpreadsheet, Printer } from 'lucide-react';
import api from '../../lib/api';
import { peso, cn, localDateInput } from '../../lib/utils';
import { STATUS_DOT, statusLabel, PROGRAM_STATUSES } from '../../lib/programs';
import { Button, Input, Textarea, Select, Modal, IconButton, Spinner, Avatar } from '../ui';
import { downloadActivityAttendanceXlsx, printActivityAttendance } from '../../lib/attendance';

const ACTIVITY_TYPES = ['Meeting', 'Workshop', 'Community Service', 'Training', 'Sports', 'Health', 'Livelihood', 'Other'];
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const range = (a, b) => (a ? `${fmt(a)}${b ? ` – ${fmt(b)}` : ''}` : 'Dates not set');
const errMsg = (e, fallback) => e.response?.data?.message || fallback;

function Status({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-semibold text-fg">
      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', STATUS_DOT[status] || 'bg-subtle')} />{statusLabel(status)}
    </span>
  );
}

export default function ProjectsPanel({ program, canManage, onChanged }) {
  const qc = useQueryClient();
  const key = ['program-projects', program._id];
  const { data: projects = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get(`/programs/${program._id}/projects`)).data.projects || [],
  });
  const [projForm, setProjForm] = useState(null);  // { data } | null
  const [actForm, setActForm] = useState(null);    // { project, data }
  const [attendFor, setAttendFor] = useState(null); // activity
  const [confirm, setConfirm] = useState(null);    // { label, url }
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['project-activities'] }); onChanged?.(); };

  const delM = useMutation({
    mutationFn: (url) => api.delete(url),
    onSuccess: (r) => { toast.success(r.data.message || 'Deleted.'); setConfirm(null); refresh(); },
    onError: (e) => toast.error(errMsg(e, 'Could not delete.')),
  });

  if (isLoading) return <div className="flex justify-center py-8" role="status"><Spinner className="h-6 w-6 text-primary" /><span className="sr-only">Loading…</span></div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{projects.length ? `${projects.length} project${projects.length === 1 ? '' : 's'} in this program.` : 'No projects yet.'}</p>
        {canManage && <Button size="sm" onClick={() => setProjForm({ data: {} })}><Plus className="h-4 w-4" /> Add project</Button>}
      </div>

      {projects.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <FolderOpen aria-hidden="true" className="h-8 w-8 text-subtle" />
          <p className="text-sm text-muted">{canManage ? 'Break this program into projects, then add the activities kabataan attend.' : 'The Chairperson hasn’t added projects to this program yet.'}</p>
        </div>
      )}

      {projects.map((p) => (
        <ProjectCard key={p._id} project={p} canManage={canManage}
          onEdit={() => setProjForm({ data: p })}
          onDelete={() => setConfirm({ label: `Delete project “${p.title}” and its activities?`, url: `/programs/projects/${p._id}` })}
          onAddActivity={() => setActForm({ project: p, data: {} })}
          onEditActivity={(a) => setActForm({ project: p, data: a })}
          onDeleteActivity={(a) => setConfirm({ label: `Delete activity “${a.title}”? Points already earned stay with the members.`, url: `/programs/activities/${a._id}` })}
          onAttendance={setAttendFor} />
      ))}

      {projForm && <ProjectForm program={program} data={projForm.data} onClose={() => setProjForm(null)} onDone={() => { setProjForm(null); refresh(); }} />}
      {actForm && <ActivityForm project={actForm.project} data={actForm.data} onClose={() => setActForm(null)} onDone={() => { setActForm(null); refresh(); }} />}
      {attendFor && <AttendanceModal activity={attendFor} onClose={() => setAttendFor(null)} onDone={refresh} />}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?"
        footer={<><Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" loading={delM.isPending} onClick={() => delM.mutate(confirm.url)}>Delete</Button></>}>
        <p className="text-sm text-muted">{confirm?.label}</p>
      </Modal>
    </div>
  );
}

function ProjectCard({ project: p, canManage, onEdit, onDelete, onAddActivity, onEditActivity, onDeleteActivity, onAttendance }) {
  const [open, setOpen] = useState(true);
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['project-activities', p._id],
    queryFn: async () => (await api.get(`/programs/projects/${p._id}/activities`)).data.activities || [],
  });
  const cost = p.totalActivityCost || 0;
  const pct = p.allocatedBudget > 0 ? Math.min(100, Math.round((cost / p.allocatedBudget) * 100)) : 0;

  return (
    <section className="rounded-xl border border-border bg-surface" aria-label={p.title}>
      <div className="flex items-start gap-3 p-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? `Hide activities of ${p.title}` : `Show activities of ${p.title}`}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-fg">
          <ChevronDown aria-hidden="true" className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-fg">{p.title}</h4>
            <Status status={p.status} />
          </div>
          <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-subtle">
            <span className="inline-flex items-center gap-1"><CalendarRange aria-hidden="true" className="h-3.5 w-3.5" />{range(p.startDate, p.adjustedEndDate || p.endDate)}</span>
            <span className="inline-flex items-center gap-1"><Wallet aria-hidden="true" className="h-3.5 w-3.5" />{peso(cost)} planned in activities{p.allocatedBudget ? ` of ${peso(p.allocatedBudget)}` : ''}</span>
          </p>
          {p.allocatedBudget > 0 && (
            <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface2" aria-hidden="true">
              <div className={cn('h-full rounded-full', cost > p.allocatedBudget ? 'bg-danger' : 'bg-primary')} style={{ width: `${pct}%` }} />
            </div>
          )}
          {p.description && <p className="mt-1.5 text-sm text-muted">{p.description}</p>}
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-1">
            <IconButton icon={Pencil} label={`Edit project ${p.title}`} onClick={onEdit} />
            <IconButton icon={Trash2} tone="danger" label={`Delete project ${p.title}`} onClick={onDelete} />
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-border bg-surface2/40 px-3 py-2">
          {isLoading ? <p className="py-2 text-xs text-muted">Loading activities…</p>
            : activities.length === 0 ? <p className="py-2 text-xs text-muted">No activities yet.</p>
            : (
              <ul className="divide-y divide-border">
                {activities.map((a) => (
                  <li key={a._id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">{a.title}<span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-border">{a.type}</span></p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-subtle">
                        <span>{range(a.startDate, a.endDate)} · {a.totalDays} day{a.totalDays === 1 ? '' : 's'}</span>
                        {a.venue && <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="h-3 w-3" />{a.venue}</span>}
                        {a.totalPoints > 0 && <span className="inline-flex items-center gap-1 text-accent"><Star aria-hidden="true" className="h-3 w-3" />{a.totalPoints} pts full attendance</span>}
                        {a.estimatedCost > 0 && <span>{peso(a.estimatedCost)}</span>}
                        {(a.attendance || []).length > 0 && <span>{a.attendance.length} attended</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => onAttendance(a)}><ClipboardCheck className="h-4 w-4" /> Attendance</Button>
                      {canManage && <IconButton icon={Pencil} label={`Edit activity ${a.title}`} onClick={() => onEditActivity(a)} />}
                      {canManage && <IconButton icon={Trash2} tone="danger" label={`Delete activity ${a.title}`} onClick={() => onDeleteActivity(a)} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          {canManage && <Button size="sm" variant="ghost" className="mt-1" onClick={onAddActivity}><Plus className="h-4 w-4" /> Add activity</Button>}
        </div>
      )}
    </section>
  );
}

function ProjectForm({ program, data: d, onClose, onDone }) {
  const isEdit = !!d._id;
  const [form, setForm] = useState({
    title: d.title || '', description: d.description || '', status: d.status || 'planned',
    startDate: d.startDate ? localDateInput(d.startDate) : '', endDate: d.endDate ? localDateInput(d.endDate) : '',
    allocatedBudget: d.allocatedBudget ?? '', notes: d.notes || '',
  });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const m = useMutation({
    mutationFn: (p) => (isEdit ? api.put(`/programs/projects/${d._id}`, p) : api.post(`/programs/${program._id}/projects`, p)),
    onSuccess: (r) => { toast.success(r.data.message || 'Saved.'); onDone(); },
    onError: (e) => toast.error(errMsg(e, 'Could not save the project.')),
  });
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Give the project a name.');
    if (form.startDate && form.endDate && form.endDate < form.startDate) return toast.error('The end date is before the start date.');
    m.mutate({ ...form, title: form.title.trim(), allocatedBudget: Number(form.allocatedBudget) || 0 });
  };
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit project' : 'Add a project'} description={program.title} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Save project</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Project name" name="title" value={form.title} onChange={on} placeholder="e.g. Inter-purok Basketball League" />
        <Textarea label="Description" name="description" rows={2} value={form.description} onChange={on} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Status" name="status" value={form.status} onChange={on}>{PROGRAM_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</Select>
          <Input label="Start date" name="startDate" type="date" value={form.startDate} onChange={on} />
          <Input label="End date" name="endDate" type="date" value={form.endDate} onChange={on} />
        </div>
        <Input label="Budget set aside (₱)" name="allocatedBudget" type="number" min="0" step="0.01" value={form.allocatedBudget} onChange={on} hint="From this program’s budget. Activity costs are compared against it." />
        <Textarea label="Notes" name="notes" rows={2} value={form.notes} onChange={on} />
      </form>
    </Modal>
  );
}

function ActivityForm({ project, data: d, onClose, onDone }) {
  const isEdit = !!d._id;
  const [form, setForm] = useState({
    title: d.title || '', type: d.type || 'Other', status: d.status || 'planned', description: d.description || '',
    startDate: d.startDate ? localDateInput(d.startDate) : '', endDate: d.endDate ? localDateInput(d.endDate) : '',
    venue: d.venue || '', estimatedCost: d.estimatedCost ?? '', pointsPerDay: d.pointsPerDay ?? '',
  });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const days = form.startDate && form.endDate ? Math.max(1, Math.round((new Date(form.endDate) - new Date(form.startDate)) / 864e5) + 1) : 0;
  const m = useMutation({
    mutationFn: (p) => (isEdit ? api.put(`/programs/activities/${d._id}`, p) : api.post(`/programs/projects/${project._id}/activities`, p)),
    onSuccess: (r) => { toast.success(r.data.message || 'Saved.'); onDone(); },
    onError: (e) => toast.error(errMsg(e, 'Could not save the activity.')),
  });
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate || !form.endDate) return toast.error('Name, start date and end date are required.');
    if (form.endDate < form.startDate) return toast.error('The end date is before the start date.');
    m.mutate({ ...form, title: form.title.trim(), estimatedCost: Number(form.estimatedCost) || 0, pointsPerDay: Number(form.pointsPerDay) || 0 });
  };
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit activity' : 'Add an activity'} description={project.title} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Save activity</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Activity name" name="title" value={form.title} onChange={on} placeholder="e.g. Elimination games" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Type" name="type" value={form.type} onChange={on}>{ACTIVITY_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
          {isEdit && <Select label="Status" name="status" value={form.status} onChange={on}>{PROGRAM_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</Select>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start date" name="startDate" type="date" value={form.startDate} onChange={on} />
          <Input label="End date" name="endDate" type="date" value={form.endDate} onChange={on} />
        </div>
        <Input label="Venue" name="venue" value={form.venue} onChange={on} placeholder="e.g. Covered court" leftIcon={<MapPin className="h-4 w-4" />} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Estimated cost (₱)" name="estimatedCost" type="number" min="0" step="0.01" value={form.estimatedCost} onChange={on} />
          <Input label="Points per day attended" name="pointsPerDay" type="number" min="0" value={form.pointsPerDay} onChange={on}
            hint={days ? `${days} day${days === 1 ? '' : 's'} → up to ${(Number(form.pointsPerDay) || 0) * days} pts for full attendance` : 'Members earn points for each day they attend.'} />
        </div>
        <Textarea label="Description" name="description" rows={2} value={form.description} onChange={on} />
      </form>
    </Modal>
  );
}

function AttendanceModal({ activity, onClose, onDone }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [days, setDays] = useState('');
  const attQ = useQuery({
    queryKey: ['activity-attendance', activity._id],
    queryFn: async () => (await api.get(`/programs/activities/${activity._id}/attendance`)).data,
  });
  const membersQ = useQuery({
    queryKey: ['kabataan-roster'],
    queryFn: async () => (await api.get('/auth/members', { params: { role: 'kabataan' } })).data.users || [],
  });
  const totalDays = attQ.data?.totalDays || activity.totalDays || 1;
  const eligible = (membersQ.data || []).filter((u) => u.isActive !== false)
    .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
  const rows = attQ.data?.attendance || [];

  const m = useMutation({
    mutationFn: () => api.post(`/programs/activities/${activity._id}/attendance`, { userId, daysAttended: Number(days) }),
    onSuccess: (r) => {
      const bonus = r.data.bonusApplied?.length ? ` (with ${r.data.bonusApplied.join(', ')} bonus)` : '';
      toast.success(`${r.data.message} ${r.data.pointsEarned} pts${bonus}${r.data.pointsHeld ? ' — held until their residency is verified' : ''}.`);
      setUserId(''); setDays('');
      qc.invalidateQueries({ queryKey: ['activity-attendance', activity._id] });
      onDone?.();
    },
    onError: (e) => toast.error(errMsg(e, 'Could not record attendance.')),
  });
  // Fetch with ?export=1 (written to the audit logs), then build the file
  const [busy, setBusy] = useState('');
  const exportSheet = async (kind) => {
    setBusy(kind);
    try {
      const { data } = await api.get(`/programs/activities/${activity._id}/attendance`, { params: { export: 1 } });
      const sheet = { activity: data.activity || activity, attendance: data.attendance || [], totalDays: data.totalDays || totalDays };
      if (kind === 'xlsx') downloadActivityAttendanceXlsx(sheet);
      else if (!printActivityAttendance(sheet)) toast.error('Allow pop-ups to print.');
    } catch (e) {
      toast.error(errMsg(e, 'Could not prepare the sheet.'));
    } finally {
      setBusy('');
    }
  };
  const pick = (id) => {
    setUserId(id);
    const existing = rows.find((r) => (r.user?._id || r.user) === id);
    setDays(existing ? String(existing.daysAttended) : String(totalDays));
  };

  return (
    <Modal open onClose={onClose} size="lg" title="Activity attendance"
      description={`${activity.title} · ${totalDays} day${totalDays === 1 ? '' : 's'} · ${attQ.data?.totalPoints ?? activity.totalPoints} pts for full attendance`}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" loading={busy === 'xlsx'} disabled={!rows.length} onClick={() => exportSheet('xlsx')}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button size="sm" variant="outline" loading={busy === 'print'} disabled={!rows.length} onClick={() => exportSheet('print')}><Printer className="h-4 w-4" /> Print / PDF</Button>
        </div>
        <form className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end"
          onSubmit={(e) => { e.preventDefault(); if (userId && Number(days) > 0 && !m.isPending) m.mutate(); }}>
          <Select label="Member" value={userId} onChange={(e) => pick(e.target.value)}>
            <option value="">{membersQ.isLoading ? 'Loading members…' : 'Choose a member…'}</option>
            {eligible.map((u) => <option key={u._id} value={u._id}>{u.lastName}, {u.firstName}{u.purok ? ` — ${u.purok}` : ''}{u.idVerified ? '' : ' (not yet verified)'}</option>)}
          </Select>
          <Input label="Days attended" type="number" min="1" max={totalDays} value={days} onChange={(e) => setDays(e.target.value)} />
          <Button type="submit" loading={m.isPending} disabled={!userId || !(Number(days) > 0) || Number(days) > totalDays}>Record</Button>
        </form>
        <p className="-mt-3 text-xs text-subtle">Members not yet verified still get their attendance; their points are held and added once their residency is verified. Recording someone again updates their days and points.</p>

        {attQ.isLoading ? <p className="text-sm text-muted">Loading…</p> : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">No attendance recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {rows.map((r) => {
              const name = `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || 'Member';
              return (
                <li key={r._id || r.user?._id} className="flex items-center gap-3 px-3 py-2">
                  <Avatar name={name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{name}</span>
                  <span className="text-xs text-muted">{r.daysAttended}/{totalDays} days</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums text-accent"><Star aria-hidden="true" className="h-3.5 w-3.5" />{r.pointsEarned}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
