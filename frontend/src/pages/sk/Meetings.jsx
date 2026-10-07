// src/pages/sk/Meetings.jsx — SK meetings & events management
// cspell:words kabataan kagawad Tawiran saloobin checkins barangay
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, QrCode, Users, MessageSquare, CalendarDays, MapPin, Star, Power, X, HandHeart,
} from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, CardContent, Spinner, Badge, Button, Input, Textarea, Select, Modal, EmptyState, Avatar,
} from '../../components/ui';
import { cn } from '../../lib/utils';

const TYPES = ['Meeting', 'Workshop', 'Event', 'Seminar', 'Livelihood', 'Sports'];
const asArray = (d) => (Array.isArray(d) ? d : d?.meetings || []);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '');
const qrSrc = (token) => `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(token || '')}`;

export default function SKMeetings() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('upcoming');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [qr, setQr] = useState(null);
  const [manage, setManage] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['meetings'], queryFn: async () => (await api.get('/meetings')).data });
  const nowQ = useQuery({ queryKey: ['now'], queryFn: async () => Date.now() });
  const now = nowQ.data || 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ['meetings'] });

  const meetings = asArray(data).map((m) => ({ ...m, _past: new Date(m.date).getTime() < now }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const shown = meetings.filter((m) => (filter === 'past' ? m._past : !m._past));
  const upcomingCount = meetings.filter((m) => !m._past).length;

  const delM = useMutation({
    mutationFn: (id) => api.delete(`/meetings/${id}`),
    onSuccess: () => { toast.success('Deleted.'); setDel(null); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  return (
    <>
      <PageHeader title="Meetings & Events" description="Schedule events, activate QR check-in, and track attendance."
        actions={<Button onClick={() => setForm({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New event</Button>} />

      <div className="mb-5 inline-flex rounded-xl border border-border bg-surface p-1">
        {[{ k: 'upcoming', label: `Upcoming${upcomingCount ? ` · ${upcomingCount}` : ''}` }, { k: 'past', label: 'Past' }].map((t) => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition', filter === t.k ? 'bg-primary text-primary-fg' : 'text-muted hover:text-fg')}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
        : shown.length === 0 ? <EmptyState icon={CalendarDays} title={`No ${filter} events`} description="Create an event for the kabataan to join." action={<Button onClick={() => setForm({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New event</Button>} />
        : (
          <div className="grid gap-4 md:grid-cols-2">
            {shown.map((m) => {
              const live = m.qrActive && !m._past;
              const volCount = (m.volunteers || []).length;
              return (
                <Card key={m._id}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">{m.type}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-accent"><Star className="h-3 w-3" /> +{m.pointsReward ?? 10}</span>
                        {live && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> QR live</span>}
                        {m.needsVolunteers && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent"><HandHeart className="h-3 w-3" /> {volCount}{m.volunteerSlots ? `/${m.volunteerSlots}` : ''}</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setForm({ mode: 'edit', data: m })}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDel(m)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <h3 className="mt-1.5 font-bold text-fg">{m.title}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted"><CalendarDays className="h-3.5 w-3.5" /> {fmtDate(m.date)}{m.time ? ` · ${m.time}` : ''}</p>
                    {m.venue && <p className="flex items-center gap-1 text-sm text-subtle"><MapPin className="h-3.5 w-3.5" /> {m.venue}{m.municipality ? `, ${m.municipality}` : ''}</p>}
                    {m.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{m.description}</p>}

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                      <Button size="sm" variant={live ? 'primary' : 'outline'} onClick={() => setQr(m)}><QrCode className="h-4 w-4" /> {live ? 'QR active' : 'QR check-in'}</Button>
                      <Button size="sm" variant="outline" onClick={() => setManage({ id: m._id, tab: 'checkins' })}><Users className="h-4 w-4" /> Attendance</Button>
                      {m.needsVolunteers && <Button size="sm" variant="outline" onClick={() => setManage({ id: m._id, tab: 'volunteers' })}><HandHeart className="h-4 w-4" /> Volunteers</Button>}
                      <Button size="sm" variant="outline" onClick={() => setManage({ id: m._id, tab: 'comments' })}><MessageSquare className="h-4 w-4" /> Saloobin</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      {form && <MeetingForm modal={form} onClose={() => setForm(null)} onDone={() => { setForm(null); refresh(); }} />}
      {qr && <QRModal meeting={qr} onClose={() => setQr(null)} onChange={refresh} />}
      {manage && <ManageModal id={manage.id} initialTab={manage.tab} onClose={() => setManage(null)} />}

      <Modal open={!!del} onClose={() => setDel(null)} title="Delete event"
        footer={<><Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" loading={delM.isPending} onClick={() => delM.mutate(del._id)}>Delete</Button></>}>
        <p className="text-sm text-muted">Delete “{del?.title}”?</p>
      </Modal>
    </>
  );
}

function MeetingForm({ modal, onClose, onDone }) {
  const isEdit = modal.mode === 'edit';
  const d = modal.data;
  const [form, setForm] = useState({
    title: d.title || '', type: d.type || 'Meeting',
    date: d.date ? d.date.slice(0, 10) : '', time: d.time || '',
    venue: d.venue || '', municipality: d.municipality || 'Santa Cruz',
    agenda: d.agenda || '', description: d.description || '',
    pointsReward: d.pointsReward ?? 10,
    needsVolunteers: !!d.needsVolunteers, volunteerRole: d.volunteerRole || '', volunteerSlots: d.volunteerSlots ?? 0,
  });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const m = useMutation({
    mutationFn: (p) => (isEdit ? api.put(`/meetings/${d._id}`, p) : api.post('/meetings', p)),
    onSuccess: () => { toast.success(isEdit ? 'Updated.' : 'Event created.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const submit = (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return toast.error('Title and date are required.');
    m.mutate({ ...form, pointsReward: Number(form.pointsReward) || 0, volunteerSlots: Number(form.volunteerSlots) || 0 });
  };
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit event' : 'New event'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>{isEdit ? 'Save' : 'Create'}</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Title" name="title" value={form.title} onChange={on} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Type" name="type" value={form.type} onChange={on}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
          <Input label="Points reward" name="pointsReward" type="number" value={form.pointsReward} onChange={on} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date" name="date" type="date" value={form.date} onChange={on} />
          <Input label="Time" name="time" value={form.time} onChange={on} placeholder="e.g. 9:00 AM" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Venue" name="venue" value={form.venue} onChange={on} placeholder="e.g. SK Session Hall" />
          <Input label="Municipality" name="municipality" value={form.municipality} onChange={on} />
        </div>
        <Textarea label="Agenda" name="agenda" value={form.agenda} onChange={on} rows={2} />
        <Textarea label="Description" name="description" value={form.description} onChange={on} rows={2} />

        {/* Volunteer sign-up */}
        <div className="space-y-3 rounded-xl border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-fg">
            <input type="checkbox" checked={form.needsVolunteers}
              onChange={(e) => setForm((f) => ({ ...f, needsVolunteers: e.target.checked }))}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <HandHeart className="h-4 w-4 text-accent" /> This event needs volunteers
          </label>
          {form.needsVolunteers && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Volunteer role / task" name="volunteerRole" value={form.volunteerRole} onChange={on} placeholder="e.g. Registration & crowd control" />
              <Input label="Slots (0 = unlimited)" name="volunteerSlots" type="number" value={form.volunteerSlots} onChange={on} />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

function QRModal({ meeting, onClose, onChange }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['meeting', meeting._id], queryFn: async () => (await api.get(`/meetings/${meeting._id}`)).data.meeting });
  const [duration, setDuration] = useState(120);
  const m = data || meeting;
  const live = m.qrActive;

  const refresh = () => { qc.invalidateQueries({ queryKey: ['meeting', meeting._id] }); onChange?.(); };
  const genM = useMutation({
    mutationFn: () => api.post(`/meetings/${meeting._id}/generate-qr`, { durationMinutes: Number(duration) }),
    onSuccess: () => { toast.success('QR check-in activated.'); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const offM = useMutation({
    mutationFn: () => api.put(`/meetings/${meeting._id}/deactivate-qr`),
    onSuccess: () => { toast.success('QR deactivated. Event ended.'); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  return (
    <Modal open onClose={onClose} title="QR check-in" size="md" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {isLoading ? <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-primary" /></div>
        : (
          <div className="space-y-4 text-center">
            <p className="text-sm font-bold text-fg">{m.title}</p>
            {live && m.qrToken ? (
              <>
                <img src={qrSrc(m.qrToken)} alt="Check-in QR" className="mx-auto h-60 w-60 rounded-xl border border-border bg-white p-2" />
                <p className="text-xs text-muted">Kabataan scan this to check in and earn points.{m.qrExpiry ? ` Expires ${new Date(m.qrExpiry).toLocaleString('en-PH')}.` : ''}</p>
                <Button variant="danger" loading={offM.isPending} onClick={() => offM.mutate()} className="w-full"><Power className="h-4 w-4" /> Deactivate &amp; end</Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">Activate the QR to let kabataan check in.</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-muted">Open for</span>
                  <Select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-auto">
                    {[60, 120, 180, 240].map((d) => <option key={d} value={d}>{d} min</option>)}
                  </Select>
                </div>
                <Button loading={genM.isPending} onClick={() => genM.mutate()} className="w-full"><QrCode className="h-4 w-4" /> Activate QR check-in</Button>
              </>
            )}
          </div>
        )}
    </Modal>
  );
}

function ManageModal({ id, initialTab, onClose }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState(initialTab || 'checkins');
  const { data, isLoading } = useQuery({ queryKey: ['meeting', id], queryFn: async () => (await api.get(`/meetings/${id}`)).data.meeting });
  const m = data || {};
  const checkedIn = m.checkedIn || [];
  const comments = m.comments || [];
  const volunteers = m.volunteers || [];

  const delC = useMutation({
    mutationFn: (cid) => api.delete(`/meetings/${id}/comments/${cid}`),
    onSuccess: () => { toast.success('Comment removed.'); qc.invalidateQueries({ queryKey: ['meeting', id] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  const tabs = [
    { k: 'checkins', label: `Attendance (${checkedIn.length})` },
    ...(m.needsVolunteers ? [{ k: 'volunteers', label: `Volunteers (${volunteers.length})` }] : []),
    { k: 'comments', label: `Saloobin (${comments.length})` },
  ];

  return (
    <Modal open onClose={onClose} title={m.title || 'Event'} size="md" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="mb-4 inline-flex flex-wrap rounded-xl border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold transition', tab === t.k ? 'bg-primary text-primary-fg' : 'text-muted hover:text-fg')}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-primary" /></div>
        : tab === 'checkins' ? (
          checkedIn.length === 0 ? <EmptyState icon={Users} title="No check-ins yet" description="Attendees who scan the QR appear here." />
            : (
              <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                {checkedIn.map((c, i) => (
                  <div key={c._id || i} className="flex items-center gap-3 rounded-xl bg-surface2/60 px-3 py-2.5">
                    <Avatar name={`${c.user?.firstName || ''} ${c.user?.lastName || ''}`} src={c.user?.photo} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{c.user?.firstName} {c.user?.lastName}</p>
                      <p className="text-xs text-subtle">{c.user?.barangay || ''}{c.checkedInAt ? ` · ${new Date(c.checkedInAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
        ) : tab === 'volunteers' ? (
          <>
            {m.volunteerRole && <p className="mb-3 text-sm text-muted">Task: <span className="font-medium text-fg">{m.volunteerRole}</span>{m.volunteerSlots ? ` · ${volunteers.length}/${m.volunteerSlots} slots` : ''}</p>}
            {volunteers.length === 0 ? <EmptyState icon={HandHeart} title="No volunteers yet" description="Kabataan who sign up to help will appear here." />
              : (
                <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                  {volunteers.map((v, i) => (
                    <div key={v._id || i} className="flex items-center gap-3 rounded-xl bg-surface2/60 px-3 py-2.5">
                      <Avatar name={`${v.user?.firstName || ''} ${v.user?.lastName || ''}`} src={v.user?.photo} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">{v.user?.firstName} {v.user?.lastName}</p>
                        <p className="truncate text-xs text-subtle">{[v.user?.purok, v.user?.contactNumber].filter(Boolean).join(' · ') || '—'}</p>
                        {v.note && <p className="mt-0.5 text-xs italic text-muted">“{v.note}”</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </>
        ) : (
          comments.length === 0 ? <EmptyState icon={MessageSquare} title="No saloobin yet" description="Reflections from kabataan after the event appear here." />
            : (
              <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c._id} className="rounded-xl bg-surface2/60 px-3 py-2.5">
                    <div className="flex items-start gap-3">
                      <Avatar name={`${c.user?.firstName || ''} ${c.user?.lastName || ''}`} src={c.user?.photo} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-fg">{c.user?.firstName} {c.user?.lastName} {c.user?.role && c.user.role !== 'kabataan' && <span className="text-xs font-normal text-primary">· SK</span>}</p>
                        <p className="text-sm text-muted">{c.text}</p>
                        <p className="mt-0.5 text-xs text-subtle">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}</p>
                      </div>
                      <button onClick={() => delC.mutate(c._id)} className="text-danger hover:opacity-70" title="Remove"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )
        )}
    </Modal>
  );
}