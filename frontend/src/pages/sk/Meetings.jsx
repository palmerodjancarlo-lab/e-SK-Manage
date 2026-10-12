// src/pages/sk/Meetings.jsx — SK meetings & events management
// cspell:words kabataan kagawad Tawiran saloobin checkins barangay
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, QrCode, Users, MessageSquare, CalendarDays, MapPin, Star, Power, X, HandHeart, Clock, FileText,
} from 'lucide-react';
import MinutesModal from '../../components/events/MinutesModal';
import AttendancePanel from '../../components/events/AttendancePanel';
import { useAuth } from '../../context/auth-store';
import { ROLES } from '../../lib/roles';
import api from '../../lib/api';
import {
  PageHeader, Card, CardContent, Spinner, Badge, Button, Input, Textarea, Select, Modal, EmptyState, Avatar, IconButton,
} from '../../components/ui';
import { cn, localDateInput } from '../../lib/utils';
import { eventTypeClass, eventTime, parseTimeText, combineDateTime } from '../../lib/events';
import DateTile from '../../components/events/DateTile';
import EventCalendar from '../../components/events/EventCalendar';

const TYPES = ['Meeting', 'Workshop', 'Event', 'Seminar', 'Livelihood', 'Sports'];
const asArray = (d) => (Array.isArray(d) ? d : d?.meetings || []);


