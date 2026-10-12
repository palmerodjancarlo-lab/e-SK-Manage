import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, QrCode, Users, Calendar, Power, HandHeart, MapPin, Clock, Star, CalendarClock, CheckCircle2, Radio, FileText, MessageSquare } from 'lucide-react';
import MinutesModal from '../../components/events/MinutesModal';
import AttendancePanel from '../../components/events/AttendancePanel';
import FeedbackModal from '../../components/events/FeedbackModal';
import api from '../../lib/api';
import {
  PageHeader, Card, CardContent, Spinner, Badge, Button, Input, Textarea, Select,
  Modal, EmptyState, Avatar, IconButton, StatCard,
} from '../../components/ui';
import { cn, localDateTimeInput } from '../../lib/utils';
import { eventTypeClass } from '../../lib/events';
import DateTile from '../../components/events/DateTile';
import EventCalendar from '../../components/events/EventCalendar';

const TYPES = ['Meeting', 'Workshop', 'Event', 'Seminar', 'Livelihood', 'Sports'];
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
const VIEWS = [{ key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }, { key: 'all', label: 'All' }, { key: 'calendar', label: 'Calendar' }];

export default function Meetings() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [qr, setQr] = useState(null);
  const [del, setDel] = useState(null);
  const [vol, setVol] = useState(null);
  const [attend, setAttend] = useState(null); // meeting whose attendance is open
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [params, setParams] = useSearchParams();
  const [minutesId, setMinutesId] = useState(() => params.get('minutes'));

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => (await api.get('/meetings')).data.meetings,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['meetings'] });
  const delM = useMutation({ mutationFn: (id) => api.delete(`/meetings/${id}`), onSuccess: () => { toast.success('Deleted.'); setDel(null); refresh(); }, onError: (e) => toast.error(e.response?.data?.message || 'Failed.') });

  const [now] = useState(() => Date.now()); // fixed for this visit, so lists don't shuffle while open
  const sorted = useMemo(() => {
    const up = meetings.filter((m) => new Date(m.date).getTime() >= now - 3 * 3600e3).sort((x, y) => new Date(x.date) - new Date(y.date));
    const past = meetings.filter((m) => new Date(m.date).getTime() < now - 3 * 3600e3).sort((x, y) => new Date(y.date) - new Date(x.date));
    return { upcoming: up, past, all: [...up, ...past] };
  }, [meetings, now]);
  const [view, setView] = useState('upcoming');
  const list = sorted[view];
  const thisMonth = meetings.filter((m) => { const d = new Date(m.date), t = new Date(now); return d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); }).length;
  const liveQr = meetings.filter((m) => m.qrActive).length;
  const openNew = () => setModal({ mode: 'create', data: {} });

  // One event card — used by the list and by the calendar's selected day
  const renderCard = (m) => {
    const past = new Date(m.date).getTime() < now - 3 * 3600e3;
    const venue = m.venue || m.location;
    return (
      <Card key={m._id} className="transition-shadow hover:shadow-pop">
        <CardContent className="flex gap-4">
          <DateTile date={m.date} past={past} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', eventTypeClass(m.type))}>{m.type}</span>
              {m.qrActive && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
                  Check-in open
                </span>
              )}
              {past && <Badge variant="default">Done</Badge>}
            </div>
            <h3 className="mt-1.5 truncate font-bold text-fg">{m.title}</h3>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><Clock aria-hidden="true" className="h-4 w-4 text-subtle" />{m.time || fmtTime(m.date)}</span>
              {venue && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-subtle" /><span className="truncate">{venue}</span></span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
              <span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="h-3.5 w-3.5 text-accent" />{m.pointsReward ?? 10} points</span>
              {(m.checkedIn || []).length > 0 && <span className="inline-flex items-center gap-1"><Users aria-hidden="true" className="h-3.5 w-3.5" />{m.checkedIn.length} checked in</span>}
              {m.needsVolunteers && <span className="inline-flex items-center gap-1 font-semibold text-accent"><HandHeart aria-hidden="true" className="h-3.5 w-3.5" />{(m.volunteers || []).length}{m.volunteerSlots ? ` / ${m.volunteerSlots}` : ''} volunteers</span>}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
              <Button size="sm" variant={m.qrActive ? 'primary' : 'outline'} onClick={() => setQr(m)}><QrCode className="h-4 w-4" /> {m.qrActive ? 'Show QR' : 'QR check-in'}</Button>
              <Button size="sm" variant="outline" onClick={() => setAttend(m)}><Users className="h-4 w-4" /> Attendance</Button>
              <Button size="sm" variant="outline" onClick={() => setFeedbackFor(m)}><MessageSquare className="h-4 w-4" /> Feedback{(m.comments || []).length ? ` · ${m.comments.length}` : ''}</Button>
              {m.needsVolunteers && <Button size="sm" variant="outline" onClick={() => setVol(m)}><HandHeart className="h-4 w-4" /> Volunteers</Button>}
              {(m.minutes?.text || new Date(m.date).getTime() <= now + 864e5) && (
                <Button size="sm" variant="outline" onClick={() => setMinutesId(m._id)}><FileText className="h-4 w-4" /> {m.minutes?.text ? 'Minutes' : 'Write minutes'}</Button>
              )}
              <span className="ml-auto flex gap-1">
                <IconButton icon={Pencil} label={`Edit “${m.title}”`} onClick={() => setModal({ mode: 'edit', data: m })} />
                <IconButton icon={Trash2} label={`Delete “${m.title}”`} tone="danger" onClick={() => setDel(m)} />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Meetings & Events" description="Schedule council meetings and youth activities, then run QR check-in so kabataan earn points."
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> New event</Button>} />

      {isLoading ? <div className="flex justify-center py-16" role="status"><Spinner className="h-7 w-7 text-primary" /><span className="sr-only">Loading…</span></div>
        : meetings.length === 0 ? <EmptyState icon={Calendar} title="No meetings or events yet" description="Schedule a council meeting or a youth activity to get started." action={<Button onClick={openNew}><Plus className="h-4 w-4" /> New event</Button>} />
        : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Upcoming" value={sorted.upcoming.length} icon={CalendarClock} tone="primary" />
              <StatCard label="This month" value={thisMonth} icon={Calendar} tone="info" />
              <StatCard label="QR check-in live" value={liveQr} icon={Radio} tone={liveQr ? 'success' : 'primary'} />
              <StatCard label="Completed" value={sorted.past.length} icon={CheckCircle2} tone="accent" />
            </div>

            <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-surface2 p-1" role="group" aria-label="Show">
              {VIEWS.map((v) => (
                <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => setView(v.key)}
                  className={cn('inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
                    view === v.key ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg')}>
                  {v.key === 'calendar' && <Calendar aria-hidden="true" className="h-4 w-4" />}{v.label}{sorted[v.key] && <span className="rounded bg-surface2 px-1.5 text-xs tabular-nums text-muted">{sorted[v.key].length}</span>}
                </button>
              ))}
            </div>

            {view === 'calendar' ? (
              <EventCalendar events={meetings} renderEvents={(day) => <div className="grid gap-4 xl:grid-cols-2">{day.map(renderCard)}</div>} />
            ) : list.length === 0 ? (
              <EmptyState icon={CalendarClock} title={view === 'upcoming' ? 'Nothing scheduled' : 'No past events'}
                description={view === 'upcoming' ? 'Schedule the next meeting or youth activity.' : 'Finished meetings and events appear here.'}
                action={view === 'upcoming' && <Button onClick={openNew}><Plus className="h-4 w-4" /> New event</Button>} />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {list.map(renderCard)}
              </div>
            )}
          </>
        )}

      {modal && <MeetingForm modal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      {qr && <QRModal meeting={qr} onClose={() => { setQr(null); refresh(); }} />}
      {minutesId && meetings.find((x) => x._id === minutesId) && (
        <MinutesModal meeting={meetings.find((x) => x._id === minutesId)} canEdit onSaved={refresh}
          onClose={() => { setMinutesId(null); if (params.get('minutes')) setParams({}, { replace: true }); }} />
      )}
      {vol && <VolunteersModal meeting={vol} onClose={() => setVol(null)} />}
      <FeedbackModal officer meetingId={feedbackFor?._id} meetingTitle={feedbackFor?.title} open={!!feedbackFor}
        onClose={() => { setFeedbackFor(null); refresh(); }} />
      {attend && (
        <Modal open onClose={() => setAttend(null)} size="lg" title={`Attendance · ${attend.title}`}
          description={new Date(attend.date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          footer={<Button variant="ghost" onClick={() => setAttend(null)}>Close</Button>}>
          <AttendancePanel meetingId={attend._id} />
        </Modal>
      )}
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this event?"
        footer={<><Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" loading={delM.isPending} onClick={() => delM.mutate(del._id)}>Delete</Button></>}>
        <p className="text-sm text-muted">Delete “{del?.title}”? Its check-ins stay in members’ points history.</p>
      </Modal>
    </>
  );
}

function MeetingForm({ modal, onClose, onDone }) {
  const isEdit = modal.mode === 'edit';
  const d = modal.data;
  const [form, setForm] = useState({
    title: d.title || '', type: d.type || 'Meeting',
    date: d.date ? localDateTimeInput(d.date) : '',
    venue: d.venue || d.location || '', description: d.description || '', pointsReward: d.pointsReward ?? 10,
    needsVolunteers: !!d.needsVolunteers, volunteerRole: d.volunteerRole || '', volunteerSlots: d.volunteerSlots ?? 0,
  });
  const on = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const m = useMutation({
    mutationFn: (p) => (isEdit ? api.put(`/meetings/${d._id}`, p) : api.post('/meetings', p)),
    onSuccess: () => { toast.success(isEdit ? 'Updated.' : 'Created.'); onDone(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const submit = (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return toast.error('Title and date are required.');
    // send a real timestamp — the server runs in UTC and would misread a bare "2026-10-15T14:00"
    m.mutate({ ...form, date: new Date(form.date).toISOString(), pointsReward: Number(form.pointsReward), volunteerSlots: Number(form.volunteerSlots) || 0 });
  };
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit meeting or event' : 'New meeting or event'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Title" name="title" value={form.title} onChange={on} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Type" name="type" value={form.type} onChange={on}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
          <Input label="Points on check-in" name="pointsReward" type="number" value={form.pointsReward} onChange={on} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date & time" name="date" type="datetime-local" value={form.date} onChange={on} />
          <Input label="Venue" name="venue" value={form.venue} onChange={on} placeholder="e.g. Barangay Hall" />
        </div>
        <Textarea label="Description" name="description" value={form.description} onChange={on} rows={3} />

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

function VolunteersModal({ meeting, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['volunteers', meeting._id],
    queryFn: async () => (await api.get(`/meetings/${meeting._id}/volunteers`)).data,
  });
  const list = data?.volunteers || [];
  return (
    <Modal open onClose={onClose} title={`Volunteers — ${meeting.title}`} size="md" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {meeting.volunteerRole && <p className="mb-3 text-sm text-muted">Task: <span className="font-medium text-fg">{meeting.volunteerRole}</span></p>}
      {isLoading ? <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-primary" /></div>
        : list.length === 0 ? <EmptyState icon={HandHeart} title="No volunteers yet" description="Kabataan who sign up to help will appear here." />
        : (
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {list.map((v, i) => (
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
    </Modal>
  );
}

function QRModal({ meeting, onClose }) {
  const qc = useQueryClient();
  const [minutes, setMinutes] = useState(120);
  const [token, setToken] = useState(meeting.qrActive ? meeting.qrToken : null);

  const checkins = useQuery({ queryKey: ['checkins', meeting._id], queryFn: async () => (await api.get(`/meetings/${meeting._id}/checkins`)).data });

  const genM = useMutation({
    mutationFn: () => api.post(`/meetings/${meeting._id}/generate-qr`, { durationMinutes: Number(minutes) }),
    onSuccess: (r) => { setToken(r.data.qrToken); toast.success('QR activated.'); qc.invalidateQueries({ queryKey: ['meetings'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });
  const offM = useMutation({
    mutationFn: () => api.put(`/meetings/${meeting._id}/deactivate-qr`),
    onSuccess: () => { setToken(null); toast.success('QR deactivated. Event ended.'); qc.invalidateQueries({ queryKey: ['meetings'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed.'),
  });

  return (
    <Modal open onClose={onClose} title={`QR check-in — ${meeting.title}`} size="md"
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="flex flex-col items-center gap-4">
        {token ? (
          <>
            <div className="rounded-2xl bg-white p-4"><QRCodeCanvas value={token} size={220} /></div>
            <p className="text-sm text-muted">Kabataan scan this to check in and earn points.</p>
            <Button variant="danger" loading={offM.isPending} onClick={() => offM.mutate()}><Power className="h-4 w-4" /> End event & deactivate</Button>
          </>
        ) : (
          <>
            <QrCode className="h-16 w-16 text-subtle" />
            <div className="w-full">
              <Input label="Active for (minutes)" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </div>
            <Button loading={genM.isPending} onClick={() => genM.mutate()} className="w-full"><QrCode className="h-4 w-4" /> Generate QR</Button>
          </>
        )}
        <div className="mt-2 flex items-center gap-2 text-sm text-muted">
          <Users className="h-4 w-4" /> {checkins.data?.total ?? 0} checked in
        </div>
      </div>
    </Modal>
  );
}