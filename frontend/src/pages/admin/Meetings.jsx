import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, QrCode, Users, Calendar, Power, HandHeart } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, CardContent, Spinner, Badge, Button, Input, Textarea, Select,
  Modal, EmptyState, Avatar,
} from '../../components/ui';

const TYPES = ['Meeting', 'Workshop', 'Event', 'Seminar', 'Livelihood', 'Sports'];
const fmt = (d) => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Meetings() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [qr, setQr] = useState(null);
  const [del, setDel] = useState(null);
  const [vol, setVol] = useState(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => (await api.get('/meetings')).data.meetings,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['meetings'] });
  const delM = useMutation({ mutationFn: (id) => api.delete(`/meetings/${id}`), onSuccess: () => { toast.success('Deleted.'); setDel(null); refresh(); }, onError: (e) => toast.error(e.response?.data?.message || 'Failed.') });

  return (
    <>
      <PageHeader title="Meetings & Events" description="Schedule activities and generate QR check-in codes that award points."
        actions={<Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New</Button>} />

      {isLoading ? <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-primary" /></div>
        : meetings.length === 0 ? <EmptyState icon={Calendar} title="No meetings yet" description="Schedule your first meeting or event." action={<Button onClick={() => setModal({ mode: 'create', data: {} })}><Plus className="h-4 w-4" /> New</Button>} />
        : (
          <div className="grid gap-4 md:grid-cols-2">
            {meetings.map((m) => (
              <Card key={m._id}>
                <CardContent>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="primary">{m.type}</Badge>
                    {m.qrActive && <Badge variant="success">QR active</Badge>}
                  </div>
                  <h3 className="font-bold text-fg">{m.title}</h3>
                  <p className="mt-1 text-sm text-muted">{fmt(m.date)}</p>
                  {m.location && <p className="text-sm text-subtle">{m.location}</p>}
                  <p className="mt-2 text-xs text-subtle">{m.pointsReward ?? 10} points on check-in</p>
                  {m.needsVolunteers && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-accent">
                      <HandHeart className="h-3.5 w-3.5" /> {(m.volunteers || []).length}{m.volunteerSlots ? ` / ${m.volunteerSlots}` : ''} volunteers
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setQr(m)}><QrCode className="h-4 w-4" /> QR</Button>
                    {m.needsVolunteers && <Button size="sm" variant="outline" onClick={() => setVol(m)}><HandHeart className="h-4 w-4" /> Volunteers</Button>}
                    <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'edit', data: m })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDel(m)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {modal && <MeetingForm modal={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      {qr && <QRModal meeting={qr} onClose={() => { setQr(null); refresh(); }} />}
      {vol && <VolunteersModal meeting={vol} onClose={() => setVol(null)} />}
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete meeting"
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
    date: d.date ? new Date(d.date).toISOString().slice(0, 16) : '',
    location: d.location || '', description: d.description || '', pointsReward: d.pointsReward ?? 10,
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
    m.mutate({ ...form, pointsReward: Number(form.pointsReward), volunteerSlots: Number(form.volunteerSlots) || 0 });
  };
  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit meeting' : 'New meeting'} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Save</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Title" name="title" value={form.title} onChange={on} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Type" name="type" value={form.type} onChange={on}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
          <Input label="Points on check-in" name="pointsReward" type="number" value={form.pointsReward} onChange={on} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date & time" name="date" type="datetime-local" value={form.date} onChange={on} />
          <Input label="Location" name="location" value={form.location} onChange={on} />
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