export default function SKMeetings() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('upcoming');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [qr, setQr] = useState(null);
  const [manage, setManage] = useState(null);
  const { user } = useAuth();
  const canWriteMinutes = user?.role === ROLES.SECRETARY; // the Chairperson writes them in the Head Console
  const [params, setParams] = useSearchParams();
  const [minutesId, setMinutesId] = useState(() => params.get('minutes')); // ?minutes=<id> from the dashboard

  const { data, isLoading } = useQuery({ queryKey: ['meetings'], queryFn: async () => (await api.get('/meetings')).data });
  const [now] = useState(() => Date.now());
  const refresh = () => qc.invalidateQueries({ queryKey: ['meetings'] });

  const meetings = asArray(data).map((m) => ({ ...m, _past: new Date(m.date).getTime() < now }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = meetings.filter((m) => !m._past);
  const past = meetings.filter((m) => m._past).reverse();
  const shown = filter === 'past' ? past : upcoming;
  const openNew = () => setForm({ mode: 'create', data: {} });

  const delM = useMutation({
    mutationFn: (id) => api.delete(`/meetings/${id}`),
    onSuccess: () => { toast.success('Deleted.'); setDel(null); refresh(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  // One event card — used by the list and by the calendar's selected day
  const renderCard = (m) => {
    const live = m.qrActive && !m._past;
    const volCount = (m.volunteers || []).length;
    return (
      <Card key={m._id} className="transition-shadow hover:shadow-pop">
        <CardContent className="flex gap-4">
          <DateTile date={m.date} past={m._past} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', eventTypeClass(m.type))}>{m.type}</span>
                {live && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                    <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
                    Check-in open
                  </span>
                )}
                {m._past && <Badge variant="default">Done</Badge>}
              </div>
              <div className="-mr-1 -mt-1 flex shrink-0 gap-1">
                <IconButton icon={Pencil} label={`Edit “${m.title}”`} onClick={() => setForm({ mode: 'edit', data: m })} />
                <IconButton icon={Trash2} label={`Delete “${m.title}”`} tone="danger" onClick={() => setDel(m)} />
              </div>
            </div>
            <h3 className="mt-1 truncate font-bold text-fg">{m.title}</h3>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><Clock aria-hidden="true" className="h-4 w-4 text-subtle" />{eventTime(m)}</span>
              {m.venue && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-subtle" /><span className="truncate">{m.venue}{m.municipality ? `, ${m.municipality}` : ''}</span></span>}
            </div>
            {m.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{m.description}</p>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
              <span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="h-3.5 w-3.5 text-accent" />{m.pointsReward ?? 10} points</span>
              {(m.checkedIn || []).length > 0 && <span className="inline-flex items-center gap-1"><Users aria-hidden="true" className="h-3.5 w-3.5" />{m.checkedIn.length} checked in</span>}
              {m.needsVolunteers && <span className="inline-flex items-center gap-1 font-semibold text-accent"><HandHeart aria-hidden="true" className="h-3.5 w-3.5" />{volCount}{m.volunteerSlots ? ` / ${m.volunteerSlots}` : ''} volunteers</span>}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-3">
              <Button size="sm" variant={live ? 'primary' : 'outline'} onClick={() => setQr(m)}><QrCode className="h-4 w-4" /> {live ? 'Show QR' : 'QR check-in'}</Button>
              <Button size="sm" variant="outline" onClick={() => setManage({ id: m._id, tab: 'checkins' })}><Users className="h-4 w-4" /> Attendance</Button>
              {m.needsVolunteers && <Button size="sm" variant="outline" onClick={() => setManage({ id: m._id, tab: 'volunteers' })}><HandHeart className="h-4 w-4" /> Volunteers</Button>}
              <Button size="sm" variant="outline" onClick={() => setManage({ id: m._id, tab: 'comments' })}><MessageSquare className="h-4 w-4" /> Feedback{(m.comments || []).length ? ` · ${m.comments.length}` : ''}</Button>
              {/* minutes are written once the meeting has started */}
              {(m.minutes?.text || new Date(m.date).getTime() <= now) && (
                <Button size="sm" variant="outline" onClick={() => setMinutesId(m._id)}><FileText className="h-4 w-4" /> {m.minutes?.text ? 'Minutes' : canWriteMinutes ? 'Write minutes' : 'Minutes'}</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Meetings & Events" description="Schedule council meetings and youth activities, run QR check-in, keep attendance, and read the kabataan’s feedback."
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> New event</Button>} />

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-xl bg-surface2 p-1" role="group" aria-label="Show">
        {[{ k: 'upcoming', label: 'Upcoming', n: upcoming.length }, { k: 'past', label: 'Past', n: past.length }, { k: 'calendar', label: 'Calendar' }].map((t) => (
          <button key={t.k} type="button" aria-pressed={filter === t.k} onClick={() => setFilter(t.k)}
            className={cn('inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
              filter === t.k ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}>
            {t.k === 'calendar' && <CalendarDays aria-hidden="true" className="h-4 w-4" />}{t.label}{t.n != null && <span className="rounded bg-surface2 px-1.5 text-xs tabular-nums text-muted">{t.n}</span>}
          </button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-16" role="status"><Spinner className="h-7 w-7 text-primary" /><span className="sr-only">Loading…</span></div>
        : filter === 'calendar' ? (
          <EventCalendar events={meetings} renderEvents={(day) => <div className="grid gap-4 xl:grid-cols-2">{day.map(renderCard)}</div>} />
        ) : shown.length === 0 ? (
          <EmptyState icon={CalendarDays} title={filter === 'past' ? 'No past events' : 'Nothing scheduled'}
            description={filter === 'past' ? 'Finished meetings and events appear here.' : 'Create an event for the kabataan to join.'}
            action={filter === 'past' ? null : <Button onClick={openNew}><Plus className="h-4 w-4" /> New event</Button>} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {shown.map(renderCard)}
          </div>
        )}

      {form && <MeetingForm modal={form} onClose={() => setForm(null)} onDone={() => { setForm(null); refresh(); }} />}
      {qr && <QRModal meeting={qr} onClose={() => setQr(null)} onChange={refresh} />}
      {minutesId && meetings.find((x) => x._id === minutesId) && (
        <MinutesModal meeting={meetings.find((x) => x._id === minutesId)} canEdit={canWriteMinutes} onSaved={refresh}
          onClose={() => { setMinutesId(null); if (params.get('minutes')) setParams({}, { replace: true }); }} />
      )}
      {manage && <ManageModal id={manage.id} initialTab={manage.tab} onClose={() => setManage(null)} />}

      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this event?"
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
    date: d.date ? localDateInput(d.date) : '', time: d.time || '',
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
    if (form.time.trim() && !parseTimeText(form.time)) return toast.error('Write the time like 9:00 AM or 14:30.');
    m.mutate({
      ...form, date: combineDateTime(form.date, form.time),
      pointsReward: Number(form.pointsReward) || 0, volunteerSlots: Number(form.volunteerSlots) || 0,
    });
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
                {/* drawn locally — the token is a secret and must not go to an outside QR service */}
                <div className="mx-auto w-fit rounded-xl border border-border bg-white p-3" role="img" aria-label="Check-in QR code"><QRCodeCanvas value={m.qrToken || ''} size={220} /></div>
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
    { k: 'comments', label: `Feedback (${comments.length})` },
  ];

  return (
    <Modal open onClose={onClose} title={m.title || 'Event'} size="lg" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
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
          <AttendancePanel meetingId={id} />
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
          comments.length === 0 ? <EmptyState icon={MessageSquare} title="No feedback yet" description="Feedback from kabataan appears here once the event starts." />
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